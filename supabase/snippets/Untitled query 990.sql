-- ==========================================
-- 1. DIRECT TENANT TABLES (Directly own a tenant_id)
-- ==========================================
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Tenant CRUD: Customers" ON customers;
DROP POLICY IF EXISTS "Tenant CRUD: Suppliers" ON suppliers;
DROP POLICY IF EXISTS "Tenant CRUD: Bills" ON bills;
DROP POLICY IF EXISTS "Tenant CRUD: Purchase Orders" ON purchase_orders;
DROP POLICY IF EXISTS "Tenant CRUD: Sales Returns" ON sales_returns;
DROP POLICY IF EXISTS "Tenant CRUD: Purchase Returns" ON purchase_returns;
DROP POLICY IF EXISTS "Tenant CRUD: Payments" ON payments;
DROP POLICY IF EXISTS "Tenant CRUD: Supplier Payments" ON supplier_payments;
DROP POLICY IF EXISTS "Tenant CRUD: Credit Ledger" ON credit_ledger;

-- Create full CRUD policies
CREATE POLICY "Tenant CRUD: Customers" ON customers FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Suppliers" ON suppliers FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Bills" ON bills FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Purchase Orders" ON purchase_orders FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Sales Returns" ON sales_returns FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Purchase Returns" ON purchase_returns FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Payments" ON payments FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Supplier Payments" ON supplier_payments FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Credit Ledger" ON credit_ledger FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));


-- ==========================================
-- 2. NESTED CHILD TABLES (Inherit access from their Parent ID)
-- ==========================================
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Tenant CRUD: Bill Line Items" ON bill_line_items;
DROP POLICY IF EXISTS "Tenant CRUD: PO Line Items" ON po_line_items;
DROP POLICY IF EXISTS "Tenant CRUD: Sales Return Items" ON sales_return_items;
DROP POLICY IF EXISTS "Tenant CRUD: Purchase Return Items" ON purchase_return_items;

-- Create full CRUD policies utilizing EXISTS subqueries
CREATE POLICY "Tenant CRUD: Bill Line Items" ON bill_line_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM bills WHERE bills.id = bill_line_items.bill_id 
    AND bills.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM bills WHERE bills.id = bill_line_items.bill_id 
    AND bills.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
));

CREATE POLICY "Tenant CRUD: PO Line Items" ON po_line_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = po_line_items.po_id 
    AND purchase_orders.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_orders WHERE purchase_orders.id = po_line_items.po_id 
    AND purchase_orders.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
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

CREATE POLICY "Tenant CRUD: Purchase Return Items" ON purchase_return_items FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM purchase_returns WHERE purchase_returns.id = purchase_return_items.purchase_return_id 
    AND purchase_returns.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM purchase_returns WHERE purchase_returns.id = purchase_return_items.purchase_return_id 
    AND purchase_returns.tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true)
));