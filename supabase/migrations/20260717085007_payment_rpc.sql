CREATE OR REPLACE FUNCTION get_daily_cash_summaries(p_tenant_id UUID)
RETURNS TABLE (
    summary_date DATE,
    total_in NUMERIC,
    total_out NUMERIC,
    closing_balance NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Security Guard
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;
    
    RETURN QUERY
    WITH timezone_adjusted AS (
        SELECT 
            DATE(entry_date AT TIME ZONE 'Asia/Kolkata') AS local_date,
            type,
            amount,
            balance_after,
            ROW_NUMBER() OVER (
                PARTITION BY DATE(entry_date AT TIME ZONE 'Asia/Kolkata') 
                ORDER BY entry_date DESC, created_at DESC
            ) as rn
        FROM cash_book_ledger
        WHERE tenant_id = p_tenant_id
    ),
    daily_totals AS (
        SELECT 
            local_date,
            SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) AS total_in,
            SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) AS total_out
        FROM timezone_adjusted
        GROUP BY local_date
    ),
    daily_closing AS (
        SELECT local_date, balance_after AS closing_balance
        FROM timezone_adjusted
        WHERE rn = 1
    )
    SELECT 
        dt.local_date AS summary_date,
        dt.total_in,
        dt.total_out,
        dc.closing_balance
    FROM daily_totals dt
    JOIN daily_closing dc ON dt.local_date = dc.local_date
    ORDER BY dt.local_date DESC;
END;
$$;

-- API Execution Lockdown
REVOKE EXECUTE ON FUNCTION get_daily_cash_summaries(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_daily_cash_summaries(UUID) TO authenticated;