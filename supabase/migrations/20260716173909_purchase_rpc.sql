CREATE OR REPLACE FUNCTION sync_supplier_metrics(p_supplier_id UUID)
RETURNS void AS $$
DECLARE
    v_total_purchases NUMERIC;
    v_total_returns NUMERIC;
    v_outstanding_due NUMERIC;
    v_tenant_id UUID;
BEGIN
    -- 1. Fetch the tenant_id that owns this supplier
    SELECT tenant_id INTO v_tenant_id FROM suppliers WHERE id = p_supplier_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Supplier not found.';
    END IF;

    -- 2. Security Guard: Verify active membership
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = v_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;

    SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(amount_due), 0)
    INTO v_total_purchases, v_outstanding_due
    FROM purchase_orders 
    WHERE supplier_id = p_supplier_id AND status != 'cancelled';

    SELECT COALESCE(SUM(pr.refund_amount), 0)
    INTO v_total_returns
    FROM purchase_returns pr
    JOIN purchase_orders po ON pr.original_po_id = po.id
    WHERE po.supplier_id = p_supplier_id AND po.status != 'cancelled';

    UPDATE suppliers SET
        total_purchases = v_total_purchases - v_total_returns,
        outstanding_due = v_outstanding_due
    WHERE id = p_supplier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION sync_supplier_metrics(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION sync_supplier_metrics(UUID) TO authenticated;


-- ===========================================================================
-- 2. RPC: Unified Cascading Ledger Resolver (Handles Create, Update & Delete)
-- ===========================================================================
-- CREATE OR REPLACE FUNCTION execute_purchase_return_cascade(
--     p_tenant_id UUID, 
--     p_supplier_id UUID, 
--     p_original_po_id UUID, 
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
--     SELECT advance_balance INTO v_advance_balance FROM suppliers WHERE id = p_supplier_id FOR UPDATE;

--     IF p_refund_difference > 0 THEN
--         IF p_refund_method = 'credit_note' THEN
--             UPDATE suppliers SET advance_balance = advance_balance + v_remaining WHERE id = p_supplier_id RETURNING advance_balance INTO v_new_advance;
            
--             INSERT INTO credit_ledger (tenant_id, entity_type, entity_id, flow_type, amount, balance_after, reference_type, reference_id, description)
--             VALUES (p_tenant_id, 'supplier', p_supplier_id, 'in', v_remaining, v_new_advance, 'purchase_return', p_original_po_id, 'Credit Note generated from Purchase Return.');
--         ELSE
--             v_cash_payout := v_remaining;
--         END IF;

--     ELSIF p_refund_difference < 0 THEN
--         IF p_refund_method = 'credit_note' THEN
--             v_new_advance := GREATEST(0, v_advance_balance - v_remaining);
--             v_allocation := v_advance_balance - v_new_advance; 
            
--             IF v_allocation > 0 THEN
--                 UPDATE suppliers SET advance_balance = v_new_advance WHERE id = p_supplier_id;
--                 INSERT INTO credit_ledger (tenant_id, entity_type, entity_id, flow_type, amount, balance_after, reference_type, reference_id, description)
--                 VALUES (p_tenant_id, 'supplier', p_supplier_id, 'out', v_allocation, v_new_advance, 'purchase_return', p_original_po_id, 'Reversal of Credit Note from updated/deleted Purchase Return.');
--             END IF;
--         ELSE
--             v_cash_payout := -v_remaining;
--         END IF;
--     END IF;

--     PERFORM sync_supplier_metrics(p_supplier_id);
--     RETURN v_cash_payout;
-- END;
-- $$ LANGUAGE plpgsql;