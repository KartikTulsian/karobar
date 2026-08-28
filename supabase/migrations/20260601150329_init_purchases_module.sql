-- ==========================================
-- 1. Create ENUMs for Purchases
-- ==========================================
CREATE TYPE purchase_order_status AS ENUM ('draft', 'sent', 'partial', 'received', 'cancelled');
CREATE TYPE purchase_refund_method AS ENUM ('cash', 'upi', 'bank_transfer', 'credit_note');
CREATE TYPE purchase_payment_status AS ENUM ('unpaid', 'paid', 'partial', 'cancelled');

-- ==========================================
-- 2. Create Tables
-- ==========================================

-- Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    company_name TEXT,
    country_code TEXT DEFAULT '+91',
    phone TEXT,
    email TEXT,
    gstin TEXT,
    address TEXT,
    city TEXT,
    pincode TEXT,
    state_code CHAR(2),
    country TEXT DEFAULT 'India',
    payment_terms TEXT, -- e.g. 'Net 30'
    outstanding_due NUMERIC(12,2) DEFAULT 0,
    total_purchases NUMERIC(12,2) DEFAULT 0,
    advance_balance NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    total_write_offs NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders Table (The Finalized Bills)
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES auth.users(id),
    po_number TEXT NOT NULL,
    vehicle_no TEXT,
    reference_name TEXT,

    -- Status & Toggles
    status purchase_order_status DEFAULT 'draft',
    payment_status purchase_payment_status DEFAULT 'unpaid',
    payment_method payment_method DEFAULT 'cash',
    is_gst_supply BOOLEAN DEFAULT false,
    is_interstate BOOLEAN DEFAULT false,
    
    -- Totals
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    settlement_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    cgst_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    igst_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    round_off NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Dates & Notes
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    notes TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, po_number)
);

-- Purchase Order Line Items
CREATE TABLE po_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit TEXT DEFAULT 'Pcs',
    hsn_code TEXT,
    qty_ordered NUMERIC(12,3) NOT NULL,
    qty_received NUMERIC(12,3) DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL,
    batch_sell_price NUMERIC(12,2) DEFAULT 0,
    
    -- Taxes & Discounts
    discount_pct NUMERIC(5,2) DEFAULT 0,
    gst_rate NUMERIC(5,2) DEFAULT 0,
    cgst NUMERIC(12,2) DEFAULT 0,
    sgst NUMERIC(12,2) DEFAULT 0,
    igst NUMERIC(12,2) DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL,
    sort_order INT DEFAULT 0
);

-- To Purchase List (The Kanban Sticky Notes)
CREATE TABLE to_purchase_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL, 
    item_name TEXT NOT NULL, 
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL, 
    qty_needed INT DEFAULT 1,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Returns Table (Debit Notes)
CREATE TABLE purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    reason TEXT,
    refund_amount NUMERIC(12,2) NOT NULL,
    refund_method purchase_refund_method, 
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    po_line_item_id UUID NOT NULL REFERENCES po_line_items(id) ON DELETE RESTRICT,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    return_qty NUMERIC(12,3) NOT NULL,
    refund_amount NUMERIC(12,2) NOT NULL
);

-- Supplier Payments Table (Purchase Payments)
CREATE TABLE supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    method payment_method NOT NULL,
    status payment_record_status DEFAULT 'sanctioned',
    reference_no TEXT,
    note TEXT,
    receipt_batch_id TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    paid_at TIMESTAMPTZ DEFAULT now(),
    settlement_discount NUMERIC(12,2) DEFAULT 0
);

-- ==========================================
-- 3. CROSS-DOMAIN DEPENDENCY RESOLUTION
-- ==========================================
-- This ties the Item Batches from Module 1 to the POs in Module 2
ALTER TABLE item_batches 
ADD CONSTRAINT fk_item_batches_po 
FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- ==========================================
-- 4. Create Indexes for Dashboard Speed
-- ==========================================
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_purchase_orders_tenant_date ON purchase_orders(tenant_id, order_date);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_line_items_po ON po_line_items(po_id);
CREATE INDEX idx_to_purchase_tenant ON to_purchase_list(tenant_id);
CREATE INDEX idx_purchase_returns_tenant ON purchase_returns(tenant_id);
CREATE INDEX idx_purchase_return_items_return_id ON purchase_return_items(purchase_return_id);
CREATE INDEX idx_supplier_payments_po ON supplier_payments(po_id);
CREATE INDEX idx_supplier_payments_batch ON supplier_payments(receipt_batch_id);
CREATE INDEX idx_supplier_payments_tenant_date ON supplier_payments(tenant_id, paid_at);
CREATE INDEX idx_purchase_orders_vehicle_no ON purchase_orders(vehicle_no);

-- Foreign key indexes not covered by the indexes above
CREATE INDEX IF NOT EXISTS idx_suppliers_user_fk ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by_fk ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_po_line_items_item_fk ON po_line_items(item_id);
CREATE INDEX IF NOT EXISTS idx_to_purchase_list_item_fk ON to_purchase_list(item_id);
CREATE INDEX IF NOT EXISTS idx_to_purchase_list_supplier_fk ON to_purchase_list(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_original_po_fk ON purchase_returns(original_po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_po_line_fk ON purchase_return_items(po_line_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_item_fk ON purchase_return_items(item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_recorded_by_fk ON supplier_payments(recorded_by);

-- ==========================================
-- 5. Enable Row Level Security (RLS) & Policies
-- ==========================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_purchase_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

-- Standard Tenant Isolation Policies (Unified auth.uid() Pattern)
-- ==========================================
-- 1. DIRECT TENANT TABLES (Directly own a tenant_id)
-- ==========================================

CREATE POLICY "Tenant CRUD: Suppliers" ON suppliers FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Purchase Orders" ON purchase_orders FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Purchase Returns" ON purchase_returns FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Supplier Payments" ON supplier_payments FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- ==========================================
-- 2. NESTED CHILD TABLES (Inherit access from their Parent ID)
-- ==========================================

CREATE POLICY "Tenant CRUD: PO Line Items" ON po_line_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = po_line_items.po_id 
    AND purchase_orders.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = po_line_items.po_id 
    AND purchase_orders.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
));

CREATE POLICY "Tenant CRUD: Purchase Return Items" ON purchase_return_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM purchase_returns WHERE purchase_returns.id = purchase_return_items.purchase_return_id 
    AND purchase_returns.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_returns WHERE purchase_returns.id = purchase_return_items.purchase_return_id 
    AND purchase_returns.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
));

CREATE POLICY "Tenant CRUD: To Purchase List" ON to_purchase_list FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant Isolation: Suppliers" ON suppliers FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant Isolation: Purchase Orders" ON purchase_orders FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant Isolation: To Purchase" ON to_purchase_list FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant Isolation: Purchase Returns" ON purchase_returns FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- -- Line items inherit access through the parent Purchase Order
-- CREATE POLICY "Access via PO" ON po_line_items FOR ALL USING (
--     EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = po_line_items.po_id AND purchase_orders.tenant_id = current_setting('app.current_tenant', true)::uuid)
-- );

-- CREATE POLICY "Access via Purchase Return" ON purchase_return_items FOR ALL USING (
--     EXISTS (
--         SELECT 1 FROM purchase_returns 
--         WHERE purchase_returns.id = purchase_return_items.purchase_return_id 
--         AND purchase_returns.tenant_id = current_setting('app.current_tenant', true)::uuid
--     )
-- );

-- CREATE POLICY "Tenant Isolation: Supplier Payments" ON supplier_payments 
--     FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()));