-- Drop the old read-only policies
DROP POLICY IF EXISTS "Users can view items in their tenant" ON items;
DROP POLICY IF EXISTS "Users can view categories in their tenant" ON categories;
DROP POLICY IF EXISTS "Users can view brands in their tenant" ON brands;

-- Create full CRUD policies for inventory core tables
CREATE POLICY "Tenant CRUD: Items" ON items FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Categories" ON categories FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Brands" ON brands FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));