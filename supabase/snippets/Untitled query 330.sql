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