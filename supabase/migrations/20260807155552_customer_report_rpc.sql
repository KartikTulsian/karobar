-- ====================================================================
-- TOP CUSTOMERS REPORT RPC
-- Ranks customers by Total Paid Revenue within a specific timeframe
-- ====================================================================
CREATE OR REPLACE FUNCTION get_top_customers_report(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_customer_type TEXT DEFAULT 'all', -- Accepts 'all', 'registered', 'flying'
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

    SELECT COALESCE(jsonb_agg(customer_row), '[]'::jsonb) INTO v_result
    FROM (
        SELECT 
            jsonb_build_object(
                'id', id,
                'rank', ROW_NUMBER() OVER(ORDER BY total_paid DESC, visit_count DESC),
                'name', name,
                'companyName', company_name,
                'type', type,
                'phone', phone,
                'totalBilled', total_billed,
                'totalPaid', total_paid,
                'outstandingDue', outstanding_due,
                'overdueAmount', overdue_amount,
                'visitCount', visit_count,
                -- 🟢 Healthy = 0 debt
                -- 🔴 Danger = Has overdue debt past the due date
                -- 🟡 Warning = Has debt, but not overdue yet
                'creditHealth', CASE 
                    WHEN overdue_amount > 0 THEN 'danger'
                    WHEN outstanding_due > 0 THEN 'warning'
                    ELSE 'healthy'
                END
            ) AS customer_row
        FROM (
            SELECT 
                c.id,
                c.name,
                c.company_name,
                c.type,
                c.phone,
                COALESCE(SUM(b.grand_total), 0) AS total_billed,
                COALESCE(SUM(b.amount_paid), 0) AS total_paid,
                COALESCE(SUM(b.amount_due), 0) AS outstanding_due,
                COALESCE(SUM(CASE WHEN b.due_date < CURRENT_DATE AND b.amount_due > 0 THEN b.amount_due ELSE 0 END), 0) AS overdue_amount,
                COUNT(DISTINCT b.id) AS visit_count
            FROM customers c
            JOIN bills b ON c.id = b.customer_id
            WHERE c.tenant_id = p_tenant_id
              AND b.tenant_id = p_tenant_id
              AND b.status NOT IN ('draft', 'cancelled')
              AND b.created_at BETWEEN p_start_date AND p_end_date
              -- Filter by Customer Type if requested
              AND (p_customer_type = 'all' OR c.type::text = p_customer_type)
            GROUP BY c.id, c.name, c.company_name, c.type, c.phone
            -- Only include customers who actually generated billed revenue in this period
            HAVING COALESCE(SUM(b.grand_total), 0) > 0 
        ) agg_data
        -- Primary Sort: Cash collected. Secondary Sort: Loyalty (Visits)
        ORDER BY total_paid DESC, visit_count DESC
        LIMIT p_limit
    ) ranked_data;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_top_customers_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_top_customers_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT) TO authenticated;