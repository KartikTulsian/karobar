-- 1. Atomic Inventory Sync
CREATE OR REPLACE FUNCTION adjust_batch_stock(p_batch_id UUID, p_qty_change NUMERIC)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Fetch the tenant_id that owns this item batch
    SELECT tenant_id INTO v_tenant_id FROM item_batches WHERE id = p_batch_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Item batch not found.';
    END IF;

    -- 2. Security Guard: Verify the user is an active member of this tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = v_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    -- 3. Execute the stock adjustment
    UPDATE item_batches SET stock_qty = stock_qty + p_qty_change WHERE id = p_batch_id;
END;
$$;

-- 4. API Execution Lockdown
REVOKE EXECUTE ON FUNCTION adjust_batch_stock(UUID, NUMERIC) FROM public, anon;
GRANT EXECUTE ON FUNCTION adjust_batch_stock(UUID, NUMERIC) TO authenticated;

-- Replaces adjust_customer_metrics
CREATE OR REPLACE FUNCTION sync_customer_metrics(p_customer_id UUID)
RETURNS void AS $$
DECLARE
    v_total_purchases NUMERIC;
    v_total_returns NUMERIC;
    v_outstanding_due NUMERIC;
    v_tenant_id UUID;
BEGIN

    -- 1. Fetch the tenant_id that owns this customer
    SELECT tenant_id INTO v_tenant_id FROM customers WHERE id = p_customer_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Customer not found.';
    END IF;

    -- 2. Security Guard: Verify active membership
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = v_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    -- 3. Sum up all valid bills (Total Value & Unpaid Debt)
    SELECT COALESCE(SUM(grand_total), 0), COALESCE(SUM(amount_due), 0)
    INTO v_total_purchases, v_outstanding_due
    FROM bills 
    WHERE customer_id = p_customer_id AND status != 'cancelled';

    -- 4. Subtract the value of all returns attached to those bills
    SELECT COALESCE(SUM(sr.refund_amount), 0)
    INTO v_total_returns
    FROM sales_returns sr
    JOIN bills b ON sr.original_bill_id = b.id
    WHERE b.customer_id = p_customer_id AND b.status != 'cancelled';

    -- 5. Hard-set the exact reality into the customer table
    UPDATE customers SET
        total_purchases = v_total_purchases - v_total_returns,
        outstanding_due = v_outstanding_due
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION sync_customer_metrics(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION sync_customer_metrics(UUID) TO authenticated;

-- ===========================================================================
-- 2. SALES RETURN CASCADE (Strictly ignores Drafts)
-- ===========================================================================
-- CREATE OR REPLACE FUNCTION execute_sales_return_cascade(
--     p_tenant_id UUID, 
--     p_customer_id UUID, 
--     p_original_bill_id UUID, 
--     p_refund_difference NUMERIC, 
--     p_refund_method TEXT
-- ) RETURNS NUMERIC AS $$
-- DECLARE
--     v_remaining NUMERIC := ABS(p_refund_difference);
--     v_advance_balance NUMERIC; 
--     v_new_advance NUMERIC; 
--     v_cash_payout NUMERIC := 0; 
--     v_allocation NUMERIC;
-- BEGIN
--     -- Lock customer row for safety
--     SELECT advance_balance INTO v_advance_balance FROM customers WHERE id = p_customer_id FOR UPDATE;

--     -- CASE 1: Adding a return (or increasing an existing one)
--     IF p_refund_difference > 0 THEN
--         IF p_refund_method = 'credit_note' THEN
--             -- Add directly to wallet
--             UPDATE customers SET advance_balance = advance_balance + v_remaining WHERE id = p_customer_id RETURNING advance_balance INTO v_new_advance;
            
--             INSERT INTO credit_ledger (tenant_id, entity_type, entity_id, flow_type, amount, balance_after, reference_type, reference_id, description)
--             VALUES (p_tenant_id, 'customer', p_customer_id, 'in', v_remaining, v_new_advance, 'sales_return', p_original_bill_id, 'Credit Note generated from Sales Return.');
--         ELSE
--             -- Tell TypeScript API to log cash leaving the drawer
--             v_cash_payout := v_remaining; 
--         END IF;

--     -- CASE 2: Deleting a return (or decreasing it)
--     ELSIF p_refund_difference < 0 THEN
--         IF p_refund_method = 'credit_note' THEN
--             -- Reclaim the advance we previously gave them
--             v_new_advance := GREATEST(0, v_advance_balance - v_remaining);
--             v_allocation := v_advance_balance - v_new_advance; 
            
--             IF v_allocation > 0 THEN
--                 UPDATE customers SET advance_balance = v_new_advance WHERE id = p_customer_id;
                
--                 INSERT INTO credit_ledger (tenant_id, entity_type, entity_id, flow_type, amount, balance_after, reference_type, reference_id, description)
--                 VALUES (p_tenant_id, 'customer', p_customer_id, 'out', v_allocation, v_new_advance, 'sales_return', p_original_bill_id, 'Reversal of Credit Note from updated/deleted Sales Return.');
--             END IF;
--             -- (If v_allocation wasn't enough, it means they already spent the advance. defensiveBillSync will naturally convert the shortfall back into hard debt on the bill).
--         ELSE
--             v_cash_payout := -v_remaining; 
--         END IF;
--     END IF;

--     -- Final step: Force a complete recalculation of the customer's metrics to ensure 100% accuracy.
--     PERFORM sync_customer_metrics(p_customer_id);
    
--     RETURN v_cash_payout;
-- END;
-- $$ LANGUAGE plpgsql;