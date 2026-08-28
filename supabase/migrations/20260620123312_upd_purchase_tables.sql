-- Upgrade purchase_orders table
-- ALTER TABLE purchase_orders 
-- ADD COLUMN is_gst_supply BOOLEAN DEFAULT false,
-- ADD COLUMN is_interstate BOOLEAN DEFAULT false,
-- ADD COLUMN subtotal NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN discount_amount NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN cgst_total NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN sgst_total NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN igst_total NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN payment_status purchase_payment_status DEFAULT 'unpaid',
-- ADD COLUMN payment_method payment_method DEFAULT 'cash';

-- -- Upgrade po_line_items to track the exact tax split per item
-- ALTER TABLE po_line_items
-- ADD COLUMN cgst NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN sgst NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN igst NUMERIC(12,2) DEFAULT 0,
-- ADD COLUMN discount_pct NUMERIC(5,2) DEFAULT 0;

SELECT 1;