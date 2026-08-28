-- ==========================================
-- 1. Create ENUMs
-- ==========================================
CREATE TYPE customer_type AS ENUM ('registered', 'flying');
CREATE TYPE bill_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'overdue', 'cancelled');
-- Expanded payment methods slightly based on standard POS needs & your payments table image
-- CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'credit', 'mixed', 'bank_transfer', 'cheque'); 
CREATE TYPE refund_method AS ENUM ('cash', 'upi', 'credit_note', 'bank_transfer');
CREATE TYPE payment_record_status AS ENUM ('draft', 'sanctioned', 'cancelled');

-- ==========================================
-- 2. Create Tables
-- ==========================================

-- Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- References auth.users (if using Supabase Auth for customer logins)
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
    type customer_type DEFAULT 'flying',
    credit_limit NUMERIC(12,2) DEFAULT 0,
    outstanding_due NUMERIC(12,2) DEFAULT 0,
    total_purchases NUMERIC(12,2) DEFAULT 0,
    advance_balance NUMERIC(12,2) DEFAULT 0,
    visit_count INT DEFAULT 0,
    last_purchase_at TIMESTAMPTZ,
    notes TEXT,
    total_write_offs NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bills Table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES auth.users(id), -- References auth.users (staff who raised bill)
    bill_number TEXT NOT NULL,
    bill_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    vehicle_no TEXT,
    reference_name TEXT,
    status bill_status DEFAULT 'draft',
    is_gst_bill BOOL DEFAULT true,
    is_interstate BOOL DEFAULT false,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    settlement_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    cgst_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    igst_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    round_off NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method payment_method,
    notes TEXT,
    ai_parsed BOOL DEFAULT false,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, bill_number) -- Ensures invoice numbers don't clash within a tenant
);

-- Bill Line Items Table
CREATE TABLE bill_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL, -- Nullable for custom/untracked items
    batch_allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
    item_name TEXT NOT NULL,
    unit TEXT DEFAULT 'Pcs',
    hsn_code TEXT,
    qty NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_buy_price NUMERIC(12,2) DEFAULT 0,
    line_profit NUMERIC(12,2) DEFAULT 0,
    discount_pct NUMERIC(5,2) DEFAULT 0,
    gst_rate NUMERIC(5,2) DEFAULT 0,
    cgst NUMERIC(12,2) DEFAULT 0,
    sgst NUMERIC(12,2) DEFAULT 0,
    igst NUMERIC(12,2) DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL,
    write_off_recovery NUMERIC DEFAULT 0,
    sort_order INT DEFAULT 0
);

-- Payments Table (Installments/Records against bills)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    method payment_method NOT NULL,
    status payment_record_status DEFAULT 'sanctioned',
    reference_no TEXT,
    note TEXT,
    receipt_batch_id TEXT,
    recorded_by UUID REFERENCES users(id),
    paid_at TIMESTAMPTZ DEFAULT now(),
    settlement_discount NUMERIC(12,2) DEFAULT 0
);

-- Sales Returns Table
CREATE TABLE sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE RESTRICT,
    credit_note_bill_id UUID REFERENCES bills(id),
    reason TEXT,
    refund_amount NUMERIC(12,2) NOT NULL,
    refund_method refund_method NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
    bill_line_item_id UUID REFERENCES bill_line_items(id), -- Connects to original bill line
    return_batch_allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
    item_id UUID REFERENCES items(id), -- Connects to inventory
    return_qty NUMERIC(10,3) NOT NULL,
    refund_amount NUMERIC(12,2) NOT NULL, -- The proportional refund for just these items
    write_off_recovery NUMERIC DEFAULT 0
);

-- ==========================================
-- 3. Create Indexes (Crucial for Dashboard filtering speed)
-- ==========================================
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_user_id ON public.customers(user_id) WHERE user_id IS NULL;
CREATE INDEX idx_customers_unlinked_phone ON public.customers(phone) WHERE user_id IS NULL;

CREATE INDEX idx_bills_tenant_date ON bills(tenant_id, bill_date);
CREATE INDEX idx_bills_tenant_status ON bills(tenant_id, status);
CREATE INDEX idx_bills_customer ON bills(customer_id);
CREATE INDEX idx_bills_created_by ON bills(created_by);
CREATE INDEX idx_bills_vehicle_no ON bills(vehicle_no);
CREATE INDEX idx_line_items_bill ON bill_line_items(bill_id);
CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_payments_batch ON payments(receipt_batch_id);
CREATE INDEX idx_sales_return_items_parent ON sales_return_items(sales_return_id);
CREATE INDEX idx_sales_return_items_bill_line ON sales_return_items(bill_line_item_id);
CREATE INDEX idx_bills_tenant_profit ON bills(tenant_id, total_profit);
-- Create a GIN index on the JSONB column to ensure fast querying 
-- (Crucial for when we need to find which bills used a specific batch during returns)
CREATE INDEX idx_bill_line_items_allocations ON bill_line_items USING GIN (batch_allocations);
-- Create an index for fast querying when tracing batch histories
CREATE INDEX idx_sales_return_items_allocations ON sales_return_items USING GIN (return_batch_allocations);

-- Foreign key indexes not covered by the indexes above
CREATE INDEX IF NOT EXISTS idx_customers_tenant_fk ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_fk ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_fk ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by_fk ON payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_bill_line_items_item_fk ON bill_line_items(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_tenant_fk ON sales_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_original_bill_fk ON sales_returns(original_bill_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_credit_note_bill_fk ON sales_returns(credit_note_bill_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_created_by_fk ON sales_returns(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_item_fk ON sales_return_items(item_id);

-- Compound index for tenant/status/date bill queries
CREATE INDEX IF NOT EXISTS idx_bills_tenant_status_created_at ON bills(tenant_id, status, created_at);

-- ==========================================
-- 4. Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;

-- Standard Tenant Isolation Policies (Assuming your JWT or auth context exposes tenant_id)
-- ==========================================
-- 1. DIRECT TENANT TABLES (Directly own a tenant_id)
-- ==========================================

CREATE POLICY "Tenant CRUD: Customers" ON customers FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Bills" ON bills FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Payments" ON payments FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Sales Returns" ON sales_returns FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- ==========================================
-- 2. NESTED CHILD TABLES (Inherit access from their Parent ID)
-- ==========================================
CREATE POLICY "Tenant CRUD: Bill Line Items" ON bill_line_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM bills WHERE bills.id = bill_line_items.bill_id 
    AND bills.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM bills WHERE bills.id = bill_line_items.bill_id 
    AND bills.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
));

CREATE POLICY "Tenant CRUD: Sales Return Items" ON sales_return_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM sales_returns WHERE sales_returns.id = sales_return_items.sales_return_id 
    AND sales_returns.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM sales_returns WHERE sales_returns.id = sales_return_items.sales_return_id 
    AND sales_returns.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
));

-- Replace the policy logic below with your exact auth function if it differs (e.g., auth.uid() tracking)
-- Customers
-- CREATE POLICY "Tenant Isolation: Customers" ON customers 
-- FOR ALL TO authenticated
-- USING (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- )
-- WITH CHECK (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- );

-- -- Bills
-- CREATE POLICY "Tenant Isolation: Bills" ON bills 
-- FOR ALL TO authenticated
-- USING (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- )
-- WITH CHECK (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- );

-- -- Payments
-- CREATE POLICY "Tenant Isolation: Payments" ON payments 
-- FOR ALL TO authenticated
-- USING (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- )
-- WITH CHECK (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- );

-- -- Sales Returns
-- CREATE POLICY "Tenant Isolation: Sales Returns" ON sales_returns 
-- FOR ALL TO authenticated
-- USING (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- )
-- WITH CHECK (
--     tenant_id IN (
--         SELECT tenant_id FROM tenant_memberships 
--         WHERE user_id = auth.uid() AND is_active = true
--     )
-- );

-- -- Line items don't have tenant_id directly, they inherit access through the bill
-- CREATE POLICY "Access via Bill" ON bill_line_items FOR ALL USING (
--     EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_line_items.bill_id AND bills.tenant_id = current_setting('app.current_tenant', true)::uuid)
-- );

-- -- Line items inherit access through the parent sales_return
-- CREATE POLICY "Access via Sales Return" ON sales_return_items FOR ALL USING (
--     EXISTS (
--         SELECT 1 FROM sales_returns 
--         WHERE sales_returns.id = sales_return_items.sales_return_id 
--         AND sales_returns.tenant_id = current_setting('app.current_tenant', true)::uuid
--     )
-- );