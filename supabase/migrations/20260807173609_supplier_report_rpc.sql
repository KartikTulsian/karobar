-- ====================================================================
-- TOP SUPPLIERS REPORT RPC
-- Ranks suppliers by Total Spend and calculates Quality/Return Rate
-- ====================================================================
CREATE OR REPLACE FUNCTION get_top_suppliers_report(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_limit INT DEFAULT 100
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    SELECT COALESCE(jsonb_agg(supplier_row), '[]'::jsonb) INTO v_result
    FROM (
        SELECT 
            jsonb_build_object(
                'id', id,
                'rank', ROW_NUMBER() OVER(ORDER BY total_spend DESC),
                'name', company_name, -- Prefer company name over contact person
                'contactName', name,
                'phone', phone,
                'totalSpend', total_spend,
                'outstandingPayable', outstanding_payable,
                'totalReturned', total_returned,
                'returnRate', return_rate,
                -- Quality Health Indicator
                'qualityStatus', CASE 
                    WHEN return_rate >= 5.0 THEN 'danger'
                    WHEN return_rate >= 2.0 THEN 'warning'
                    ELSE 'healthy'
                END
            ) AS supplier_row
        FROM (
            SELECT 
                s.id,
                s.name,
                COALESCE(s.company_name, s.name) AS company_name,
                s.phone,
                -- 1. Calculate Spend & Payables from Purchase Orders
                COALESCE(SUM(po.total_amount), 0) AS total_spend,
                COALESCE(SUM(po.amount_due), 0) AS outstanding_payable,
                -- 2. Calculate Returns from Purchase Returns
                COALESCE((
                    SELECT SUM(pr.refund_amount)
                    FROM purchase_returns pr
                    WHERE pr.original_po_id IN (
                        SELECT id FROM purchase_orders 
                        WHERE supplier_id = s.id 
                          AND tenant_id = p_tenant_id
                          AND created_at BETWEEN p_start_date AND p_end_date
                    )
                ), 0) AS total_returned,
                -- 3. Calculate Return Rate % Safely
                CASE 
                    WHEN COALESCE(SUM(po.total_amount), 0) = 0 THEN 0.00
                    ELSE ROUND((
                        COALESCE((
                            SELECT SUM(pr.refund_amount)
                            FROM purchase_returns pr
                            WHERE pr.original_po_id IN (
                                SELECT id FROM purchase_orders 
                                WHERE supplier_id = s.id 
                                  AND tenant_id = p_tenant_id
                                  AND created_at BETWEEN p_start_date AND p_end_date
                            )
                        ), 0) / SUM(po.total_amount) * 100
                    )::numeric, 2)
                END AS return_rate
            FROM suppliers s
            JOIN purchase_orders po ON s.id = po.supplier_id
            WHERE s.tenant_id = p_tenant_id
              AND po.tenant_id = p_tenant_id
              AND po.status NOT IN ('draft', 'cancelled')
              AND po.created_at BETWEEN p_start_date AND p_end_date
            GROUP BY s.id, s.name, s.company_name, s.phone
            HAVING COALESCE(SUM(po.total_amount), 0) > 0
        ) agg_data
        -- Rank strictly by who we spend the most money with
        ORDER BY total_spend DESC
        LIMIT p_limit
    ) ranked_data;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_top_suppliers_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_top_suppliers_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;