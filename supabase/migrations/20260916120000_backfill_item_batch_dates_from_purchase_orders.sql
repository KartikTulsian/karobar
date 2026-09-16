-- PO batches should use the purchase order date instead of insertion time.
UPDATE item_batches AS batch
SET created_at = po.order_date::timestamptz
FROM purchase_orders AS po
WHERE batch.po_id = po.id
  AND po.order_date IS NOT NULL;