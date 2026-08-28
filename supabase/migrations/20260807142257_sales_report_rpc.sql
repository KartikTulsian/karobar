-- ====================================================================
-- SALES REPORT ANALYTICS RPC
-- Handles KPI aggregations and Item-Level Sales Breakdown
-- ====================================================================
CREATE OR REPLACE FUNCTION get_sales_report_data(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_category_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_kpis JSONB;
    v_products JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;
    -- ----------------------------------------------------------------
    -- 1. CALCULATE EXECUTIVE KPIs (Invoice Level)
    -- Filters out drafts and cancelled bills to show real revenue[cite: 26]
    -- ----------------------------------------------------------------
    SELECT jsonb_build_object(
        'totalAmount', COALESCE(SUM(grand_total), 0),
        'totalPaid', COALESCE(SUM(amount_paid), 0),
        'totalUnpaid', COALESCE(SUM(amount_due), 0),
        -- Overdue only counts if the due date is strictly in the past and money is owed
        'overdue', COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND amount_due > 0 THEN amount_due ELSE 0 END), 0)
    ) INTO v_kpis
    FROM bills
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('draft', 'cancelled')
      AND created_at BETWEEN p_start_date AND p_end_date;

    -- ----------------------------------------------------------------
    -- 2. CALCULATE PRODUCT SALES BREAKDOWN (Item Level)
    -- Explicit multi-table join to prevent ORM mapping errors[cite: 26]
    -- ----------------------------------------------------------------
    SELECT COALESCE(jsonb_agg(product_row), '[]'::jsonb) INTO v_products
    FROM (
        SELECT jsonb_build_object(
            'id', item_id,
            'sku', sku,
            'productName', name,
            'brand', brand_name,
            'category', category_name,
            'soldQty', sold_qty,
            'soldAmount', sold_amount,
            'inStockQty', in_stock_qty
        ) AS product_row
        FROM (
            SELECT 
                i.id AS item_id,
                COALESCE(i.sku, 'N/A') AS sku,
                i.name,
                COALESCE(br.name, 'Unbranded') AS brand_name,
                COALESCE(c.name, 'Uncategorized') AS category_name,
                SUM(bli.qty) AS sold_qty,
                SUM(bli.line_total) AS sold_amount,
                -- Subquery to get current physical stock from batches
                COALESCE((
                    SELECT SUM(stock_qty) 
                    FROM item_batches 
                    WHERE item_id = i.id AND tenant_id = p_tenant_id
                ), 0) AS in_stock_qty
            FROM bill_line_items bli
            JOIN bills b ON bli.bill_id = b.id
            JOIN items i ON bli.item_id = i.id
            LEFT JOIN categories c ON i.category_id = c.id
            LEFT JOIN brands br ON i.brand_id = br.id
            WHERE b.tenant_id = p_tenant_id
              AND b.status NOT IN ('draft', 'cancelled')
              AND b.created_at BETWEEN p_start_date AND p_end_date
              -- Apply optional filters if they are passed from the UI
              AND (p_category_id IS NULL OR i.category_id = p_category_id)
              AND (p_brand_id IS NULL OR i.brand_id = p_brand_id)
            GROUP BY i.id, i.sku, i.name, br.name, c.name
            ORDER BY sold_amount DESC -- Sort by highest revenue generating items
            LIMIT 100 -- Prevents UI lag on massive stores; can be paginated later
        ) sorted_items
    ) t;

    -- ----------------------------------------------------------------
    -- 3. RETURN COMBINED JSON PAYLOAD
    -- Matches the SalesReportResponse interface
    -- ----------------------------------------------------------------
    RETURN jsonb_build_object(
        'kpis', v_kpis,
        'products', v_products
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_sales_report_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_sales_report_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO authenticated;