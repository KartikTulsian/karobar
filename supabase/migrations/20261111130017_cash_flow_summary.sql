-- Money in / out per day, week or month, straight from the cash book (the real cash movement).
-- One query, one small result (a few rows per month), no matter how many entries exist.

CREATE INDEX IF NOT EXISTS idx_cash_book_tenant_date ON cash_book (tenant_id, entry_date);

DROP FUNCTION IF EXISTS get_cash_flow_summary(UUID, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION get_cash_flow_summary(
    p_tenant_id UUID,
    p_start DATE,
    p_end DATE,
    p_group TEXT DEFAULT 'month'
)
RETURNS TABLE (
    period DATE,
    customer_receipts NUMERIC,   -- money received from customers (payments + advances)
    supplier_refunds NUMERIC,    -- money received back from suppliers (purchase returns)
    other_in NUMERIC,            -- manual cash-book entries and reversals
    supplier_payments NUMERIC,   -- money paid to suppliers (payments + advances)
    expenses NUMERIC,
    customer_refunds NUMERIC,    -- cash/UPI refunded to customers (sales returns)
    other_out NUMERIC,
    total_in NUMERIC,
    total_out NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    IF p_group NOT IN ('day', 'week', 'month') THEN
        RAISE EXCEPTION 'p_group must be day, week or month';
    END IF;
    IF p_end < p_start OR p_end - p_start > 3660 THEN
        RAISE EXCEPTION 'Invalid date range';
    END IF;

    RETURN QUERY
    SELECT
        date_trunc(p_group, cb.entry_date AT TIME ZONE 'Asia/Kolkata')::date AS period,
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'in'  AND cb.reference_type IN ('single_sale', 'multi_sale', 'advance_receipt')), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'in'  AND cb.reference_type = 'purchase_return'), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'in'  AND cb.reference_type NOT IN ('single_sale', 'multi_sale', 'advance_receipt', 'purchase_return')), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'out' AND cb.reference_type IN ('single_purchase', 'multi_purchase', 'advance_payment')), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'out' AND cb.reference_type = 'expense'), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'out' AND cb.reference_type = 'sales_return'), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'out' AND cb.reference_type NOT IN ('single_purchase', 'multi_purchase', 'advance_payment', 'expense', 'sales_return')), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'in'), 0),
        COALESCE(SUM(cb.amount) FILTER (WHERE cb.type = 'out'), 0)
    FROM cash_book cb
    WHERE cb.tenant_id = p_tenant_id
      -- the day boundaries are Indian dates; written this way so the index can be used
      AND cb.entry_date >= (p_start::timestamp AT TIME ZONE 'Asia/Kolkata')
      AND cb.entry_date <  ((p_end + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
    GROUP BY 1
    ORDER BY 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_cash_flow_summary(UUID, DATE, DATE, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_cash_flow_summary(UUID, DATE, DATE, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';