-- ====================================================================
-- DECIMAL QUANTITIES  (0.5 m, 2.25 kg, ...)
-- Bills, POs and returns already store NUMERIC quantities. Stock itself did not:
-- item_batches.stock_qty and stock_movements.qty_* were INTEGER, so 0.5 was silently
-- rounded to 1 (or 0) when stock was written. This migration widens them to NUMERIC(12,3)
-- (same precision as the line items) and removes the integer casts in the stock functions.
--
-- Safe to run once; safe to run again (columns are only changed if they are still integers).
-- Existing whole-number data is preserved exactly (5 becomes 5.000).
-- Units are plain text, so "Foot" needs no database change.
-- ====================================================================

DO $$
DECLARE
    v_col RECORD;
    v_view RECORD;
    v_priv RECORD;
    v_needs_change BOOLEAN := false;
BEGIN
    -- Which of our quantity columns are still integers?
    CREATE TEMP TABLE _qty_cols ON COMMIT DROP AS
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('integer', 'smallint', 'bigint')
      AND (c.table_name, c.column_name) IN (
          ('item_batches', 'stock_qty'),
          ('stock_movements', 'qty_change'),
          ('stock_movements', 'qty_before'),
          ('stock_movements', 'qty_after'),
          ('items', 'low_stock_threshold'),
          ('to_purchase_list', 'qty_needed')
      );

    SELECT EXISTS (SELECT 1 FROM _qty_cols) INTO v_needs_change;

    IF v_needs_change THEN
        -- Views that read these tables block "ALTER COLUMN TYPE". Remember every such view
        -- (including views built on other views), drop them, alter, then recreate them exactly.
        CREATE TEMP TABLE _dep_views ON COMMIT DROP AS
        WITH RECURSIVE deps AS (
            SELECT c.oid AS view_oid, 1 AS depth
            FROM pg_depend d
            JOIN pg_rewrite r ON r.oid = d.objid AND d.classid = 'pg_rewrite'::regclass
            JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
            WHERE d.refclassid = 'pg_class'::regclass
              AND d.refobjid IN (
                  SELECT t.oid FROM pg_class t
                  JOIN pg_namespace n ON n.oid = t.relnamespace
                  WHERE n.nspname = 'public'
                    AND t.relname IN (SELECT DISTINCT table_name FROM _qty_cols)
              )
              AND c.oid <> d.refobjid
            UNION
            SELECT c.oid, deps.depth + 1
            FROM deps
            JOIN pg_depend d ON d.refobjid = deps.view_oid AND d.refclassid = 'pg_class'::regclass
                            AND d.classid = 'pg_rewrite'::regclass
            JOIN pg_rewrite r ON r.oid = d.objid
            JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v' AND c.oid <> deps.view_oid
        )
        SELECT dv.view_oid,
               format('%I.%I', n.nspname, c.relname) AS view_name,
               MAX(dv.depth) AS depth,
               pg_get_viewdef(dv.view_oid, true) AS view_def,
               c.reloptions AS options,
               c.relacl AS acl
        FROM deps dv
        JOIN pg_class c ON c.oid = dv.view_oid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        GROUP BY dv.view_oid, n.nspname, c.relname, c.reloptions, c.relacl;

        -- drop: most-dependent first
        FOR v_view IN SELECT * FROM _dep_views ORDER BY depth DESC LOOP
            EXECUTE format('DROP VIEW %s', v_view.view_name);
        END LOOP;

        -- widen the columns
        FOR v_col IN SELECT * FROM _qty_cols LOOP
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN %I TYPE NUMERIC(12,3) USING %I::numeric',
                v_col.table_name, v_col.column_name, v_col.column_name
            );
        END LOOP;

        -- recreate: least-dependent first, with the same options (security_invoker) and grants
        FOR v_view IN SELECT * FROM _dep_views ORDER BY depth ASC LOOP
            EXECUTE format(
                'CREATE VIEW %s %s AS %s',
                v_view.view_name,
                CASE WHEN v_view.options IS NULL THEN ''
                     ELSE 'WITH (' || array_to_string(v_view.options, ', ') || ')' END,
                v_view.view_def
            );
            IF v_view.acl IS NOT NULL THEN
                FOR v_priv IN
                    SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END AS grantee,
                           a.privilege_type
                    FROM aclexplode(v_view.acl) a
                    LEFT JOIN pg_roles r ON r.oid = a.grantee
                    WHERE a.grantee = 0 OR r.rolname IS NOT NULL
                LOOP
                    EXECUTE format('GRANT %s ON %s TO %s', v_priv.privilege_type, v_view.view_name, v_priv.grantee);
                END LOOP;
            END IF;
        END LOOP;
    END IF;
END $$;

-- ====================================================================
-- Stock functions: no integer casts, quantities rounded to 3 decimals
-- (same signatures as before, so every existing caller keeps working)
-- ====================================================================

CREATE OR REPLACE FUNCTION adjust_batch_stock(
    p_batch_id UUID,
    p_qty_change NUMERIC,
    p_movement_type movement_type DEFAULT NULL,
    p_reference_type movement_reference_type DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_item_id UUID;
    v_change NUMERIC := ROUND(COALESCE(p_qty_change, 0), 3);
    v_after NUMERIC;
BEGIN
    SELECT tenant_id, item_id INTO v_tenant_id, v_item_id FROM item_batches WHERE id = p_batch_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Item batch not found.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = auth.uid() AND tenant_id = v_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    IF v_change = 0 THEN
        RETURN;
    END IF;

    UPDATE item_batches SET stock_qty = ROUND(stock_qty + v_change, 3) WHERE id = p_batch_id;

    IF p_movement_type IS NOT NULL THEN
        SELECT COALESCE(SUM(stock_qty), 0) INTO v_after
        FROM item_batches WHERE item_id = v_item_id AND tenant_id = v_tenant_id;

        INSERT INTO stock_movements (
            tenant_id, item_id, type, qty_change, qty_before, qty_after,
            reference_type, reference_id, note, created_by, supplier_id
        ) VALUES (
            v_tenant_id, v_item_id, p_movement_type, v_change, v_after - v_change, v_after,
            p_reference_type, p_reference_id, p_note, auth.uid(), p_supplier_id
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION adjust_batch_stock(UUID, NUMERIC, movement_type, movement_reference_type, UUID, TEXT, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION adjust_batch_stock(UUID, NUMERIC, movement_type, movement_reference_type, UUID, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION log_stock_movement(
    p_tenant_id UUID,
    p_item_id UUID,
    p_type movement_type,
    p_qty_change NUMERIC,
    p_reference_type movement_reference_type DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_change NUMERIC := ROUND(COALESCE(p_qty_change, 0), 3);
    v_after NUMERIC;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM items WHERE id = p_item_id AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Item not found.';
    END IF;

    IF v_change = 0 THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(stock_qty), 0) INTO v_after
    FROM item_batches WHERE item_id = p_item_id AND tenant_id = p_tenant_id;

    INSERT INTO stock_movements (
        tenant_id, item_id, type, qty_change, qty_before, qty_after,
        reference_type, reference_id, note, created_by, supplier_id
    ) VALUES (
        p_tenant_id, p_item_id, p_type, v_change, v_after - v_change, v_after,
        p_reference_type, p_reference_id, p_note, auth.uid(), p_supplier_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION log_stock_movement(UUID, UUID, movement_type, NUMERIC, movement_reference_type, UUID, TEXT, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION log_stock_movement(UUID, UUID, movement_type, NUMERIC, movement_reference_type, UUID, TEXT, UUID) TO authenticated;

-- Manual stock adjustment: same logic as before, but the "allocations add up" check
-- compares at 3 decimals, so 0.1 + 0.2 never fails against 0.3.
CREATE OR REPLACE FUNCTION reconcile_inventory_stock(
    p_tenant_id UUID,
    p_item_id UUID,
    p_qty_change NUMERIC,
    p_reason TEXT,
    p_allocations JSONB DEFAULT '[]'::jsonb,
    p_new_buy_price NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_change NUMERIC := ROUND(COALESCE(p_qty_change, 0), 3);
    v_qty_before NUMERIC;
    v_qty_after NUMERIC;
    v_movement_id UUID;
    v_default_sell_price NUMERIC;
    v_alloc RECORD;
    v_alloc_qty NUMERIC;
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

    SELECT COALESCE(SUM(stock_qty), 0) INTO v_qty_before
    FROM item_batches
    WHERE item_id = p_item_id AND tenant_id = p_tenant_id;

    SELECT default_sell_price INTO v_default_sell_price
    FROM items
    WHERE id = p_item_id AND tenant_id = p_tenant_id;

    v_qty_after := v_qty_before + v_change;

    IF v_qty_after < 0 THEN
        RAISE EXCEPTION 'Invalid adjustment: Cannot reduce stock below zero. Current total stock is %', v_qty_before;
    END IF;

    IF v_change > 0 THEN
        INSERT INTO item_batches (tenant_id, item_id, batch_number, buy_price, sell_price, stock_qty)
        VALUES (p_tenant_id, p_item_id, 'MANUAL-ADJUSTMENT', p_new_buy_price, v_default_sell_price, v_change);

    ELSIF v_change < 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(batch_id UUID, qty NUMERIC)
        LOOP
            v_alloc_qty := ROUND(COALESCE(v_alloc.qty, 0), 3);
            IF v_alloc_qty <= 0 THEN
                CONTINUE;
            END IF;

            SELECT stock_qty, item_id INTO v_batch_stock, v_batch_item_id
            FROM item_batches
            WHERE id = v_alloc.batch_id AND tenant_id = p_tenant_id FOR UPDATE;

            IF v_batch_item_id IS NULL OR v_batch_item_id != p_item_id THEN
                RAISE EXCEPTION 'Data mismatch: Batch % does not belong to the requested item.', v_alloc.batch_id;
            END IF;

            IF v_alloc_qty > v_batch_stock THEN
                RAISE EXCEPTION 'Insufficient stock in batch %. Requested: %, Available: %', v_alloc.batch_id, v_alloc_qty, v_batch_stock;
            END IF;

            v_total_allocated := v_total_allocated + v_alloc_qty;

            UPDATE item_batches
            SET stock_qty = ROUND(stock_qty - v_alloc_qty, 3)
            WHERE id = v_alloc.batch_id;
        END LOOP;

        IF ROUND(v_total_allocated, 3) != ABS(v_change) THEN
            RAISE EXCEPTION 'Allocation mismatch: Requested to deduct %, but batch allocations total %.', ABS(v_change), v_total_allocated;
        END IF;
    END IF;

    INSERT INTO stock_movements (
        tenant_id, item_id, type, qty_change, qty_before, qty_after, reference_type, note, created_by
    ) VALUES (
        p_tenant_id, p_item_id, 'adjustment', v_change, v_qty_before, v_qty_after, 'manual_adjustment', p_reason, auth.uid()
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION reconcile_inventory_stock(UUID, UUID, NUMERIC, TEXT, JSONB, NUMERIC) FROM public, anon;
GRANT EXECUTE ON FUNCTION reconcile_inventory_stock(UUID, UUID, NUMERIC, TEXT, JSONB, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';