-- ====================================================================
-- STOCK MOVEMENT LOGGING  (run once in the Supabase SQL editor; also paste into the migration files)
-- Every stock change from bills, POs, returns and opening stock now writes a stock_movements row.
-- Old callers keep working: the new parameters are optional and nothing is logged without p_movement_type.
-- ====================================================================

-- 1. adjust_batch_stock: same job as before + optional audit row.
--    (Dropped first: keeping the old 2-argument version next to the new one makes the RPC call ambiguous.)
DROP FUNCTION IF EXISTS adjust_batch_stock(UUID, NUMERIC);
DROP FUNCTION IF EXISTS adjust_batch_stock(UUID, NUMERIC, movement_type, movement_reference_type, UUID, TEXT); -- only exists if you already ran the first version

CREATE OR REPLACE FUNCTION adjust_batch_stock(
    p_batch_id UUID,
    p_qty_change NUMERIC,
    p_movement_type movement_type DEFAULT NULL,
    p_reference_type movement_reference_type DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL -- the supplier, for purchases and purchase returns
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_item_id UUID;
    v_after INT;
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

    UPDATE item_batches SET stock_qty = stock_qty + p_qty_change WHERE id = p_batch_id;

    IF p_movement_type IS NOT NULL AND p_qty_change <> 0 THEN
        SELECT COALESCE(SUM(stock_qty), 0) INTO v_after
        FROM item_batches WHERE item_id = v_item_id AND tenant_id = v_tenant_id;

        INSERT INTO stock_movements (
            tenant_id, item_id, type, qty_change, qty_before, qty_after,
            reference_type, reference_id, note, created_by, supplier_id
        ) VALUES (
            v_tenant_id, v_item_id, p_movement_type, p_qty_change::INT, v_after - p_qty_change::INT, v_after,
            p_reference_type, p_reference_id, p_note, auth.uid(), p_supplier_id
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION adjust_batch_stock(UUID, NUMERIC, movement_type, movement_reference_type, UUID, TEXT, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION adjust_batch_stock(UUID, NUMERIC, movement_type, movement_reference_type, UUID, TEXT, UUID) TO authenticated;

-- 2. log_stock_movement: for places that write item_batches directly (PO batches, opening stock).
--    Call it AFTER the batch change: "after" = current total, "before" = after - change.
DROP FUNCTION IF EXISTS log_stock_movement(UUID, UUID, movement_type, NUMERIC, movement_reference_type, UUID, TEXT); -- only exists if you already ran the first version

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
    v_after INT;
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

    IF p_qty_change = 0 THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(stock_qty), 0) INTO v_after
    FROM item_batches WHERE item_id = p_item_id AND tenant_id = p_tenant_id;

    INSERT INTO stock_movements (
        tenant_id, item_id, type, qty_change, qty_before, qty_after,
        reference_type, reference_id, note, created_by, supplier_id
    ) VALUES (
        p_tenant_id, p_item_id, p_type, p_qty_change::INT, v_after - p_qty_change::INT, v_after,
        p_reference_type, p_reference_id, p_note, auth.uid(), p_supplier_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION log_stock_movement(UUID, UUID, movement_type, NUMERIC, movement_reference_type, UUID, TEXT, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION log_stock_movement(UUID, UUID, movement_type, NUMERIC, movement_reference_type, UUID, TEXT, UUID) TO authenticated;

-- 3. Optional: fill in the supplier on rows already logged by the first version
UPDATE stock_movements sm SET supplier_id = po.supplier_id
FROM purchase_orders po
WHERE sm.reference_type = 'purchase_order' AND sm.reference_id = po.id AND sm.supplier_id IS NULL;

UPDATE stock_movements sm SET supplier_id = po.supplier_id
FROM purchase_returns pr JOIN purchase_orders po ON po.id = pr.original_po_id
WHERE sm.reference_type = 'purchase_return' AND sm.reference_id = pr.id AND sm.supplier_id IS NULL;

NOTIFY pgrst, 'reload schema';

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