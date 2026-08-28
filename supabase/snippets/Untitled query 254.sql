-- 1. Create a Dummy Shop (Tenant)
INSERT INTO tenants (id, slug, name, gstin, state_code, address, plan)
VALUES 
('11111111-1111-1111-1111-111111111111', 'ravi-auto-parts', 'Ravi Auto Parts', '22AAAAA0000A1Z5', '22', 'Main Market, Delhi', 'pro');

-- 2. Create Dummy Categories for this Shop
INSERT INTO categories (id, tenant_id, name, slug)
VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Lubricants', 'lubricants'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Brakes', 'brakes'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Filters', 'filters');

-- 3. Create Dummy Brands for this Shop
INSERT INTO brands (id, tenant_id, name)
VALUES 
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Castrol'),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Bosch'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Minda');

-- 4. Create Dummy Items
INSERT INTO items (tenant_id, category_id, brand_id, name, sku, barcode, hsn_code, unit, buy_price, sell_price, gst_rate, stock_qty, low_stock_threshold, description)
VALUES 
-- Item 1: Engine Oil (Healthy Stock)
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333331', 'Engine Oil 5W-30 1L', 'OIL-5W30-1L', '8901234567890', '27101980', 'Litre', 250.00, 350.00, 18.00, 45, 10, 'Premium fully synthetic engine oil for modern cars.'),

-- Item 2: Brake Pads (Low Stock to test your UI Badge)
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333332', 'Brake Pads Front - Honda City', 'BRK-FR-HC', '8901234567891', '87083000', 'Set', 800.00, 1200.00, 28.00, 4, 5, 'Ceramic front brake pads.'),

-- Item 3: Air Filter (High Stock)
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', '33333333-3333-3333-3333-333333333333', 'Air Filter - Maruti Swift', 'AIR-MS-01', '8901234567892', '84213100', 'Pcs', 150.00, 250.00, 18.00, 120, 15, 'High airflow intake filter.');