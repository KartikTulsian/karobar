-- -- supabase/seed.sql
-- -- ============================================================
-- -- 0. DISABLE RLS FOR LOCAL SEEDING
-- -- ============================================================

-- ALTER TABLE tenants                DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users                  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_memberships     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE brands                 DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE items                  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bills                  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bill_line_items        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments               DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_returns          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_return_items     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_orders        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE po_line_items          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE to_purchase_list       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_returns       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_return_items  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE supplier_payments      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_categories     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses               DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_summaries        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cash_book              DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE item_batches           DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_movements        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_invitations     DISABLE ROW LEVEL SECURITY;

-- -- ============================================================
-- -- 1. AUTH USERS  (Supabase auth.users — must come first)
-- --    IDs starting with 99...  = staff/owners
-- -- ============================================================

-- INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES 

-- -- Ravi Auto Parts team
-- ('99999999-9999-9999-9999-999999999991', 'authenticated', 'authenticated', 'karti@karobar.in', 'encrypted_password', now(), now(), now()),
-- ('99999999-9999-9999-9999-999999999992', 'authenticated', 'authenticated', 'rahul.mgr@raviautol.in',   'encrypted_password', now(), now(), now()),
-- ('99999999-9999-9999-9999-999999999993', 'authenticated', 'authenticated', 'amit.staff@raviautol.in',  'encrypted_password', now(), now(), now()),
-- ('99999999-9999-9999-9999-999999999994', 'authenticated', 'authenticated', 'seema.staff@raviautol.in', 'encrypted_password', now(), now(), now()),
-- -- Kumar Motors owner (second shop)
-- ('99999999-9999-9999-9999-999999999995', 'authenticated', 'authenticated', 'kumar@kumarmotors.in',     'encrypted_password', now(), now(), now()),
-- -- Registered customer who has a portal login
-- ('99999999-9999-9999-9999-999999999996', 'authenticated', 'authenticated', 'fleet@citycabs.com',       'encrypted_password', now(), now(), now())
-- ON CONFLICT (id) DO NOTHING;

-- -- ============================================================
-- -- 2. PUBLIC USERS PROFILE TABLE
-- -- ============================================================
-- INSERT INTO users (id, email, phone, full_name, avatar_url, created_at) VALUES
-- ('99999999-9999-9999-9999-999999999991', 'karti@karobar.in', '+919876543210', 'Kartik Admin', null, now()),
-- ('99999999-9999-9999-9999-999999999992', 'rahul.mgr@raviautol.in',   '+919876543211', 'Rahul Sharma',     null, now()),
-- ('99999999-9999-9999-9999-999999999993', 'amit.staff@raviautol.in',  '+919876543212', 'Amit Kumar',       null, now()),
-- ('99999999-9999-9999-9999-999999999994', 'seema.staff@raviautol.in', '+919876543213', 'Seema Verma',      null, now()),
-- ('99999999-9999-9999-9999-999999999995', 'kumar@kumarmotors.in',     '+918765432100', 'Suresh Kumar',     null, now()),
-- ('99999999-9999-9999-9999-999999999996', 'fleet@citycabs.com',       '+919111222333', 'Fleet Manager',    null, now())
-- ON CONFLICT (id) DO NOTHING;

-- -- ============================================================
-- -- 3. TENANTS
-- --    T1 = Ravi Auto Parts (Pro plan — primary test tenant)
-- --    T2 = Kumar Motors    (Free plan — multi-tenancy isolation)
-- -- ============================================================
-- INSERT INTO tenants (id, slug, name, gstin, state_code, address, phone, logo_url, plan, plan_expires_at, razorpay_sub_id, is_active, created_at)
-- VALUES
-- (
--     '11111111-1111-1111-1111-111111111111',
--     'ravi-auto-parts',
--     'Ravi Auto Parts',
--     '07AAAAA0000A1Z5',   -- Delhi GSTIN (state code 07)
--     '07',
--     'Shop No. 14, Kashmere Gate Auto Market, Delhi - 110006',
--     '+919876543210',
--     null,
--     'pro',
--     now() + INTERVAL '11 months',
--     'sub_Nj7k2MlXqP',
--     true,
--     now() - INTERVAL '8 months'
-- ),
-- (
--     '11111111-1111-1111-1111-111111111112',
--     'kumar-motors',
--     'Kumar Motors',
--     '09BBBBB0000B1Z3',   -- UP GSTIN (state code 09)
--     '09',
--     'Plot 22, Transport Nagar, Lucknow - 226012',
--     '+918765432100',
--     null,
--     'free',
--     null,
--     null,
--     true,
--     now() - INTERVAL '2 months'
-- );

-- -- ============================================================
-- -- 4. TENANT MEMBERSHIPS
-- --    Covers: owner, manager, active staff, revoked staff
-- --    Also: same user (Ravi) being owner of T1 and customer at T2
-- -- ============================================================

-- INSERT INTO tenant_memberships (id, user_id, tenant_id, role, invited_by, is_active, created_at) VALUES
-- -- Ravi Auto Parts team
-- ('d65cf500-5a47-565d-b5bc-507716623bbf', '99999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111', 'owner',   null,                                     true,  now() - INTERVAL '8 months'),
-- ('5a2af436-eb32-5073-85af-cf967a575e5b', '99999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', 'manager', '99999999-9999-9999-9999-999999999991',   true,  now() - INTERVAL '6 months'),
-- ('f415491f-8121-5e60-b6a8-cb0e42d39390', '99999999-9999-9999-9999-999999999993', '11111111-1111-1111-1111-111111111111', 'staff',   '99999999-9999-9999-9999-999999999992',   true,  now() - INTERVAL '4 months'),
-- -- Seema's access was revoked (is_active = false — shows revoked staff case)
-- ('bcdba0ee-9403-52c8-bb25-5e1962cc5a36', '99999999-9999-9999-9999-999999999994', '11111111-1111-1111-1111-111111111111', 'staff',   '99999999-9999-9999-9999-999999999992',   false, now() - INTERVAL '5 months'),
-- -- Kumar Motors — Suresh is owner
-- ('63130760-b0f2-5b78-8acc-37e43f02aa97', '99999999-9999-9999-9999-999999999995', '11111111-1111-1111-1111-111111111112', 'owner',   null,                                     true,  now() - INTERVAL '2 months'),
-- -- City Cabs fleet manager is a registered customer at Ravi Auto Parts
-- ('1fc77b08-de04-56ca-bc75-3d572bba7a67', '99999999-9999-9999-9999-999999999996', '11111111-1111-1111-1111-111111111111', 'customer', null,                                    true,  now() - INTERVAL '6 months');

-- -- ============================================================
-- -- 5. CATEGORIES
-- --    Parent + child hierarchy shown (Filters > Air Filters)
-- -- ============================================================
-- INSERT INTO categories (id, tenant_id, name, slug, parent_id, created_at)
-- VALUES
-- -- Top-level categories — Ravi Auto Parts
-- ('411277ea-3739-56ac-a124-ec229e062f6f', '11111111-1111-1111-1111-111111111111', 'Lubricants & Oils',  'lubricants-oils',  null,                                   now()),
-- ('162d71a5-edcb-5e2f-be53-a7ba868c4d10', '11111111-1111-1111-1111-111111111111', 'Brakes',             'brakes',           null,                                   now()),
-- ('2fbffa59-32c5-5e9f-9016-43cbfa36d992', '11111111-1111-1111-1111-111111111111', 'Filters',            'filters',          null,                                   now()),
-- ('b261f020-2bca-56c6-944a-c6f427073c5c', '11111111-1111-1111-1111-111111111111', 'Tyres & Wheels',     'tyres-wheels',     null,                                   now()),
-- ('6b5f6907-6199-5468-8de3-9e0a56e6b99e', '11111111-1111-1111-1111-111111111111', 'Electrical',         'electrical',       null,                                   now()),
-- ('ddb528b4-9a15-5c50-a8c2-8ac2dc36f023', '11111111-1111-1111-1111-111111111111', 'Body & Exterior',    'body-exterior',    null,                                   now()),
-- -- Sub-categories (parent_id set — demonstrates hierarchy)
-- ('e832b36d-1937-5dbc-852e-f664d09d6724', '11111111-1111-1111-1111-111111111111', 'Air Filters',        'air-filters',      '2fbffa59-32c5-5e9f-9016-43cbfa36d992',       now()),
-- ('dcffb254-9783-53d7-a299-b9fe048ec0ae', '11111111-1111-1111-1111-111111111111', 'Oil Filters',        'oil-filters',      '2fbffa59-32c5-5e9f-9016-43cbfa36d992',       now()),
-- -- Kumar Motors categories (isolation check)
-- ('49ac1109-6fa8-5dac-afa7-96ed1cb27894', '11111111-1111-1111-1111-111111111112', 'General Parts',      'general-parts',    null,                                   now());

-- -- ============================================================
-- -- 6. BRANDS
-- -- ============================================================
-- INSERT INTO brands (id, tenant_id, name, logo_url, created_at)
-- VALUES
-- ('9dc64833-330e-5f86-aaa6-5ac9caf45fc2', '11111111-1111-1111-1111-111111111111', 'Castrol',      null, now()),
-- ('fc3b5f92-4f6a-50c4-9837-f197448370e1', '11111111-1111-1111-1111-111111111111', 'Bosch',        null, now()),
-- ('59a3487a-a5c2-51eb-854d-84129975678b', '11111111-1111-1111-1111-111111111111', 'Minda',        null, now()),
-- ('814c2e1f-fa89-5c54-b443-d20054a5822d', '11111111-1111-1111-1111-111111111111', 'MRF',          null, now()),
-- ('17969942-3723-59e4-9b4f-89cce17bdb5a', '11111111-1111-1111-1111-111111111111', 'Exide',        null, now()),
-- ('5343aa3b-924c-56d7-b43e-6861d0cbab12', '11111111-1111-1111-1111-111111111111', 'TVS',          null, now()),
-- ('427bbea3-27f3-5fc5-9330-fc4742db2842', '11111111-1111-1111-1111-111111111111', 'Denso',        null, now()),
-- ('07b49a06-431f-5772-9519-2c155bf02234', '11111111-1111-1111-1111-111111111111', 'Mahle',        null, now()),
-- ('169956c7-190f-5ff5-936d-c3f4f0aaab61', '11111111-1111-1111-1111-111111111111', 'Hella',        null, now());

-- -- ============================================================
-- -- 7. ITEMS
-- --    Covers: every GST slab (0%, 5%, 12%, 18%, 28%)
-- --    Every stock state: healthy, low, zero (out of stock)
-- --    Inactive item (discontinued product)
-- --    Items with images array and items without
-- --    Various units: Pcs, Litre, Set, Pair, Metre, Box
-- -- ============================================================
-- INSERT INTO items (
--     id, tenant_id, category_id, brand_id,
--     name, sku, barcode, hsn_code, unit,
--     default_sell_price, gst_rate,
--     low_stock_threshold,
--     description, images, is_active,
--     created_at, updated_at
-- ) VALUES

-- -- ── Lubricants & Oils (18% GST) ──────────────────────────
-- (
--     '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--     '11111111-1111-1111-1111-111111111111',
--     '411277ea-3739-56ac-a124-ec229e062f6f', '9dc64833-330e-5f86-aaa6-5ac9caf45fc2',
--     'Castrol GTX 5W-30 Engine Oil 1L', 'OIL-GTX-5W30-1L', '8901234500001', '27101980',
--     'Litre', 390.00, 18.00,
--     10,
--     'Fully synthetic engine oil for petrol and diesel engines.',
--     '{"https://images.unsplash.com/photo-1635868388795-0720a2ce3105"}',
--     true, now() - INTERVAL '7 months', now()
-- ),
-- (
--     '1234bd66-3861-53a0-8a41-fa7195d87be4',
--     '11111111-1111-1111-1111-111111111111',
--     '411277ea-3739-56ac-a124-ec229e062f6f', '9dc64833-330e-5f86-aaa6-5ac9caf45fc2',
--     'Castrol GTX 10W-40 Engine Oil 5L', 'OIL-GTX-10W40-5L', '8901234500002', '27101980',
--     'Litre', 1600.00, 18.00,
--     8,
--     'Semi-synthetic engine oil, ideal for older diesel engines.',
--     '{"https://images.unsplash.com/photo-1558618666-fcd25c85cd64"}',
--     true, now() - INTERVAL '6 months', now()
-- ),
-- (
--     'a6485f3f-6236-56fa-bb1a-b24f7452f799',
--     '11111111-1111-1111-1111-111111111111',
--     '411277ea-3739-56ac-a124-ec229e062f6f', '9dc64833-330e-5f86-aaa6-5ac9caf45fc2',
--     'Castrol Activ 4T 20W-40 Bike Oil 0.9L', 'OIL-ACTIV-20W40-09L', '8901234500003', '27101980',
--     'Litre', 240.00, 18.00,
--     10,
--     'Mineral engine oil for 4-stroke motorcycles.',
--     '{}',
--     true, now() - INTERVAL '5 months', now()
-- ),

-- -- ── Brakes (28% GST) ─────────────────────────────────────
-- (
--     '53dde910-2f45-5c6a-bb03-8a5c33638452',
--     '11111111-1111-1111-1111-111111111111',
--     '162d71a5-edcb-5e2f-be53-a7ba868c4d10', 'fc3b5f92-4f6a-50c4-9837-f197448370e1',
--     'Bosch Ceramic Front Brake Pads (Honda City)', 'BRK-BOSCH-HC-FR', '8901234500004', '87083000',
--     'Set', 1350.00, 28.00,
--     5,
--     'OE-grade ceramic brake pads for Honda City 2019-2023.',
--     '{}',
--     true, now() - INTERVAL '7 months', now()
-- ),
-- (
--     'acdfc299-fd14-5d45-9a25-919eaafc1153',
--     '11111111-1111-1111-1111-111111111111',
--     '162d71a5-edcb-5e2f-be53-a7ba868c4d10', 'fc3b5f92-4f6a-50c4-9837-f197448370e1',
--     'Bosch Rear Brake Drum (Maruti Alto)', 'BRK-BOSCH-MA-RR', '8901234500005', '87083000',
--     'Pcs', 1850.00, 28.00,
--     3,
--     'Cast iron rear brake drum compatible with Maruti Alto K10.',
--     '{}',
--     true, now() - INTERVAL '4 months', now()
-- ),
-- (
--     '739e3dd7-338a-582a-b1a6-4100086d0e28',
--     '11111111-1111-1111-1111-111111111111',
--     '162d71a5-edcb-5e2f-be53-a7ba868c4d10', '5343aa3b-924c-56d7-b43e-6861d0cbab12',
--     'TVS Brake Cable (Hero Splendor)', 'BRK-TVS-HS-CBL', '8901234500006', '87141090',
--     'Pcs', 140.00, 28.00,
--     10,
--     'Front brake cable assembly for Hero Splendor Plus.',
--     '{}',
--     true, now() - INTERVAL '3 months', now()
-- ),

-- -- ── Filters (12% GST) ────────────────────────────────────
-- (
--     'e791ede3-30c3-5834-92fc-218b1f841c5c',
--     '11111111-1111-1111-1111-111111111111',
--     'e832b36d-1937-5dbc-852e-f664d09d6724', '07b49a06-431f-5772-9519-2c155bf02234',
--     'Mahle Air Filter (Maruti Swift)', 'AIR-MAHLE-MS', '8901234500007', '84213100',
--     'Pcs', 230.00, 12.00,
--     15,
--     'OEM-spec air filter for Maruti Swift Dzire 2017-2024.',
--     '{"https://images.unsplash.com/photo-1486262715619-67b85e0b08d3"}',
--     true, now() - INTERVAL '6 months', now()
-- ),
-- (
--     'a6e9b350-b2af-588a-98d5-f8408169ae9b',
--     '11111111-1111-1111-1111-111111111111',
--     'dcffb254-9783-53d7-a299-b9fe048ec0ae', '07b49a06-431f-5772-9519-2c155bf02234',
--     'Mahle Oil Filter (Hyundai i20)', 'OIL-FLT-MAHLE-I20', '8901234500008', '84212300',
--     'Pcs', 160.00, 12.00,
--     10,
--     'Spin-on oil filter for Hyundai i20 1.2 Petrol.',
--     '{}',
--     true, now() - INTERVAL '5 months', now()
-- ),
-- (
--     '16d8820e-cf12-5f14-9f5b-9d76979ca5dd',
--     '11111111-1111-1111-1111-111111111111',
--     'e832b36d-1937-5dbc-852e-f664d09d6724', '427bbea3-27f3-5fc5-9330-fc4742db2842',
--     'Denso Cabin AC Filter (Toyota Innova)', 'AIR-DENSO-TI-AC', '8901234500009', '84213990',
--     'Pcs', 580.00, 12.00,
--     8,
--     'Activated carbon cabin air filter for Toyota Innova Crysta.',
--     '{}',
--     true, now() - INTERVAL '4 months', now()
-- ),

-- -- ── Tyres & Wheels (no GST — 0% GST slab) ───────────────
-- (
--     'b7fa3360-b671-55ed-827d-a16fb06af7ad',
--     '11111111-1111-1111-1111-111111111111',
--     'b261f020-2bca-56c6-944a-c6f427073c5c', '814c2e1f-fa89-5c54-b443-d20054a5822d',
--     'MRF ZVTS 155/65 R14 Tubeless Tyre', 'TYR-MRF-155-65-R14', '8901234500010', '40111000',
--     'Pcs', 4200.00, 0.00,
--     4,
--     'MRF ZVTS tubeless radial tyre for small hatchbacks.',
--     '{}',
--     true, now() - INTERVAL '5 months', now()
-- ),

-- -- ── Electrical (5% GST) ──────────────────────────────────
-- (
--     '8029bc18-b1be-5ce9-bfb8-7914c2a925ca',
--     '11111111-1111-1111-1111-111111111111',
--     '6b5f6907-6199-5468-8de3-9e0a56e6b99e', '17969942-3723-59e4-9b4f-89cce17bdb5a',
--     'Exide Mileage 35Ah Car Battery', 'BAT-EXIDE-35AH', '8901234500011', '85072000',
--     'Pcs', 3800.00, 5.00,
--     3,
--     '35Ah maintenance-free battery for small hatchbacks. 24-month warranty.',
--     '{}',
--     true, now() - INTERVAL '7 months', now()
-- ),
-- (
--     'e1356b24-47c1-56ff-99e5-7391dc535de0',
--     '11111111-1111-1111-1111-111111111111',
--     '6b5f6907-6199-5468-8de3-9e0a56e6b99e', '169956c7-190f-5ff5-936d-c3f4f0aaab61',
--     'Hella H4 60/55W Halogen Bulb (Pair)', 'BULB-HELLA-H4', '8901234500012', '85392110',
--     'Pair', 290.00, 5.00,
--     20,
--     'H4 12V 60/55W halogen headlight bulb set.',
--     '{}',
--     true, now() - INTERVAL '3 months', now()
-- ),

-- -- ── Body & Exterior (18% GST) ────────────────────────────
-- (
--     '34ec8efb-b6c8-57db-a8a5-60bb933c8ea0',
--     '11111111-1111-1111-1111-111111111111',
--     'ddb528b4-9a15-5c50-a8c2-8ac2dc36f023', '59a3487a-a5c2-51eb-854d-84129975678b',
--     'Minda Wiper Blade 20" Universal', 'WPR-MINDA-20', '8901234500013', '85122000',
--     'Pcs', 250.00, 18.00,
--     10,
--     'Frameless wiper blade, universal fit for most sedans.',
--     '{}',
--     true, now() - INTERVAL '2 months', now()
-- ),
-- (
--     'ae6f649e-2c9d-5985-814d-4b227bd2f2e9',
--     '11111111-1111-1111-1111-111111111111',
--     'ddb528b4-9a15-5c50-a8c2-8ac2dc36f023', null,
--     'Headlight Lens Polish Kit', 'PLSH-LENS-KIT', null, '34051090',
--     'Box', 220.00, 18.00,
--     5,
--     ' 3M-compatible headlight restoration kit with sandpaper and polish.',
--     '{}',
--     true, now() - INTERVAL '1 month', now()
-- ),

-- -- ── Discontinued item (is_active = false) ────────────────
-- (
--     '1071459a-447a-5845-af8c-e6df3a8175fd',
--     '11111111-1111-1111-1111-111111111111',
--     '411277ea-3739-56ac-a124-ec229e062f6f', '9dc64833-330e-5f86-aaa6-5ac9caf45fc2',
--     'Castrol CRB Plus 20W-50 (Discontinued)', 'OIL-CRB-20W50', null, '27101980',
--     'Litre', 300.00, 18.00,
--     5,
--     'Discontinued. Use Castrol GTX 10W-40 instead.',
--     '{}',
--     false,
--     now() - INTERVAL '10 months', now()
-- );

-- -- ============================================================
-- -- 7.5. ITEM BATCHES (NEW FEATURE)
-- --      Creating the physical batches that back the stock quantities.
-- --      These act as the "received" stock from your POs.
-- -- ============================================================
-- INSERT INTO item_batches (
--     id, tenant_id, item_id, batch_number, buy_price, sell_price, stock_qty, created_at
-- ) VALUES
-- -- Castrol GTX 5W-30 (Stock 48)
-- ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'OPENING-STOCK', 280.00, 390.00, 48, now() - INTERVAL '7 months'),
-- -- Castrol GTX 10W-40 (Stock 22)
-- ('b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '1234bd66-3861-53a0-8a41-fa7195d87be4', 'OPENING-STOCK', 1100.00, 1600.00, 22, now() - INTERVAL '6 months'),
-- -- Castrol Activ 4T (Stock 7)
-- ('b3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'a6485f3f-6236-56fa-bb1a-b24f7452f799', 'OPENING-STOCK', 160.00, 240.00, 7, now() - INTERVAL '5 months'),
-- -- Bosch Front Brake Pads (Stock 3)
-- ('b4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '53dde910-2f45-5c6a-bb03-8a5c33638452', 'OPENING-STOCK', 850.00, 1350.00, 3, now() - INTERVAL '7 months'),
-- -- Bosch Rear Brake Drum (Out of stock: 0)
-- ('b5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'acdfc299-fd14-5d45-9a25-919eaafc1153', 'OPENING-STOCK', 1200.00, 1850.00, 0, now() - INTERVAL '4 months'),
-- -- TVS Brake Cable (Stock 35)
-- ('b6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '739e3dd7-338a-582a-b1a6-4100086d0e28', 'OPENING-STOCK', 80.00, 140.00, 35, now() - INTERVAL '3 months'),
-- -- Mahle Air Filter (Stock 62)
-- ('b7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'e791ede3-30c3-5834-92fc-218b1f841c5c', 'OPENING-STOCK', 140.00, 230.00, 62, now() - INTERVAL '6 months'),
-- -- Mahle Oil Filter (Stock 40)
-- ('b8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'a6e9b350-b2af-588a-98d5-f8408169ae9b', 'OPENING-STOCK', 95.00, 160.00, 40, now() - INTERVAL '5 months'),
-- -- Denso Cabin AC Filter (Stock 18)
-- ('b9999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '16d8820e-cf12-5f14-9f5b-9d76979ca5dd', 'OPENING-STOCK', 350.00, 580.00, 18, now() - INTERVAL '4 months'),
-- -- MRF Tubeless Tyre (Stock 8)
-- ('baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'b7fa3360-b671-55ed-827d-a16fb06af7ad', 'OPENING-STOCK', 3200.00, 4200.00, 8, now() - INTERVAL '5 months'),
-- -- Exide Mileage Car Battery (Stock 5)
-- ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '8029bc18-b1be-5ce9-bfb8-7914c2a925ca', 'OPENING-STOCK', 2800.00, 3800.00, 5, now() - INTERVAL '7 months'),
-- -- Hella Bulb (Stock 55)
-- ('bccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'e1356b24-47c1-56ff-99e5-7391dc535de0', 'OPENING-STOCK', 180.00, 290.00, 55, now() - INTERVAL '3 months'),
-- -- Minda Wiper Blade (Stock 28)
-- ('bddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '34ec8efb-b6c8-57db-a8a5-60bb933c8ea0', 'OPENING-STOCK', 150.00, 250.00, 28, now() - INTERVAL '2 months'),
-- -- Polish Kit (Stock 15)
-- ('beeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'ae6f649e-2c9d-5985-814d-4b227bd2f2e9', 'OPENING-STOCK', 120.00, 220.00, 15, now() - INTERVAL '1 month');

-- -- ============================================================
-- -- 8. CUSTOMERS
-- --    Covers: registered (with user_id link), flying (walk-in)
-- --    B2B with GSTIN, credit customer, interstate customer
-- --    Various outstanding_due states
-- -- ============================================================
-- INSERT INTO customers (
--     id, tenant_id, user_id,
--     name, company_name, country_code, phone, email, gstin,
--     address, city, pincode, state_code, country,
--     type, credit_limit, outstanding_due, total_purchases,
--     visit_count, last_purchase_at, notes, total_write_offs, created_at
-- ) VALUES

-- -- C1: Registered — linked to auth user — regular buyer
-- (
--     '50aa83e1-e4a9-5a76-a269-7975040bdf01',
--     '11111111-1111-1111-1111-111111111111',
--     '99999999-9999-9999-9999-999999999996',
--     'City Cabs Fleet Pvt Ltd', 'City Cabs Fleet Pvt Ltd', '+91', '+919111222333', 'fleet@citycabs.com', '07CCCC10001C1Z5',
--     '12, Transport Nagar', 'Delhi', '110042', '07', 'India',
--     'registered', 100000.00, 14832.00, 98500.00,
--     24, now() - INTERVAL '4 days', 'Fleet account — 15 cars. Always buys brake pads and engine oil in bulk.', 0.00, now() - INTERVAL '6 months'
-- ),

-- -- C2: Registered — individual car owner — intrastate Delhi
-- (
--     '41888bd9-d36c-5165-98df-6aacc9721412',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Priya Mehra', null, '+91', '+919988776655', 'priya.mehra@gmail.com', null,
--     'B-14, Janakpuri', 'Delhi', '110058', '07', 'India',
--     'registered', 15000.00, 1652.00, 18400.00,
--     11, now() - INTERVAL '12 days', 'Regular customer. Honda City owner.', 0.00, now() - INTERVAL '5 months'
-- ),

-- -- C3: Registered — B2B garage — has GSTIN — partial payer
-- (
--     'ca6a6a20-eff0-50d2-8f64-06d8da87900d',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Ajay Auto Garage', 'Ajay Auto Garage Works', '+91', '+919977665544', 'ajay@ajaygarage.com', '07DDDDD0000D1Z2',
--     'Near Ashok Vihar Metro', 'Delhi', '110052', '07', 'India',
--     'registered', 50000.00, 7080.00, 42600.00,
--     18, now() - INTERVAL '8 days', 'Garage owner. Buys parts in bulk. Pays on credit.', 0.00, now() - INTERVAL '4 months'
-- ),

-- -- C4: Registered — interstate customer (UP) — triggers IGST
-- (
--     'abd1e114-24a4-5ab4-ad84-f109c6ace671',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Shyam Transport Co', 'Shyam Transport Co', '+91', '+919555666777', 'billing@shyamtrans.com', '09EEEEE0000E1Z1',
--     'Alambagh', 'Lucknow', '226005', '09', 'India',   -- state_code 09 = UP, triggers IGST
--     'registered', 75000.00, 0.00, 31200.00,
--     9, now() - INTERVAL '20 days', 'Trucking company. Buys tyres and batteries. Interstate customer — IGST applies.', 0.00, now() - INTERVAL '5 months'
-- ),

-- -- C5: Flying — walk-in, no account, has phone
-- (
--     '257168a2-c607-52e1-9846-8a6e79867e39',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Walk-in Customer', null, '+91', '+919000011111', null, null,
--     null, null, null, null, 'India',
--     'flying', 0.00, 0.00, 2890.00,
--     3, now() - INTERVAL '6 days', null, 0.00, now() - INTERVAL '2 months'
-- ),

-- -- C6: Flying — completely anonymous, no phone
-- (
--     '7b191fc2-5c12-5def-845d-46d751f331dd',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Cash Customer', null, '+91', null, null, null,
--     null, null, null, null, 'India',
--     'flying', 0.00, 0.00, 580.00,
--     1, now() - INTERVAL '30 days', null, 0.00, now() - INTERVAL '1 month'
-- ),

-- -- C7: Credit customer with partial write-off history
-- (
--     'e16d80bc-9ddb-5cd6-9dd1-cf045dcdbf37',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Ram Lal Mechanics', null, '+91', '+919333444555', null, null,
--     'Shahdara', 'Delhi', '110032', '07', 'India',
--     'registered', 20000.00, 3540.00, 22100.00,
--     14, now() - INTERVAL '2 days', 'Had a write-off of Rs 1200 in Jan. Monitor credit carefully.', 1200.00, now() - INTERVAL '7 months'
-- );

-- -- ============================================================
-- -- 9. SUPPLIERS
-- -- ============================================================
-- INSERT INTO suppliers (
--     id, tenant_id, user_id,
--     name, company_name, country_code, phone, email, gstin,
--     address, city, pincode, state_code, country,
--     payment_terms, outstanding_due, total_purchases, notes, total_write_offs, created_at
-- ) VALUES

-- -- S1: Lubricant distributor — Delhi — fully paid
-- (
--     '8fb61d01-9724-5c10-b362-9ff388b488d8',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Castrol Distributor Delhi', 'Castrol India Dist Pvt Ltd', '+91', '+911122334455', 'orders@castroldelhi.in', '07SSSSS0001S1Z2',
--     'Wazirpur Industrial Area', 'Delhi', '110052', '07', 'India',
--     'Net 30', 0.00, 124500.00, 'Primary lubricant supplier. Good margins.', 0.00, now() - INTERVAL '8 months'
-- ),

-- -- S2: Brake & filter parts — Delhi — has outstanding due
-- (
--     '3e6aeffb-4461-5cb7-8d49-a5e6e516f5cf',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Bosch Auto Parts Hub', 'Bosch Auto Parts Hub', '+91', '+911133445566', 'supply@boschhub.in', '07TTTTT0002T1Z3',
--     'Patparganj Industrial', 'Delhi', '110091', '07', 'India',
--     'Net 15', 35400.00, 89200.00, 'Bosch authorized dealer. Ships within 2 days.', 0.00, now() - INTERVAL '7 months'
-- ),

-- -- S3: Interstate supplier — UP — triggers IGST on purchases
-- (
--     'f21ef35e-caec-5034-a561-a8740f29adb5',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'MRF Tyre Depot Lucknow', 'MRF Ltd Lucknow Depot', '+91', '+915222333444', 'mrflko@mrf.com', '09UUUUU0003U1Z4',
--     'Amausi Industrial Area', 'Lucknow', '226023', '09', 'India',   -- UP = interstate
--     'Cash on Delivery', 0.00, 67800.00, 'MRF tyres at competitive rates. COD only.', 0.00, now() - INTERVAL '5 months'
-- ),

-- -- S4: Small local supplier — no GSTIN (unregistered)
-- (
--     '3759d65b-fc2f-54fc-a4eb-004ac8921272',
--     '11111111-1111-1111-1111-111111111111',
--     null,
--     'Sharma General Spare Parts', null, '+91', '+919888777666', null, null,
--     'Near Kashmere Gate', 'Delhi', '110006', '07', 'India',
--     'Immediate', 1800.00, 12400.00, 'Local small supplier. No GSTIN — unregistered. Cash payments only.', 0.00, now() - INTERVAL '6 months'
-- );

-- -- ============================================================
-- -- 10. BILLS
-- --     Covers ALL 6 statuses: draft, issued, paid, partial,
-- --     overdue, cancelled
-- --     Intrastate (CGST+SGST) and Interstate (IGST)
-- --     GST bill and non-GST bill
-- --     Flying and registered customers
-- --     AI-parsed bill
-- --     Round-off and settlement discount cases
-- -- ============================================================
-- INSERT INTO bills (
--     id, tenant_id, customer_id, created_by,
--     bill_number, bill_date, due_date, status,
--     is_gst_bill, is_interstate,
--     subtotal, discount_amount, settlement_discount,
--     cgst_total, sgst_total, igst_total, grand_total,
--     amount_paid, amount_due, total_profit, round_off,
--     payment_method, notes, ai_parsed,
--     vehicle_no, reference_name, terms_conditions,
--     created_at, updated_at
-- ) VALUES

-- -- ── B1: PAID in full — UPI — registered customer — intrastate ─
-- (
--     '83cc95f1-72c7-5c31-bb5f-12707686e761', '11111111-1111-1111-1111-111111111111', '41888bd9-d36c-5165-98df-6aacc9721412', '99999999-9999-9999-9999-999999999993',
--     'INV-2026-001', '2026-03-10', '2026-03-10', 'paid',
--     true, false,
--     1100.00, 0.00, 0.00,
--     99.00, 99.00, 0.00, 1298.00,
--     1298.00, 0.00, 370.00, 0.00,
--     'upi', 'Honda City service — oil + filter change', false,
--     'DL-8C-AA-1234', 'Self', 'Standard 6-month warranty on service.', -- NEW
--     '2026-03-10 10:30:00+00', '2026-03-10 10:45:00+00'
-- ),

-- -- ── B2: PAID — Cash — flying customer (anonymous) ─────────────
-- (
--     '65c6e239-9932-584f-a631-f7fe7ee65401', '11111111-1111-1111-1111-111111111111', '7b191fc2-5c12-5def-845d-46d751f331dd', '99999999-9999-9999-9999-999999999993',
--     'INV-2026-002', '2026-03-15', '2026-03-15', 'paid',
--     true, false,
--     250.00, 0.00, 0.00,
--     7.25, 7.25, 0.00, 290.00,
--     290.00, 0.00, 110.00, 0.50,
--     'cash', null, false,
--     null, null, null, -- NEW
--     '2026-03-15 12:00:00+00', '2026-03-15 12:10:00+00'
-- ),

-- -- ── B3: ISSUED (unpaid) — Credit — registered B2B with GSTIN ──
-- (
--     '9e987f0c-093e-58a8-ab30-9eff014ed0d2', '11111111-1111-1111-1111-111111111111', 'ca6a6a20-eff0-50d2-8f64-06d8da87900d', '99999999-9999-9999-9999-999999999992',
--     'INV-2026-003', '2026-04-02', '2026-04-17', 'issued',
--     true, false,
--     6000.00, 0.00, 0.00,
--     540.00, 540.00, 0.00, 7080.00,
--     0.00, 7080.00, 1500.00, 0.00,
--     'credit', 'Bulk brake pads for Ajay Auto Garage', false,
--     null, 'Mechanic Raju', 'Bulk discount applied. No returns on electrical parts.', -- NEW
--     '2026-04-02 09:00:00+00', '2026-04-02 09:05:00+00'
-- ),

-- -- ── B4: OVERDUE — credit — fleet customer — bulk order ────────
-- (
--     '9c8d7b8a-5758-533d-8cbf-a6db2e750ffa', '11111111-1111-1111-1111-111111111111', '50aa83e1-e4a9-5a76-a269-7975040bdf01', '99999999-9999-9999-9999-999999999992',
--     'INV-2026-004', '2026-03-01', '2026-03-16', 'overdue',
--     true, false,
--     12400.00, 0.00, 0.00,
--     1116.00, 1116.00, 0.00, 14632.00,
--     0.00, 14632.00, 3220.00, 0.00,
--     'credit', 'Fleet order — City Cabs monthly supply', false,
--     'UP-32-TR-9999', 'Driver Suraj', null, -- NEW
--     '2026-03-01 08:30:00+00', '2026-03-16 00:00:00+00'
-- ),

-- -- ── B5: PARTIAL — mixed payment — registered customer ─────────
-- (
--     'cc55ab27-bed0-5673-b5db-a233c328f0a7', '11111111-1111-1111-1111-111111111111', '41888bd9-d36c-5165-98df-6aacc9721412', '99999999-9999-9999-9999-999999999993',
--     'INV-2026-005', '2026-04-20', '2026-05-05', 'partial',
--     true, false,
--     1400.00, 0.00, 0.00,
--     126.00, 126.00, 0.00, 1652.00,
--     1000.00, 652.00, 470.00, 0.00,
--     'mixed', 'Paid 1000 by card, balance on credit', false,
--     'DL-10-CE-7766', null, null, -- NEW
--     '2026-04-20 14:00:00+00', '2026-04-20 14:20:00+00'
-- ),

-- -- ── B6: DRAFT — bill being built in POS ──────────────────────
-- (
--     'dd7b32db-c215-55d9-8e9d-52d80cc727f7', '11111111-1111-1111-1111-111111111111', '257168a2-c607-52e1-9846-8a6e79867e39', '99999999-9999-9999-9999-999999999993',
--     'INV-2026-006', '2026-05-10', null, 'draft',
--     true, false,
--     580.00, 0.00, 0.00,
--     52.20, 52.20, 0.00, 684.40,
--     0.00, 684.40, 310.00, 0.00,
--     null, 'Wiper and bulbs — customer still deciding', false,
--     null, null, null, -- NEW
--     '2026-05-10 16:30:00+00', '2026-05-10 16:30:00+00'
-- ),

-- -- ── B7: CANCELLED — flying customer walked away ───────────────
-- (
--     '054ef1e4-6e5f-5b51-b285-f57d4f942a3f', '11111111-1111-1111-1111-111111111111', '257168a2-c607-52e1-9846-8a6e79867e39', '99999999-9999-9999-9999-999999999993',
--     'INV-2026-007', '2026-05-12', null, 'cancelled',
--     true, false,
--     4200.00, 0.00, 0.00,
--     0.00, 0.00, 0.00, 4200.00,
--     0.00, 0.00, 4000.00, 0.00,
--     null, 'Customer cancelled — tyre price dispute', false,
--     null, null, null, -- NEW
--     '2026-05-12 11:00:00+00', '2026-05-12 11:10:00+00'
-- ),

-- -- ── B8: PAID — INTERSTATE — IGST bill — UP customer ──────────
-- (
--     '05351abb-953e-5ce6-951c-c0326182e3b2', '11111111-1111-1111-1111-111111111111', 'abd1e114-24a4-5ab4-ad84-f109c6ace671', '99999999-9999-9999-9999-999999999992',
--     'INV-2026-008', '2026-05-18', '2026-05-18', 'paid',
--     true, true,
--     6400.00, 0.00, 0.00,
--     0.00, 0.00, 0.00, 6400.00,
--     6400.00, 0.00, 4000.00, 0.00,
--     'bank_transfer', 'Tyre set for Shyam Transport truck', false,
--     'UP-14-BT-5555', 'Shyam Logistics', 'Transit damage is at owner risk.', -- NEW
--     '2026-05-18 09:00:00+00', '2026-05-18 09:30:00+00'
-- ),

-- -- ── B9: PAID — NON-GST bill — small repair job ────────────────
-- (
--     'f89cb755-2b5c-56a5-b258-d90507b16cd9', '11111111-1111-1111-1111-111111111111', '257168a2-c607-52e1-9846-8a6e79867e39', '99999999-9999-9999-9999-999999999993',
--     'INV-2026-009', '2026-05-22', '2026-05-22', 'paid',
--     false, false,
--     580.00, 0.00, 0.00,
--     0.00, 0.00, 0.00, 580.00,
--     580.00, 0.00, 280.00, 0.00,
--     'cash', 'Non-GST cash bill for labour + small parts', false,
--     'HR-26-DK-2020', null, null, -- NEW
--     '2026-05-22 13:00:00+00', '2026-05-22 13:05:00+00'
-- ),

-- -- ── B10: PAID — AI-PARSED bill — scanned from photo ──────────
-- (
--     '4ecc0706-81bc-5222-8076-410610ae9a95', '11111111-1111-1111-1111-111111111111', 'e16d80bc-9ddb-5cd6-9dd1-cf045dcdbf37', '99999999-9999-9999-9999-999999999992',
--     'INV-2026-010', '2026-06-01', '2026-06-01', 'paid',
--     true, false,
--     3000.00, 300.00, 0.00,
--     108.00, 108.00, 0.00, 3216.00,
--     3216.00, 0.00, 572.00, 0.00,
--     'upi', 'AI-scanned bill — reviewed and confirmed by manager', true,
--     null, null, null, -- NEW
--     '2026-06-01 15:00:00+00', '2026-06-01 15:10:00+00'
-- ),

-- -- ── B11: PARTIAL — with settlement discount ───────────────────
-- (
--     '2578617e-502d-519a-be6f-6de723728d49', '11111111-1111-1111-1111-111111111111', 'e16d80bc-9ddb-5cd6-9dd1-cf045dcdbf37', '99999999-9999-9999-9999-999999999992',
--     'INV-2026-011', '2026-06-05', '2026-06-20', 'partial',
--     true, false,
--     3000.00, 0.00, 200.00,
--     108.00, 108.00, 0.00, 3016.00,
--     1000.00, 2016.00, 1300.00, 0.00,
--     'mixed', 'Settlement discount given for early part payment', false,
--     null, 'Ramlal (Owner)', null, -- NEW
--     '2026-06-05 10:00:00+00', '2026-06-05 10:15:00+00'
-- ),

-- -- ── B12: ISSUED — card — with line-level discounts ────────────
-- (
--     '399d1284-de4e-5913-84f1-9ba138944f92', '11111111-1111-1111-1111-111111111111', 'ca6a6a20-eff0-50d2-8f64-06d8da87900d', '99999999-9999-9999-9999-999999999992',
--     'INV-2026-012', '2026-06-08', '2026-06-23', 'issued',
--     true, false,
--     7200.00, 0.00, 0.00,
--     648.00, 648.00, 0.00, 8496.00,
--     0.00, 8496.00, 2460.00, 0.00,
--     'credit', 'Ajay Garage bulk order — batteries and filters', false,
--     null, 'Ajay Garage', null, -- NEW
--     '2026-06-08 11:00:00+00', '2026-06-08 11:10:00+00'
-- );

-- -- ============================================================
-- -- 11. BILL LINE ITEMS
-- --     Uses explicit UUIDs for return item linkage
-- -- ============================================================
-- INSERT INTO bill_line_items (
--     id, bill_id, item_id,
--     item_name, hsn_code, qty, unit_price, total_buy_price, line_profit, discount_pct,
--     gst_rate, cgst, sgst, igst, line_total, sort_order, batch_allocations
-- ) VALUES

-- -- ── Lines for B1 (Paid — oil + filter for Honda City) ─────────
-- ('a7e9834a-ac38-5d7f-a580-3a4938906ce6', '83cc95f1-72c7-5c31-bb5f-12707686e761', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--  'Castrol GTX 5W-30 Engine Oil 1L', '27101980', 2, 390.00, 560.00, 220.00, 0, 18.00, 70.20, 70.20, 0, 920.40, 1, '[{"batch_id": "b1111111-1111-1111-1111-111111111111", "qty": 2, "buy_price": 280.00}]'::jsonb),
-- ('6b6e8211-8b67-55a3-9a40-5859bed2dcdd', '83cc95f1-72c7-5c31-bb5f-12707686e761', 'a6e9b350-b2af-588a-98d5-f8408169ae9b',
--  'Mahle Oil Filter (Hyundai i20)', '84212300', 1, 160.00, 95.00, 65.00, 0, 12.00, 9.60, 9.60, 0, 179.20, 2, '[{"batch_id": "b8888888-8888-8888-8888-888888888888", "qty": 1, "buy_price": 95.00}]'::jsonb),
-- ('1af4ae1b-1096-5025-a67b-828d755aa83f', '83cc95f1-72c7-5c31-bb5f-12707686e761', null,
--  'Oil Change Labour', null, 1, 150.00, 0.00, 150.00, 0, 18.00, 13.50, 13.50, 0, 177.00, 3, '[]'::jsonb),

-- -- ── Lines for B2 (Paid — anonymous cash, bulbs) ───────────────
-- ('67027055-f5fe-5759-8942-4b213078cbfb', '65c6e239-9932-584f-a631-f7fe7ee65401', 'e1356b24-47c1-56ff-99e5-7391dc535de0',
--  'Hella H4 60/55W Halogen Bulb (Pair)', '85392110', 1, 290.00, 180.00, 110.00, 0, 5.00, 7.25, 7.25, 0, 304.50, 1, '[{"batch_id": "bccccccc-cccc-cccc-cccc-cccccccccccc", "qty": 1, "buy_price": 180.00}]'::jsonb),

-- -- ── Lines for B3 (Issued — Ajay Garage bulk brakes) ──────────
-- ('6118028c-c00a-5fe1-ada7-b1cbd007b6a2', '9e987f0c-093e-58a8-ab30-9eff014ed0d2', '53dde910-2f45-5c6a-bb03-8a5c33638452',
--  'Bosch Ceramic Front Brake Pads (Honda City)', '87083000', 4, 1350.00, 3400.00, 2000.00, 0, 28.00, 1512.00, 1512.00, 0, 6912.00, 1, '[{"batch_id": "b4444444-4444-4444-4444-444444444444", "qty": 4, "buy_price": 850.00}]'::jsonb),

-- -- ── Lines for B4 (Overdue — City Cabs fleet bulk) ────────────
-- ('45b3a0b4-f3a8-538b-b8f9-199560139458', '9c8d7b8a-5758-533d-8cbf-a6db2e750ffa', '1234bd66-3861-53a0-8a41-fa7195d87be4',
--  'Castrol GTX 10W-40 Engine Oil 5L', '27101980', 5, 1600.00, 5500.00, 2500.00, 0, 18.00, 720.00, 720.00, 0, 9440.00, 1, '[{"batch_id": "b2222222-2222-2222-2222-222222222222", "qty": 5, "buy_price": 1100.00}]'::jsonb),
-- ('a31b3b32-3225-514b-9b2e-f847b3cb1189', '9c8d7b8a-5758-533d-8cbf-a6db2e750ffa', 'e791ede3-30c3-5834-92fc-218b1f841c5c',
--  'Mahle Air Filter (Maruti Swift)', '84213100', 8, 230.00, 1120.00, 720.00, 0, 12.00, 110.40, 110.40, 0, 2276.80, 2, '[{"batch_id": "b7777777-7777-7777-7777-777777777777", "qty": 8, "buy_price": 140.00}]'::jsonb),
-- ('7d3b0939-12a0-54e3-944f-81bbf4d6cd6b', '9c8d7b8a-5758-533d-8cbf-a6db2e750ffa', '8029bc18-b1be-5ce9-bfb8-7914c2a925ca',
--  'Exide Mileage 35Ah Car Battery', '85072000', 1, 3800.00, 2800.00, 1000.00, 0, 5.00, 95.00, 95.00, 0, 3990.00, 3, '[{"batch_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "qty": 1, "buy_price": 2800.00}]'::jsonb),

-- -- ── Lines for B5 (Partial — Priya mixed payment) ──────────────
-- ('a900a6a0-4f06-50e8-b9a1-465845f22063', 'cc55ab27-bed0-5673-b5db-a233c328f0a7', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--  'Castrol GTX 5W-30 Engine Oil 1L', '27101980', 2, 390.00, 560.00, 220.00, 0, 18.00, 70.20, 70.20, 0, 920.40, 1, '[{"batch_id": "b1111111-1111-1111-1111-111111111111", "qty": 2, "buy_price": 280.00}]'::jsonb),
-- ('5459580c-eb9a-5b91-aa33-51b72870bd16', 'cc55ab27-bed0-5673-b5db-a233c328f0a7', '739e3dd7-338a-582a-b1a6-4100086d0e28',
--  'TVS Brake Cable (Hero Splendor)', '87141090', 2, 140.00, 160.00, 120.00, 0, 28.00, 19.60, 19.60, 0, 339.20, 2, '[{"batch_id": "b6666666-6666-6666-6666-666666666666", "qty": 2, "buy_price": 80.00}]'::jsonb),
-- ('84249a61-afba-58f3-95a5-ec16f3fb39bf', 'cc55ab27-bed0-5673-b5db-a233c328f0a7', 'a6e9b350-b2af-588a-98d5-f8408169ae9b',
--  'Mahle Oil Filter (Hyundai i20)', '84212300', 2, 160.00, 190.00, 130.00, 0, 12.00, 19.20, 19.20, 0, 358.40, 3, '[{"batch_id": "b8888888-8888-8888-8888-888888888888", "qty": 2, "buy_price": 95.00}]'::jsonb),

-- -- ── Lines for B6 (Draft) ──────────────────────────────────────
-- ('d9430aa4-a825-5542-8e90-0e3c4b7a8d61', 'dd7b32db-c215-55d9-8e9d-52d80cc727f7', '34ec8efb-b6c8-57db-a8a5-60bb933c8ea0',
--  'Minda Wiper Blade 20" Universal', '85122000', 2, 250.00, 300.00, 200.00, 0, 18.00, 45.00, 45.00, 0, 590.00, 1, '[{"batch_id": "bddddddd-dddd-dddd-dddd-dddddddddddd", "qty": 2, "buy_price": 150.00}]'::jsonb),
-- ('e047b9d4-9fe2-570c-bc6e-98c5fb3a31bb', 'dd7b32db-c215-55d9-8e9d-52d80cc727f7', 'e1356b24-47c1-56ff-99e5-7391dc535de0',
--  'Hella H4 60/55W Halogen Bulb (Pair)', '85392110', 1, 290.00, 180.00, 110.00, 0, 5.00, 7.25, 7.25, 0, 304.50, 2, '[{"batch_id": "bccccccc-cccc-cccc-cccc-cccccccccccc", "qty": 1, "buy_price": 180.00}]'::jsonb),

-- -- ── Lines for B7 (Cancelled — tyre order) ────────────────────
-- ('f36c79a2-cc9d-57a1-9a96-8da35a4cac0c', '054ef1e4-6e5f-5b51-b285-f57d4f942a3f', 'b7fa3360-b671-55ed-827d-a16fb06af7ad',
--  'MRF ZVTS 155/65 R14 Tubeless Tyre', '40111000', 4, 4200.00, 12800.00, 4000.00, 0, 0.00, 0, 0, 0, 16800.00, 1, '[{"batch_id": "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "qty": 4, "buy_price": 3200.00}]'::jsonb),

-- -- ── Lines for B8 (Paid — interstate IGST tyres) ──────────────
-- ('f0f32879-a122-5cd0-b412-a08c4ad6a95c', '05351abb-953e-5ce6-951c-c0326182e3b2', 'b7fa3360-b671-55ed-827d-a16fb06af7ad',
--  'MRF ZVTS 155/65 R14 Tubeless Tyre', '40111000', 4, 4200.00, 12800.00, 4000.00, 0, 0.00, 0, 0, 0, 16800.00, 1, '[{"batch_id": "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "qty": 4, "buy_price": 3200.00}]'::jsonb),

-- -- ── Lines for B9 (Non-GST bill) ───────────────────────────────
-- ('64c34b51-7763-5761-ad81-246f61b881a5', 'f89cb755-2b5c-56a5-b258-d90507b16cd9', '34ec8efb-b6c8-57db-a8a5-60bb933c8ea0',
--  'Minda Wiper Blade 20" Universal', '85122000', 2, 250.00, 300.00, 200.00, 0, 0.00, 0, 0, 0, 500.00, 1, '[{"batch_id": "bddddddd-dddd-dddd-dddd-dddddddddddd", "qty": 2, "buy_price": 150.00}]'::jsonb),
-- ('a3d885f5-4fd1-56e1-84b6-16aca80cb3da', 'f89cb755-2b5c-56a5-b258-d90507b16cd9', null,
--  'Fitting Labour', null, 1, 80.00, 0.00, 0.00, 0, 0.00, 0, 0, 0, 80.00, 2, '[]'::jsonb),

-- -- ── Lines for B10 (AI-parsed — with bill-level discount) ─────
-- ('6a7d757b-a1f5-5526-95de-3c4ef4fee654', '4ecc0706-81bc-5222-8076-410610ae9a95', '53dde910-2f45-5c6a-bb03-8a5c33638452',
--  'Bosch Ceramic Front Brake Pads (Honda City)', '87083000', 2, 1350.00, 1700.00, 730.00, 10.00, 28.00, 194.40, 194.40, 0, 2527.20, 1, '[{"batch_id": "b4444444-4444-4444-4444-444444444444", "qty": 2, "buy_price": 850.00}]'::jsonb),
-- ('20c65adb-4504-577b-a4e2-c76a456b01c4', '4ecc0706-81bc-5222-8076-410610ae9a95', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--  'Castrol GTX 5W-30 Engine Oil 1L', '27101980', 2, 390.00, 560.00, 142.00, 10.00, 18.00, 56.16, 56.16, 0, 702.72, 2, '[{"batch_id": "b1111111-1111-1111-1111-111111111111", "qty": 2, "buy_price": 280.00}]'::jsonb),

-- -- ── Lines for B11 (Partial — settlement discount) ─────────────
-- ('88ad54a4-482a-599c-a33b-f9e50d6cf6c5', '2578617e-502d-519a-be6f-6de723728d49', '1234bd66-3861-53a0-8a41-fa7195d87be4',
--  'Castrol GTX 10W-40 Engine Oil 5L', '27101980', 1, 1600.00, 1100.00, 500.00, 0, 18.00, 288.00, 288.00, 0, 2176.00, 1, '[{"batch_id": "b2222222-2222-2222-2222-222222222222", "qty": 1, "buy_price": 1100.00}]'::jsonb),
-- ('223cf7a4-22b7-5114-b648-5f0432fa507a', '2578617e-502d-519a-be6f-6de723728d49', '8029bc18-b1be-5ce9-bfb8-7914c2a925ca',
--  'Exide Mileage 35Ah Car Battery', '85072000', 1, 3800.00, 2800.00, 1000.00, 0, 5.00, 95.00, 95.00, 0, 3990.00, 2, '[{"batch_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "qty": 1, "buy_price": 2800.00}]'::jsonb),

-- -- ── Lines for B12 (Issued — Ajay Garage batteries + filters) ─
-- ('f8acf98d-c8d2-5fe1-bd7f-52c4895e2b94', '399d1284-de4e-5913-84f1-9ba138944f92', '8029bc18-b1be-5ce9-bfb8-7914c2a925ca',
--  'Exide Mileage 35Ah Car Battery', '85072000', 2, 3800.00, 5600.00, 2000.00, 0, 5.00, 190.00, 190.00, 0, 7990.00, 1, '[{"batch_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "qty": 2, "buy_price": 2800.00}]'::jsonb),
-- ('7b9e8df3-e192-530a-a1d3-7ad95b4ddf55', '399d1284-de4e-5913-84f1-9ba138944f92', '16d8820e-cf12-5f14-9f5b-9d76979ca5dd',
--  'Denso Cabin AC Filter (Toyota Innova)', '84213990', 2, 580.00, 700.00, 460.00, 0, 12.00, 69.60, 69.60, 0, 1299.20, 2, '[{"batch_id": "b9999999-9999-9999-9999-999999999999", "qty": 2, "buy_price": 350.00}]'::jsonb);

-- -- ============================================================
-- -- 12. PAYMENTS
-- --     Multiple instalments on same bill (partial payments)
-- --     Different payment methods
-- --     UPI ref, bank ref, cheque ref
-- -- ============================================================
-- INSERT INTO payments (
--     id, bill_id, tenant_id,
--     amount, method, reference_no, note, receipt_batch_id,
--     recorded_by, paid_at, settlement_discount
-- ) VALUES

-- -- Full payment for B1 (UPI)
-- ('a4f5672c-3d3a-574f-af14-ca9c37cbad39', '83cc95f1-72c7-5c31-bb5f-12707686e761', '11111111-1111-1111-1111-111111111111',
--  1298.00, 'upi', 'UPI202603101234', null, null,
--  '99999999-9999-9999-9999-999999999993', '2026-03-10 10:35:00+00', 0),

-- -- Full payment for B2 (Cash)
-- ('31688ecd-ef66-5949-925b-046e4b0cc1d9', '65c6e239-9932-584f-a631-f7fe7ee65401', '11111111-1111-1111-1111-111111111111',
--  290.00, 'cash', null, null, null,
--  '99999999-9999-9999-9999-999999999993', '2026-03-15 12:05:00+00', 0),

-- -- Partial payment for B5 — first instalment (card)
-- ('2a7b9ea0-866a-54fd-bdf0-7d5af37e15ab', 'cc55ab27-bed0-5673-b5db-a233c328f0a7', '11111111-1111-1111-1111-111111111111',
--  700.00, 'card', 'CARD-TXN-8821', 'First payment — card', 'BATCH-2026-042001',
--  '99999999-9999-9999-9999-999999999993', '2026-04-20 14:05:00+00', 0),

-- -- Partial payment for B5 — second instalment (cash)
-- ('d792f3f9-afb5-5fe0-be2a-0e47f39bf1ef', 'cc55ab27-bed0-5673-b5db-a233c328f0a7', '11111111-1111-1111-1111-111111111111',
--  300.00, 'cash', null, 'Second payment — cash top-up', 'BATCH-2026-042001',
--  '99999999-9999-9999-9999-999999999993', '2026-04-20 14:12:00+00', 0),

-- -- Full payment for B8 (Bank transfer — interstate)
-- ('cd3df7d5-d314-56d7-9fea-bd16b6fa32d4', '05351abb-953e-5ce6-951c-c0326182e3b2', '11111111-1111-1111-1111-111111111111',
--  6400.00, 'bank_transfer', 'NEFT20260518STCO', 'Full payment via NEFT', null,
--  '99999999-9999-9999-9999-999999999992', '2026-05-18 14:00:00+00', 0),

-- -- Full payment for B9 (Cash)
-- ('62aa9f47-1654-58c4-9f98-50ef6345fefd', 'f89cb755-2b5c-56a5-b258-d90507b16cd9', '11111111-1111-1111-1111-111111111111',
--  580.00, 'cash', null, 'Non-GST cash sale', null,
--  '99999999-9999-9999-9999-999999999993', '2026-05-22 13:02:00+00', 0),

-- -- Full payment for B10 (UPI — AI parsed bill)
-- ('fd34e9f2-2e48-5b0d-a8ef-6b3569c75043', '4ecc0706-81bc-5222-8076-410610ae9a95', '11111111-1111-1111-1111-111111111111',
--  3216.00, 'upi', 'UPI202606011890', null, null,
--  '99999999-9999-9999-9999-999999999992', '2026-06-01 15:08:00+00', 0),

-- -- Partial payment for B11 — with settlement discount (cheque)
-- ('2e23a6dc-8ace-56b8-aa09-eb3ff5b909d7', '2578617e-502d-519a-be6f-6de723728d49', '11111111-1111-1111-1111-111111111111',
--  1000.00, 'cheque', 'CHQ-SBI-0099123', 'Advance cheque payment', null,
--  '99999999-9999-9999-9999-999999999992', '2026-06-05 10:10:00+00', 200.00);


-- -- ============================================================
-- -- 13. SALES RETURNS
-- --     Cash refund, UPI refund, credit note
-- --     Return of specific items via sales_return_items
-- -- ============================================================
-- INSERT INTO sales_returns (
--     id, tenant_id, original_bill_id, credit_note_bill_id,
--     reason, refund_amount, refund_method,
--     created_by, created_at
-- ) VALUES

-- -- SR1: Customer returned wrong oil filter — UPI refund
-- (
--     '8a7bb56d-94cc-5134-abdf-dffc6b252a75',
--     '11111111-1111-1111-1111-111111111111',
--     '83cc95f1-72c7-5c31-bb5f-12707686e761', null,
--     'Customer bought wrong oil filter — does not fit Hyundai i20 diesel', 179.20, 'bank_transfer',
--     '99999999-9999-9999-9999-999999999992', '2026-03-12 11:00:00+00'
-- ),

-- -- SR2: Defective brake pads returned from B3 — cash refund
-- (
--     'a481483d-6205-5b3a-a495-a24d3478b98a',
--     '11111111-1111-1111-1111-111111111111',
--     '9e987f0c-093e-58a8-ab30-9eff014ed0d2', null,
--     'One set of brake pads had defective backing plate', 1728.00, 'cash',
--     '99999999-9999-9999-9999-999999999992', '2026-04-05 10:30:00+00'
-- ),

-- -- SR3: Credit note issued for disputed overdue bill
-- (
--     '83f974b9-5abb-5a04-bdd2-9ebb3b578e6b',
--     '11111111-1111-1111-1111-111111111111',
--     '9c8d7b8a-5758-533d-8cbf-a6db2e750ffa', null,
--     'City Cabs disputed battery — tested and confirmed defective. Credit note issued.', 3990.00, 'credit_note',
--     '99999999-9999-9999-9999-999999999991', '2026-03-20 14:00:00+00'
-- );

-- INSERT INTO sales_return_items (
--     id, sales_return_id, bill_line_item_id, item_id, return_qty, refund_amount, return_batch_allocations
-- ) VALUES

-- -- SR1 items — oil filter returned
-- ('c099ecaa-66b7-50a6-b997-5351d843a9d1',
--  '8a7bb56d-94cc-5134-abdf-dffc6b252a75',
--  '6b6e8211-8b67-55a3-9a40-5859bed2dcdd',
--  'a6e9b350-b2af-588a-98d5-f8408169ae9b',
--  1, 179.20, '[{"batch_id": "b8888888-8888-8888-8888-888888888888", "qty": 1, "buy_price": 95.00}]'::jsonb),

-- -- SR2 items — 1 set of brake pads returned from B3
-- ('5d190877-a92e-50a8-9ad6-62de7fec627f',
--  'a481483d-6205-5b3a-a495-a24d3478b98a',
--  '6118028c-c00a-5fe1-ada7-b1cbd007b6a2',
--  '53dde910-2f45-5c6a-bb03-8a5c33638452',
--  1, 1728.00, '[{"batch_id": "b4444444-4444-4444-4444-444444444444", "qty": 1, "buy_price": 850.00}]'::jsonb),

-- -- SR3 items — 1 battery returned from B4
-- ('fbf19f7b-c451-529c-8075-336a8ccbd1f0',
--  '83f974b9-5abb-5a04-bdd2-9ebb3b578e6b',
--  '7d3b0939-12a0-54e3-944f-81bbf4d6cd6b',
--  '8029bc18-b1be-5ce9-bfb8-7914c2a925ca',
--  1, 3990.00, '[{"batch_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "qty": 1, "buy_price": 2800.00}]'::jsonb);


-- -- ============================================================
-- -- 14. PURCHASE ORDERS
-- --     Covers ALL 5 statuses: draft, sent, partial, received, cancelled
-- --     Intrastate and interstate (IGST)
-- --     GST and non-GST supply
-- --     With and without discount
-- -- ============================================================

-- INSERT INTO purchase_orders (
--     id, tenant_id, supplier_id, created_by,
--     po_number, status, payment_status, payment_method,
--     is_gst_supply, is_interstate,
--     subtotal, discount_amount, settlement_discount,
--     cgst_total, sgst_total, igst_total, total_amount,
--     amount_paid, amount_due, round_off,
--     order_date, expected_date, received_date, notes, 
--     vehicle_no, reference_name, terms_conditions, -- NEW FIELDS
--     created_at
-- ) VALUES

-- -- PO1: RECEIVED & FULLY PAID — lubricants from local supplier
-- (
--     '90307423-a57e-5bae-93a5-79738b54b59e', '11111111-1111-1111-1111-111111111111', '8fb61d01-9724-5c10-b362-9ff388b488d8', '99999999-9999-9999-9999-999999999991',
--     'PO-2026-001', 'received', 'paid', 'bank_transfer',
--     true, false,
--     28000.00, 0.00, 0.00,
--     2520.00, 2520.00, 0.00, 33040.00,
--     33040.00, 0.00, 0.00,
--     '2026-03-05', '2026-03-08', '2026-03-07', 'Monthly Castrol stock replenishment', 
--     'DL-1L-TB-8888', 'Delhi Freight Carriers', 'Handle with care. Oil drums.', -- NEW
--     now() - INTERVAL '3 months'
-- ),

-- -- PO2: SENT — awaiting delivery from Bosch supplier
-- (
--     'e384ec84-f890-5e82-849d-5a8113cfef2c', '11111111-1111-1111-1111-111111111111', '3e6aeffb-4461-5cb7-8d49-a5e6e516f5cf', '99999999-9999-9999-9999-999999999992',
--     'PO-2026-002', 'sent', 'unpaid', 'credit',
--     true, false,
--     30000.00, 0.00, 0.00,
--     2700.00, 2700.00, 0.00, 35400.00,
--     0.00, 35400.00, 0.00,
--     '2026-05-20', '2026-05-25', null, 'Brake pads and filters restock', 
--     null, null, null, -- NEW
--     now() - INTERVAL '1 month'
-- ),

-- -- PO3: PARTIAL — interstate purchase from MRF (IGST)
-- (
--     '4c362d8d-49bc-5885-9b35-141e7e89d43c', '11111111-1111-1111-1111-111111111111', 'f21ef35e-caec-5034-a561-a8740f29adb5', '99999999-9999-9999-9999-999999999991',
--     'PO-2026-003', 'partial', 'partial', 'cash',
--     true, true,
--     19200.00, 0.00, 0.00,
--     0.00, 0.00, 0.00, 19200.00,
--     9600.00, 9600.00, 0.00,
--     '2026-05-28', '2026-06-02', null, '8 tyres ordered, 4 delivered so far', 
--     'UP-32-GT-1122', 'VRL Logistics', 'Check tyre manufacturing date before accepting.', -- NEW
--     now() - INTERVAL '15 days'
-- ),

-- -- PO4: DRAFT — planning stage
-- (
--     '0a8967d5-86c4-5bc4-823d-2dff92b9240a', '11111111-1111-1111-1111-111111111111', '3759d65b-fc2f-54fc-a4eb-004ac8921272', '99999999-9999-9999-9999-999999999992',
--     'PO-2026-004', 'draft', 'unpaid', 'cash',
--     false, false,
--     4500.00, 0.00, 0.00,
--     0.00, 0.00, 0.00, 4500.00,
--     0.00, 4500.00, 0.00,
--     '2026-06-08', '2026-06-10', null, 'Miscellaneous small parts from local market', 
--     null, 'Self Pickup', null, -- NEW
--     now() - INTERVAL '2 days'
-- ),

-- -- PO5: CANCELLED — supplier could not fulfil
-- (
--     'f5205ee6-2633-5fcf-b41b-f2bb0f70c85d', '11111111-1111-1111-1111-111111111111', '3e6aeffb-4461-5cb7-8d49-a5e6e516f5cf', '99999999-9999-9999-9999-999999999992',
--     'PO-2026-005', 'cancelled', 'unpaid', 'credit',
--     true, false,
--     15000.00, 0.00, 0.00,
--     1350.00, 1350.00, 0.00, 17700.00,
--     0.00, 0.00, 0.00,
--     '2026-04-10', '2026-04-15', null, 'Cancelled — Bosch could not supply Hyundai-specific pads', 
--     null, null, null, -- NEW
--     now() - INTERVAL '2 months'
-- ),

-- -- PO6: RECEIVED & PARTIALLY PAID — with discount
-- (
--     '3a98e561-8b95-5fce-90c8-e8253ed907ad', '11111111-1111-1111-1111-111111111111', '8fb61d01-9724-5c10-b362-9ff388b488d8', '99999999-9999-9999-9999-999999999991',
--     'PO-2026-006', 'received', 'partial', 'mixed',
--     true, false,
--     12000.00, 500.00, 0.00,
--     1035.00, 1035.00, 0.00, 13570.00,
--     8000.00, 5570.00, 0.00,
--     '2026-06-01', '2026-06-04', '2026-06-04', 'Received with supplier discount — balance to be paid end of month', 
--     'MH-48-TT-0099', 'Castrol Direct Delivery', null, -- NEW
--     now() - INTERVAL '9 days'
-- );

-- -- ============================================================
-- -- 15. PO LINE ITEMS
-- -- ============================================================
-- INSERT INTO po_line_items (
--     id, po_id, item_id, item_name,
--     qty_ordered, qty_received, unit_cost,
--     discount_pct, gst_rate, cgst, sgst, igst, line_total
-- ) VALUES

-- -- PO1 lines — Castrol oils received
-- ('c115e1da-2bd7-52d9-a1c0-2c88feadd530', '90307423-a57e-5bae-93a5-79738b54b59e', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--  'Castrol GTX 5W-30 Engine Oil 1L', 60, 60, 280.00, 0, 18.00, 3024.00, 3024.00, 0, 19792.00),
-- ('09d47a95-8995-5715-80fa-b403a6bc25ac', '90307423-a57e-5bae-93a5-79738b54b59e', '1234bd66-3861-53a0-8a41-fa7195d87be4',
--  'Castrol GTX 10W-40 Engine Oil 5L', 10, 10, 1100.00, 0, 18.00, 1980.00, 1980.00, 0, 14960.00),

-- -- PO2 lines — Bosch brakes + filters (sent, not yet received)
-- ('7f866ebf-8088-5639-bcec-01f23fe35117', 'e384ec84-f890-5e82-849d-5a8113cfef2c', '53dde910-2f45-5c6a-bb03-8a5c33638452',
--  'Bosch Ceramic Front Brake Pads (Honda City)', 20, 0, 850.00, 0, 28.00, 4760.00, 4760.00, 0, 24520.00),
-- ('227ff2b6-5332-5967-8010-f4784657fffa', 'e384ec84-f890-5e82-849d-5a8113cfef2c', 'e791ede3-30c3-5834-92fc-218b1f841c5c',
--  'Mahle Air Filter (Maruti Swift)', 25, 0, 140.00, 0, 12.00, 420.00, 420.00, 0, 4040.00),

-- -- PO3 lines — MRF tyres (partial: 4 of 8 received)
-- ('31c085a1-2da8-5cd6-9876-c4c98bebe030', '4c362d8d-49bc-5885-9b35-141e7e89d43c', 'b7fa3360-b671-55ed-827d-a16fb06af7ad',
--  'MRF ZVTS 155/65 R14 Tubeless Tyre', 8, 4, 3200.00, 0, 0.00, 0, 0, 0, 25600.00),

-- -- PO4 lines — miscellaneous local purchase (draft)
-- ('e08be2fe-1dec-5295-b219-1ddcafed9ff8', '0a8967d5-86c4-5bc4-823d-2dff92b9240a', null,
--  'Wiper Blade Assorted 18"', 10, 0, 120.00, 0, 0.00, 0, 0, 0, 1200.00),
-- ('5cc29417-792d-5894-82b2-5a507d204f5f', '0a8967d5-86c4-5bc4-823d-2dff92b9240a', null,
--  'Brake Fluid DOT 3 500ml', 15, 0, 110.00, 0, 0.00, 0, 0, 0, 1650.00),
-- ('92286433-56cc-5460-9b74-5b7cc7b15500', '0a8967d5-86c4-5bc4-823d-2dff92b9240a', null,
--  'Coolant Antifreeze 1L', 15, 0, 110.00, 0, 0.00, 0, 0, 0, 1650.00),

-- -- PO5 lines — cancelled order
-- ('3f6f4130-1822-5ee3-9dc8-d14db2e426d1', 'f5205ee6-2633-5fcf-b41b-f2bb0f70c85d', '53dde910-2f45-5c6a-bb03-8a5c33638452',
--  'Bosch Ceramic Front Brake Pads (Honda City)', 10, 0, 850.00, 0, 28.00, 2380.00, 2380.00, 0, 12260.00),

-- -- PO6 lines — Castrol received with discount
-- ('65554bb3-de8a-520a-bf1e-0d2a9a1c689f', '3a98e561-8b95-5fce-90c8-e8253ed907ad', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--  'Castrol GTX 5W-30 Engine Oil 1L', 30, 30, 280.00, 0, 18.00, 1512.00, 1512.00, 0, 9912.00),
-- ('154fc56f-c328-5adb-85a8-720db1a46af4', '3a98e561-8b95-5fce-90c8-e8253ed907ad', 'a6485f3f-6236-56fa-bb1a-b24f7452f799',
--  'Castrol Activ 4T 20W-40 Bike Oil 0.9L', 20, 20, 160.00, 0, 18.00, 576.00, 576.00, 0, 4352.00);

-- -- ============================================================
-- -- 16. SUPPLIER PAYMENTS
-- -- ============================================================
-- INSERT INTO supplier_payments (
--     id, po_id, tenant_id,
--     amount, method, reference_no, note, receipt_batch_id,
--     recorded_by, paid_at, settlement_discount
-- ) VALUES

-- -- Full payment for PO1 (bank transfer)
-- ('5e497df6-5851-5c01-ba02-928ecb21f2e7', '90307423-a57e-5bae-93a5-79738b54b59e', '11111111-1111-1111-1111-111111111111',
--  33040.00, 'bank_transfer', 'NEFT20260307RAP', 'Full payment for Castrol March stock', null,
--  '99999999-9999-9999-9999-999999999991', '2026-03-07 15:00:00+00', 0),

-- -- Partial payments for PO3 (tyre advance + balance pending)
-- ('351b66c9-417b-5a63-bf8f-fa81cd25f1c0', '4c362d8d-49bc-5885-9b35-141e7e89d43c', '11111111-1111-1111-1111-111111111111',
--  9600.00, 'cash', null, 'Advance payment for 4 tyres delivered', null,
--  '99999999-9999-9999-9999-999999999991', '2026-06-02 10:00:00+00', 0),

-- -- Partial payment for PO6 (mixed: bank + cash)
-- ('d6eb26ab-b5db-582e-bf9c-a0528f181cf0', '3a98e561-8b95-5fce-90c8-e8253ed907ad', '11111111-1111-1111-1111-111111111111',
--  6000.00, 'bank_transfer', 'NEFT20260604RAP', 'Partial bank payment for June Castrol stock', null,
--  '99999999-9999-9999-9999-999999999991', '2026-06-04 12:00:00+00', 0),
-- ('4446a29f-0c83-5b34-ad6b-d48285b32fd8', '3a98e561-8b95-5fce-90c8-e8253ed907ad', '11111111-1111-1111-1111-111111111111',
--  2000.00, 'cash', null, 'Cash top-up', null,
--  '99999999-9999-9999-9999-999999999991', '2026-06-04 16:00:00+00', 0);

-- -- ============================================================
-- -- 17. PURCHASE RETURNS
-- -- ============================================================
-- INSERT INTO purchase_returns (
--     id, tenant_id, original_po_id,
--     reason, refund_amount, refund_method,
--     created_by, created_at
-- ) VALUES
-- (
--     'c352edf7-6c72-5358-959f-b27860049302',
--     '11111111-1111-1111-1111-111111111111',
--     '90307423-a57e-5bae-93a5-79738b54b59e',
--     'Two Castrol 5W-30 bottles had damaged seals — returned to supplier for credit', 560.00, 'credit_note',
--     '99999999-9999-9999-9999-999999999991', '2026-03-09 10:00:00+00'
-- );

-- INSERT INTO purchase_return_items (
--     id, purchase_return_id, po_line_item_id, item_id, item_name, return_qty, refund_amount
-- ) VALUES
-- (
--     '30f9b615-4181-5305-a945-9e6a45cca672',
--     'c352edf7-6c72-5358-959f-b27860049302',
--     'c115e1da-2bd7-52d9-a1c0-2c88feadd530',
--     '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa',
--     'Castrol GTX 5W-30 Engine Oil 1L',
--     2, 560.00
-- );


-- -- ============================================================
-- -- 18. TO PURCHASE LIST (Kanban Sticky Notes)
-- -- ============================================================
-- INSERT INTO to_purchase_list (
--     id, tenant_id, item_id, item_name,
--     supplier_id, qty_needed, notes, created_by, created_at
-- ) VALUES
-- ('bb3b0ef9-d09a-5c66-af5c-fcb1acd1a6d8', '11111111-1111-1111-1111-111111111111',
--  'a6485f3f-6236-56fa-bb1a-b24f7452f799', 'Castrol Activ 4T 20W-40 Bike Oil 0.9L',
--  '8fb61d01-9724-5c10-b362-9ff388b488d8', 30, 'Urgent — only 7 left, below threshold',
--  '99999999-9999-9999-9999-999999999992', now() - INTERVAL '1 day'),

-- ('d24ff7fd-5ddd-508b-9b50-075bea30ebc9', '11111111-1111-1111-1111-111111111111',
--  '53dde910-2f45-5c6a-bb03-8a5c33638452', 'Bosch Ceramic Front Brake Pads (Honda City)',
--  '3e6aeffb-4461-5cb7-8d49-a5e6e516f5cf', 10, 'Only 3 left — check with Bosch rep for new pricing',
--  '99999999-9999-9999-9999-999999999992', now() - INTERVAL '2 days'),

-- ('7b107401-642c-54e3-8300-7ea50aaf1cd8', '11111111-1111-1111-1111-111111111111',
--  'acdfc299-fd14-5d45-9a25-919eaafc1153', 'Bosch Rear Brake Drum (Maruti Alto)',
--  '3e6aeffb-4461-5cb7-8d49-a5e6e516f5cf', 5, 'Out of stock — customer waiting',
--  '99999999-9999-9999-9999-999999999991', now() - INTERVAL '3 days'),

-- ('4b5ac5b7-9175-5e3d-9d02-b43e47577805', '11111111-1111-1111-1111-111111111111',
--  null, 'Brake Fluid DOT 4 500ml',
--  null, 10, 'No specific supplier yet — check Sharma or Bosch',
--  '99999999-9999-9999-9999-999999999992', now());

-- -- ============================================================
-- -- 19. EXPENSE CATEGORIES
-- -- ============================================================
-- INSERT INTO expense_categories (id, tenant_id, name, is_default)
-- VALUES
-- ('a8b55214-f720-50b4-8c5a-f70cb40d75fd', '11111111-1111-1111-1111-111111111111', 'Rent',                    true),
-- ('bccef844-b08b-53b4-9af8-fb354022a2f2', '11111111-1111-1111-1111-111111111111', 'Salary & Wages',           true),
-- ('ee275f0c-2a6e-54fe-a869-96f1f9ae0adb', '11111111-1111-1111-1111-111111111111', 'Electricity',              true),
-- ('dd9224b7-4a85-50f1-b82c-d7f4082cca7c', '11111111-1111-1111-1111-111111111111', 'Internet & Phone',         true),
-- ('f3a6f46d-8427-5698-9fda-4e578b2def19', '11111111-1111-1111-1111-111111111111', 'Vehicle / Transport',      true),
-- ('0086662f-4c02-5022-9619-c2030923de99', '11111111-1111-1111-1111-111111111111', 'Stationary & Packaging',   true),
-- ('8b014cd7-b191-5c47-9b8a-c8a544a86b62', '11111111-1111-1111-1111-111111111111', 'Advertising',              true),
-- ('81d04269-db20-5907-9e1e-43965f339db1', '11111111-1111-1111-1111-111111111111', 'GST / Tax Payment',        true),
-- ('71101787-b212-59e4-a0cb-9e9cb9855913', '11111111-1111-1111-1111-111111111111', 'Shop Maintenance',         false),
-- ('82494299-664c-50e8-83ba-c21d51b40d46', '11111111-1111-1111-1111-111111111111', 'Miscellaneous',            false);


-- -- ============================================================
-- -- 20. EXPENSES
-- --     All payment methods covered
-- --     Multiple categories
-- --     With and without receipt
-- -- ============================================================
-- INSERT INTO expenses (
--     id, tenant_id, category_id, recorded_by,
--     description, amount, payment_method, expense_date, receipt_url, created_at
-- ) VALUES

-- ('f43a29ea-9e31-59d2-9647-acbd889dae1f', '11111111-1111-1111-1111-111111111111',
--  'a8b55214-f720-50b4-8c5a-f70cb40d75fd', '99999999-9999-9999-9999-999999999991',
--  'March Shop Rent', 28000.00, 'bank_transfer', '2026-03-01', null, now() - INTERVAL '3 months'),

-- ('898c8fce-3c9a-509a-8d65-812e2f119bfa', '11111111-1111-1111-1111-111111111111',
--  'bccef844-b08b-53b4-9af8-fb354022a2f2', '99999999-9999-9999-9999-999999999991',
--  'March Staff Salaries — Rahul, Amit', 45000.00, 'bank_transfer', '2026-03-31', null, now() - INTERVAL '2 months 10 days'),

-- ('1255c900-93f2-5b32-98fc-3e278053fda3', '11111111-1111-1111-1111-111111111111',
--  'ee275f0c-2a6e-54fe-a869-96f1f9ae0adb', '99999999-9999-9999-9999-999999999991',
--  'Electricity Bill — March', 5200.00, 'upi', '2026-03-31',
--  'https://storage.supabase.co/receipts/exp-electricity-march.jpg', now() - INTERVAL '2 months 10 days'),

-- ('62e06997-0d64-5481-b8e1-9b68109a6bb3', '11111111-1111-1111-1111-111111111111',
--  'dd9224b7-4a85-50f1-b82c-d7f4082cca7c', '99999999-9999-9999-9999-999999999991',
--  'Jio Business Broadband — April', 1800.00, 'upi', '2026-04-05', null, now() - INTERVAL '2 months'),

-- ('d9ad47b9-e4d3-51fc-9d49-7a48c31e27aa', '11111111-1111-1111-1111-111111111111',
--  'a8b55214-f720-50b4-8c5a-f70cb40d75fd', '99999999-9999-9999-9999-999999999991',
--  'April Shop Rent', 28000.00, 'bank_transfer', '2026-04-01', null, now() - INTERVAL '2 months'),

-- ('9b435ee6-367a-5250-ba1b-db48c26eaad2', '11111111-1111-1111-1111-111111111111',
--  '8b014cd7-b191-5c47-9b8a-c8a544a86b62', '99999999-9999-9999-9999-999999999991',
--  'WhatsApp Business API monthly fee', 999.00, 'card', '2026-04-10', null, now() - INTERVAL '2 months'),

-- ('3dc9ce9d-cd01-58b9-aaea-26b8f5aa1d0d', '11111111-1111-1111-1111-111111111111',
--  '71101787-b212-59e4-a0cb-9e9cb9855913', '99999999-9999-9999-9999-999999999992',
--  'Counter repair — broken shelf bracket', 2400.00, 'cash', '2026-05-06', null, now() - INTERVAL '1 month 5 days'),

-- ('cdb380ec-2f17-571d-8463-07df3360292b', '11111111-1111-1111-1111-111111111111',
--  'f3a6f46d-8427-5698-9fda-4e578b2def19', '99999999-9999-9999-9999-999999999991',
--  'Delivery vehicle diesel — May', 3800.00, 'cash', '2026-05-20', null, now() - INTERVAL '20 days'),

-- ('d2410f74-cead-5884-a085-39ed5d06c865', '11111111-1111-1111-1111-111111111111',
--  '81d04269-db20-5907-9e1e-43965f339db1', '99999999-9999-9999-9999-999999999991',
--  'GST Q4 Payment to government', 18400.00, 'bank_transfer', '2026-04-20',
--  'https://storage.supabase.co/receipts/gst-q4-challan.pdf', now() - INTERVAL '1 month 20 days'),

-- ('9eead68e-6536-5d57-ad91-587c6812a4f4', '11111111-1111-1111-1111-111111111111',
--  '82494299-664c-50e8-83ba-c21d51b40d46', '99999999-9999-9999-9999-999999999993',
--  'Cleaning supplies and brooms', 680.00, 'cash', '2026-06-03', null, now() - INTERVAL '7 days');


-- -- ============================================================
-- -- 21. DAILY SUMMARIES (Pre-aggregated P&L)
-- -- ============================================================
-- INSERT INTO daily_summaries (
--     id, tenant_id, summary_date,
--     total_sales, total_collections, total_expenses, total_purchases,
--     gst_collected, gst_paid, bill_count,
--     gross_profit, net_profit
-- ) VALUES

-- ('a9da3402-d014-51a9-b1b4-f5ddf8cf0f1a', '11111111-1111-1111-1111-111111111111', '2026-03-01',
--  0.00, 0.00, 28000.00, 33040.00, 0.00, 5040.00, 0, 0.00, -28000.00),

-- ('c4a8ae2a-5520-5229-8202-c04b3c6e7953', '11111111-1111-1111-1111-111111111111', '2026-03-10',
--  1298.00, 1298.00, 0.00, 0.00, 198.00, 0.00, 1, 550.00, 550.00),

-- ('27ef8800-4b4c-5f02-8752-4faad046d0c6', '11111111-1111-1111-1111-111111111111', '2026-03-15',
--  290.00, 290.00, 0.00, 0.00, 14.50, 0.00, 1, 110.00, 110.00),

-- ('2c894a20-ca6f-5122-8d5e-6722523aef23', '11111111-1111-1111-1111-111111111111', '2026-03-31',
--  0.00, 0.00, 50200.00, 0.00, 0.00, 0.00, 0, 0.00, -50200.00),

-- ('fab75583-eed3-5bc4-b771-c5aad9885fe7', '11111111-1111-1111-1111-111111111111', '2026-04-02',
--  7080.00, 0.00, 0.00, 0.00, 1080.00, 0.00, 1, 2100.00, 2100.00),

-- ('485c80bd-dc39-5346-8e71-092262aeed22', '11111111-1111-1111-1111-111111111111', '2026-04-20',
--  1652.00, 1000.00, 1800.00, 0.00, 252.00, 0.00, 1, 440.00, -1360.00),

-- ('fd5d83de-2a4c-52fc-8eee-fc1474c1aee3', '11111111-1111-1111-1111-111111111111', '2026-05-18',
--  6400.00, 6400.00, 0.00, 0.00, 0.00, 0.00, 1, 4800.00, 4800.00),

-- ('c490c0af-c064-514b-befd-4eded83530d0', '11111111-1111-1111-1111-111111111111', '2026-05-22',
--  580.00, 580.00, 0.00, 0.00, 0.00, 0.00, 1, 200.00, 200.00),

-- ('b8fa68ef-33f4-5128-b8d7-1bee77342b0e', '11111111-1111-1111-1111-111111111111', '2026-06-01',
--  3216.00, 3216.00, 0.00, 0.00, 216.00, 0.00, 1, 1200.00, 1200.00),

-- ('393e1c9d-9c88-56b2-b6d2-95f65df7f62d', '11111111-1111-1111-1111-111111111111', '2026-06-03',
--  0.00, 0.00, 680.00, 0.00, 0.00, 0.00, 0, 0.00, -680.00),

-- ('ee50cc5f-1665-521d-ab59-950a31d4cde0', '11111111-1111-1111-1111-111111111111', '2026-06-05',
--  3016.00, 1000.00, 0.00, 13570.00, 216.00, 2070.00, 1, 900.00, 900.00),

-- ('f09bb29b-963c-5fc3-a76f-66b3fa272ec2', '11111111-1111-1111-1111-111111111111', '2026-06-08',
--  8496.00, 0.00, 0.00, 0.00, 1296.00, 0.00, 1, 3200.00, 3200.00);


-- -- ============================================================
-- -- 22. CASH BOOK
-- --     Opening balance, sales collections, purchase payments,
-- --     expense payments, manual adjustment, owner withdrawal
-- --     All cash_reference_type values covered
-- -- ============================================================
-- INSERT INTO cash_book (
--     id, tenant_id, recorded_by,
--     entry_date, type, amount, description,
--     reference_type, reference_id, balance_after, created_at
-- ) VALUES

-- -- March 1: Opening balance
-- ('75aec669-4b0f-5c9d-8a50-092b4f5ab9f3', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-03-01 08:00:00+00', 'in', 15000.00, 'Opening cash balance for the month',
--  'manual', null, 15000.00, '2026-03-01 08:00:00+00'),

-- -- March 7: Supplier payment for PO1
-- ('6bc26cf4-555b-593e-ad7e-e03a35c89b84', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-03-07 15:00:00+00', 'out', 3040.00, 'Cash portion of PO-2026-001 payment to Castrol Delhi',
--  'single_purchase', '90307423-a57e-5bae-93a5-79738b54b59e', 11960.00, '2026-03-07 15:00:00+00'),

-- -- March 10: Sale collection for B1
-- ('2d8ee911-06a2-5f2c-82d3-be20da370081', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999993',
--  '2026-03-10 10:40:00+00', 'in', 1298.00, 'UPI collection — INV-2026-001 (Priya Mehra)',
--  'single_sale', '83cc95f1-72c7-5c31-bb5f-12707686e761', 13258.00, '2026-03-10 10:40:00+00'),

-- -- March 15: Cash sale for B2
-- ('8b726a16-2fd0-5943-ab4e-dbf458070e40', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999993',
--  '2026-03-15 12:05:00+00', 'in', 290.00, 'Cash sale — INV-2026-002 (Walk-in bulbs)',
--  'single_sale', '65c6e239-9932-584f-a631-f7fe7ee65401', 13548.00, '2026-03-15 12:05:00+00'),

-- -- March 31: Salary expense
-- ('95c1da08-dc8f-5c95-aae5-37e42c4994db', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-03-31 18:00:00+00', 'out', 45000.00, 'March staff salaries (bank transfer recorded here)',
--  'expense', '898c8fce-3c9a-509a-8d65-812e2f119bfa', -31452.00, '2026-03-31 18:00:00+00'),

-- -- April 20: Partial cash collection for B5
-- ('efff61f9-c898-5f21-ab11-32810c6e8591', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999993',
--  '2026-04-20 14:12:00+00', 'in', 300.00, 'Cash top-up — INV-2026-005 (Priya Mehra partial)',
--  'single_sale', 'cc55ab27-bed0-5673-b5db-a233c328f0a7', -31152.00, '2026-04-20 14:12:00+00'),

-- -- May 6: Maintenance cash expense
-- ('761b7414-277c-58ce-935a-1af9c9947db0', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999992',
--  '2026-05-06 11:00:00+00', 'out', 2400.00, 'Counter repair — cash payment to carpenter',
--  'expense', '3dc9ce9d-cd01-58b9-aaea-26b8f5aa1d0d', -33552.00, '2026-05-06 11:00:00+00'),

-- -- May 20: Diesel for delivery van
-- ('7cabcf3c-4025-5867-97b4-173f974445b5', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-05-20 09:00:00+00', 'out', 3800.00, 'Delivery vehicle diesel refill',
--  'expense', 'cdb380ec-2f17-571d-8463-07df3360292b', -37352.00, '2026-05-20 09:00:00+00'),

-- -- May 22: Non-GST cash bill collection
-- ('fcf87d49-c6d7-553d-848f-759709af3e9f', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999993',
--  '2026-05-22 13:02:00+00', 'in', 580.00, 'Cash sale — INV-2026-009 (Walk-in wipers+labour)',
--  'single_sale', 'f89cb755-2b5c-56a5-b258-d90507b16cd9', -36772.00, '2026-05-22 13:02:00+00'),

-- -- June 2: Tyre supplier partial cash payment
-- ('366e66f5-f452-5f54-8cdb-643421755e7e', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-06-02 10:00:00+00', 'out', 9600.00, 'Tyre advance — PO-2026-003 (MRF 4 tyres delivered)',
--  'single_purchase', '4c362d8d-49bc-5885-9b35-141e7e89d43c', -46372.00, '2026-06-02 10:00:00+00'),

-- -- June 3: Cash expense cleaning supplies
-- ('5877c8f7-0af9-5473-ad94-e059ddaaf6f5', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999993',
--  '2026-06-03 14:00:00+00', 'out', 680.00, 'Cleaning supplies — cash',
--  'expense', '9eead68e-6536-5d57-ad91-587c6812a4f4', -47052.00, '2026-06-03 14:00:00+00'),

-- -- June 5: Partial cheque payment received
-- ('c75a295f-fa56-53d5-bc66-6c3fb56a6b0b', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999992',
--  '2026-06-05 10:10:00+00', 'in', 1000.00, 'Cheque deposit — INV-2026-011 (Ram Lal Mechanics)',
--  'single_sale', '2578617e-502d-519a-be6f-6de723728d49', -46052.00, '2026-06-05 10:10:00+00'),

-- -- June 4: PO6 cash portion
-- ('5405ac20-1b67-5d31-9b24-1afaf5151039', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-06-04 16:00:00+00', 'out', 2000.00, 'Cash top-up for PO-2026-006 (Castrol June)',
--  'single_purchase', '3a98e561-8b95-5fce-90c8-e8253ed907ad', -48052.00, '2026-06-04 16:00:00+00'),

-- -- Owner's end-of-week cash withdrawal
-- ('a0a60082-3681-5271-a5b3-ff708555410a', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991',
--  '2026-06-07 19:00:00+00', 'out', 5000.00, 'Owner withdrew cash at end of week',
--  'manual', null, -53052.00, '2026-06-07 19:00:00+00');

-- -- ============================================================
-- -- 23. MOCK STOCK MOVEMENTS (For Dashboard Testing)
-- -- ============================================================

-- INSERT INTO stock_movements (
--     tenant_id, item_id, type, qty_change, qty_before, qty_after, reference_type, created_at
-- ) VALUES
-- -- Fake some incoming stock 25 days ago
-- ('11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'purchase', 50, 0, 50, 'purchase_order', now() - INTERVAL '25 days'),
-- ('11111111-1111-1111-1111-111111111111', '53dde910-2f45-5c6a-bb03-8a5c33638452', 'purchase', 20, 0, 20, 'purchase_order', now() - INTERVAL '25 days'),

-- -- Fake daily sales for Castrol GTX 5W-30 (Making it a "Top Runner")
-- ('11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'sale', -2, 50, 48, 'bill', now() - INTERVAL '20 days'),
-- ('11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'sale', -5, 48, 43, 'bill', now() - INTERVAL '15 days'),
-- ('11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'sale', -4, 43, 39, 'bill', now() - INTERVAL '10 days'),
-- ('11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'sale', -8, 39, 31, 'bill', now() - INTERVAL '2 days'),

-- -- Fake some sales for Bosch Brake Pads (Making it show an accurate runway)
-- ('11111111-1111-1111-1111-111111111111', '53dde910-2f45-5c6a-bb03-8a5c33638452', 'sale', -4, 20, 16, 'bill', now() - INTERVAL '18 days'),
-- ('11111111-1111-1111-1111-111111111111', '53dde910-2f45-5c6a-bb03-8a5c33638452', 'sale', -13, 16, 3, 'bill', now() - INTERVAL '5 days'),

-- -- Fake a shrinkage adjustment (Quality Control check)
-- ('11111111-1111-1111-1111-111111111111', '5bdd5c70-fd8e-50c6-8fa3-1ebcaae2ecaa', 'adjustment', -1, 31, 30, 'manual_adjustment', now() - INTERVAL '1 day');