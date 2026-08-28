-- ====================================================================
-- INVENTORY STOCK ADJUSTMENT
-- ====================================================================
CREATE OR REPLACE FUNCTION reconcile_inventory_stock(
    p_tenant_id UUID,
    p_item_id UUID,
    p_qty_change NUMERIC,
    p_reason TEXT,
    -- p_user_id UUID,
    p_allocations JSONB DEFAULT '[]'::jsonb,
    p_new_buy_price NUMERIC DEFAULT 0
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_qty_before NUMERIC;
    v_qty_after NUMERIC;
    v_movement_id UUID;
    v_default_sell_price NUMERIC;
    v_alloc RECORD;
    v_total_allocated NUMERIC := 0;
    v_batch_stock NUMERIC;
    v_batch_item_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    -- 1. Fetch current total stock & the default sell price for the item
    SELECT COALESCE(SUM(stock_qty), 0) INTO v_qty_before 
    FROM item_batches 
    WHERE item_id = p_item_id AND tenant_id = p_tenant_id;
    
    SELECT default_sell_price INTO v_default_sell_price
    FROM items
    WHERE id = p_item_id AND tenant_id = p_tenant_id;

    v_qty_after := v_qty_before + p_qty_change;

    IF v_qty_after < 0 THEN
        RAISE EXCEPTION 'Invalid adjustment: Cannot reduce stock below zero. Current total stock is %', v_qty_before;
    END IF;

    -- 2. Handle GAIN (Found Stock)
    IF p_qty_change > 0 THEN
        INSERT INTO item_batches (tenant_id, item_id, batch_number, buy_price, sell_price, stock_qty)
        VALUES (
            p_tenant_id, 
            p_item_id, 
            'MANUAL-ADJUSTMENT', 
            p_new_buy_price, 
            v_default_sell_price, 
            p_qty_change
        );
    
    -- 3. Handle LOSS (Shrinkage)
    ELSIF p_qty_change < 0 THEN
        -- Parse the JSONB allocations array sent from your React form
        FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(batch_id UUID, qty NUMERIC)
        LOOP
            -- Ignore zero or negative allocation payloads
            IF v_alloc.qty <= 0 THEN
                CONTINUE;
            END IF;

            -- Fetch the batch to verify ownership and limits (FOR UPDATE locks the row to prevent race conditions)
            SELECT stock_qty, item_id INTO v_batch_stock, v_batch_item_id 
            FROM item_batches 
            WHERE id = v_alloc.batch_id AND tenant_id = p_tenant_id FOR UPDATE;

            -- Does this batch actually belong to this item?
            IF v_batch_item_id IS NULL OR v_batch_item_id != p_item_id THEN
                RAISE EXCEPTION 'Data mismatch: Batch % does not belong to the requested item.', v_alloc.batch_id;
            END IF;

            -- Does this specific batch have enough stock?
            IF v_alloc.qty > v_batch_stock THEN
                RAISE EXCEPTION 'Insufficient stock in batch %. Requested: %, Available: %', v_alloc.batch_id, v_alloc.qty, v_batch_stock;
            END IF;

            v_total_allocated := v_total_allocated + v_alloc.qty;

            -- Deduct exactly what the user allocated from the specific batches
            UPDATE item_batches 
            SET stock_qty = stock_qty - v_alloc.qty
            WHERE id = v_alloc.batch_id;
        END LOOP;

        IF v_total_allocated != ABS(p_qty_change) THEN
            RAISE EXCEPTION 'Allocation mismatch: Requested to deduct %, but batch allocations total %.', ABS(p_qty_change), v_total_allocated;
        END IF;
    END IF;

    -- 4. Create the Immutable Audit Log
    INSERT INTO stock_movements (
        tenant_id, item_id, type, qty_change, qty_before, qty_after, reference_type, note, created_by
    ) VALUES (
        p_tenant_id, p_item_id, 'adjustment', p_qty_change, v_qty_before, v_qty_after, 'manual_adjustment', p_reason, auth.uid()
    ) RETURNING id INTO v_movement_id;

    -- Return the ID of the newly created stock movement log
    RETURN v_movement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION reconcile_inventory_stock(UUID, UUID, NUMERIC, TEXT, JSONB, NUMERIC) FROM public, anon;
GRANT EXECUTE ON FUNCTION reconcile_inventory_stock(UUID, UUID, NUMERIC, TEXT, JSONB, NUMERIC) TO authenticated;

-- ====================================================================
-- INVENTORY DASHBOARD ANALYTICS RPC
-- Supports flexible timeframes ('day', 'week', 'month', 'year')
-- ====================================================================
CREATE OR REPLACE FUNCTION get_inventory_dashboard_data(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_granularity TEXT DEFAULT 'day' -- Accepted: 'day', 'week', 'month', 'year'
) RETURNS JSONB AS $$
DECLARE
    v_exec_summary JSONB;
    v_velocity_chart JSONB;
    v_runners JSONB;
    v_stragglers JSONB;
    v_reorder_intel JSONB;
    v_period_days NUMERIC;
BEGIN

    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    -- Calculate exact total days in the requested window (avoiding division by zero)
    v_period_days := GREATEST(1, EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 86400);

    -- ----------------------------------------------------------------
    -- 1. EXECUTIVE SUMMARY & HEALTH
    -- ----------------------------------------------------------------
    WITH batch_summary AS (
        SELECT 
            b.item_id,
            SUM(b.stock_qty) AS item_stock,
            SUM(b.stock_qty * b.buy_price) AS item_asset_val
        FROM item_batches b
        JOIN items i ON b.item_id = i.id
        WHERE b.tenant_id = p_tenant_id AND i.is_active = true
        GROUP BY b.item_id
    ),
    item_metrics AS (
        SELECT 
            i.id,
            i.low_stock_threshold,
            i.default_sell_price,
            COALESCE(bs.item_stock, 0) AS current_stock,
            COALESCE(bs.item_asset_val, 0) AS current_asset_val
        FROM items i
        LEFT JOIN batch_summary bs ON i.id = bs.item_id
        WHERE i.tenant_id = p_tenant_id AND i.is_active = true
    ),
    -- Dead Stock / Locked Capital (Items with zero outbound sales in the selected period)
    locked_stock AS (
        SELECT COALESCE(SUM(im.current_asset_val), 0) AS locked_val
        FROM item_metrics im
        WHERE im.current_stock > 0
          AND im.id NOT IN (
              SELECT DISTINCT item_id 
              FROM stock_movements 
              WHERE tenant_id = p_tenant_id 
                AND type IN ('sale', 'return_out') 
                AND created_at BETWEEN p_start_date AND p_end_date
          )
    )
    SELECT jsonb_build_object(
        'total_asset_value', COALESCE(SUM(current_asset_val), 0),
        'potential_revenue', COALESCE(SUM(current_stock * default_sell_price), 0),
        'locked_capital', (SELECT locked_val FROM locked_stock),
        'health', jsonb_build_object(
            'in_stock', COUNT(*) FILTER (WHERE current_stock > low_stock_threshold),
            'low_stock', COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= low_stock_threshold),
            'out_of_stock', COUNT(*) FILTER (WHERE current_stock <= 0)
        )
    ) INTO v_exec_summary
    FROM item_metrics;

    -- ----------------------------------------------------------------
    -- 2. TIME-BASED VELOCITY CHART DATA
    -- ----------------------------------------------------------------
    SELECT COALESCE(jsonb_agg(chart_row ORDER BY chart_row->>'period' ASC), '[]'::jsonb)
    INTO v_velocity_chart
    FROM (
        SELECT jsonb_build_object(
            'period', date_trunc(p_granularity, created_at),
            'inbound_qty', COALESCE(SUM(CASE WHEN qty_change > 0 THEN qty_change ELSE 0 END), 0),
            'outbound_qty', COALESCE(SUM(CASE WHEN qty_change < 0 THEN ABS(qty_change) ELSE 0 END), 0)
        ) AS chart_row
        FROM stock_movements
        WHERE tenant_id = p_tenant_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc(p_granularity, created_at)
    ) t;

    -- ----------------------------------------------------------------
    -- 3. RUNNERS (TOP OUTBOUND ITEMS)
    -- ----------------------------------------------------------------
    SELECT COALESCE(jsonb_agg(runner_row), '[]'::jsonb)
    INTO v_runners
    FROM (
        SELECT jsonb_build_object(
            'item_id', i.id,
            'name', i.name,
            'sku', i.sku,
            'outbound_volume', SUM(ABS(sm.qty_change))
        ) AS runner_row
        FROM stock_movements sm
        JOIN items i ON sm.item_id = i.id
        WHERE sm.tenant_id = p_tenant_id
          AND sm.qty_change < 0
          AND sm.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY i.id, i.name, i.sku
        ORDER BY SUM(ABS(sm.qty_change)) DESC
        LIMIT 5
    ) r;

    -- ----------------------------------------------------------------
    -- 4. STRAGGLERS (DEAD STOCK ITEMS WITH STOCK)
    -- ----------------------------------------------------------------
    SELECT COALESCE(jsonb_agg(straggler_row), '[]'::jsonb)
    INTO v_stragglers
    FROM (
        SELECT jsonb_build_object(
            'item_id', i.id,
            'name', i.name,
            'sku', i.sku,
            'current_stock', COALESCE(SUM(b.stock_qty), 0)
        ) AS straggler_row
        FROM items i
        JOIN item_batches b ON i.id = b.item_id
        WHERE i.tenant_id = p_tenant_id 
          AND i.is_active = true
          AND b.stock_qty > 0
          AND i.id NOT IN (
              SELECT DISTINCT item_id 
              FROM stock_movements 
              WHERE tenant_id = p_tenant_id 
                AND qty_change < 0 
                AND created_at BETWEEN p_start_date AND p_end_date
          )
        GROUP BY i.id, i.name, i.sku
        LIMIT 5
    ) s;

    -- ----------------------------------------------------------------
    -- 5. REORDER INTELLIGENCE & RUNWAY
    -- ----------------------------------------------------------------
    SELECT COALESCE(jsonb_agg(reorder_row), '[]'::jsonb)
    INTO v_reorder_intel
    FROM (
        SELECT jsonb_build_object(
            'item_id', item_id,
            'name', name,
            'sku', sku,
            'current_stock', current_stock,
            'avg_daily_sales', avg_daily_sales,
            'runway_days', runway_days
        ) AS reorder_row
        FROM (
            SELECT 
                i.id AS item_id,
                i.name,
                i.sku,
                COALESCE(SUM(b.stock_qty), 0) AS current_stock,
                ROUND((COALESCE(SUM(ABS(sm.qty_change)), 0) / v_period_days)::numeric, 2) AS avg_daily_sales,
                CASE 
                    WHEN COALESCE(SUM(ABS(sm.qty_change)), 0) = 0 THEN 999 
                    ELSE ROUND((COALESCE(SUM(b.stock_qty), 0) / (SUM(ABS(sm.qty_change)) / v_period_days))::numeric, 1)
                END AS runway_days
            FROM items i
            LEFT JOIN item_batches b ON i.id = b.item_id
            LEFT JOIN stock_movements sm ON i.id = sm.item_id 
                AND sm.type = 'sale' 
                AND sm.created_at BETWEEN p_start_date AND p_end_date
            WHERE i.tenant_id = p_tenant_id AND i.is_active = true
            GROUP BY i.id, i.name, i.sku
            HAVING COALESCE(SUM(b.stock_qty), 0) <= i.low_stock_threshold OR COALESCE(SUM(ABS(sm.qty_change)), 0) > 0
            ORDER BY runway_days ASC
            LIMIT 20
        ) sorted_metrics
    ) ro;

    -- Combine into single JSON response payload
    RETURN jsonb_build_object(
        'executive_summary', v_exec_summary,
        'velocity', jsonb_build_object(
            'chart_data', v_velocity_chart,
            'runners', v_runners,
            'stragglers', v_stragglers
        ),
        'reorder_intelligence', v_reorder_intel
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_inventory_dashboard_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_inventory_dashboard_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;