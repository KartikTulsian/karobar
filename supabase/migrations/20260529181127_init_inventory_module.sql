-- ====================================================================
-- 1. ENUMS & EXTENSIONS
-- ====================================================================
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff', 'customer');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'credit', 'mixed', 'bank_transfer', 'cheque');
CREATE TYPE movement_type AS ENUM ( 'purchase', 'sale', 'return_in', 'return_out', 'adjustment' );
CREATE TYPE movement_reference_type AS ENUM ('bill', 'purchase_order', 'sales_return', 'purchase_return', 'manual_adjustment', 'opening_stock' );
-- ====================================================================
-- 2. CORE PLATFORM TABLES (MODULE 1)
-- ====================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    gstin TEXT,
    address TEXT,
    city TEXT,
    pincode TEXT,
    state_code CHAR(2),
    country TEXT DEFAULT 'India',
    phone TEXT,
    country_code TEXT DEFAULT '+91',
    logo_url TEXT,
    plan TEXT DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    razorpay_sub_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);

CREATE TABLE public.tenant_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  role public.user_role NOT NULL,
  invited_by uuid,
  token text NOT NULL UNIQUE,
  is_accepted boolean DEFAULT false,
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  access_level TEXT DEFAULT 'standard',
  CONSTRAINT tenant_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT tenant_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 3. INVENTORY MANAGEMENT TABLES (MODULE 2)
-- ====================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    hsn_code TEXT,
    unit TEXT DEFAULT 'Pcs',
    -- buy_price NUMERIC(12,2),
    -- sell_price NUMERIC(12,2) NOT NULL,
    default_sell_price NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2),
    -- stock_qty INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, sku)
);

CREATE TABLE item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    po_id UUID, -- Nullable for opening/manual stock -- Foreign Key is applied in the Purchases migration to prevent tangling
    batch_number TEXT, -- E.g., 'PO-2026-012' or 'OPENING-STOCK'
    buy_price NUMERIC(12,2) NOT NULL,
    sell_price NUMERIC(12,2) NOT NULL,
    stock_qty INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    supplier_id UUID, -- Nullable, references suppliers(id) if/when that table is created
    
    type movement_type NOT NULL,
    
    qty_change INT NOT NULL, -- +ve for incoming (purchases, return_in), -ve for outgoing (sales, return_out, adjustments)
    qty_before INT NOT NULL, -- Snapshot of stock before movement
    qty_after INT NOT NULL,  -- Snapshot of stock after movement
    
    reference_id UUID,       -- e.g., bill_id or po_id
    reference_type movement_reference_type,
    note TEXT,               -- E.g., 'Found broken in warehouse'
    
    -- Links to your existing users table which maps to auth.users
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, 
    created_at TIMESTAMPTZ DEFAULT now()
);

-- This view mimics your old `items` table. Your existing frontend hooks 
-- will query this view, so they instantly get the sum of all batches 
-- without needing to rewrite every single frontend component right away.
CREATE OR REPLACE VIEW inventory_summary
WITH (security_invoker = true) AS
SELECT 
    i.id,
    i.tenant_id,
    i.category_id,
    i.brand_id,
    i.name,
    i.sku,
    i.barcode,
    i.hsn_code,
    i.unit,
    i.default_sell_price,
    i.gst_rate,
    i.low_stock_threshold,
    i.description,
    i.images,
    i.is_active,
    i.created_at,
    i.updated_at,
    COALESCE(SUM(b.stock_qty), 0) AS total_stock_qty,
    -- Explicitly bundle all batches into a JSON array, sorted oldest first (FIFO)
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', b.id,
                'tenant_id', b.tenant_id,
                'item_id', b.item_id,
                'po_id', b.po_id,
                'batch_number', b.batch_number,
                'buy_price', b.buy_price,
                'sell_price', b.sell_price,
                'stock_qty', b.stock_qty,
                'created_at', b.created_at
            ) ORDER BY b.created_at ASC
        ) FILTER (WHERE b.id IS NOT NULL), '[]'::jsonb
    ) AS batches
FROM items i
LEFT JOIN item_batches b ON i.id = b.item_id
GROUP BY i.id;

-- ====================================================================
-- 4. PERFORMANCE ACCELERATION (INDEXES)
-- ====================================================================
-- Speed up tenant isolation across all primary operational tables
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);
CREATE INDEX idx_tenant_memberships_invited_by ON tenant_memberships(invited_by);
CREATE INDEX idx_invitations_email_lookup ON public.tenant_invitations(email) WHERE is_accepted = false;
CREATE INDEX idx_active_invitations ON public.tenant_invitations(email, expires_at) 
WHERE is_accepted = false AND revoked_at IS NULL;

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_brands_tenant ON brands(tenant_id);

-- Optimized compound indexes for item searching and foreign key filtering
CREATE INDEX idx_items_tenant_lookup ON items(tenant_id, is_active);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_brand ON items(brand_id);

CREATE INDEX idx_item_batches_tenant ON item_batches(tenant_id);
CREATE INDEX idx_item_batches_item ON item_batches(item_id);
CREATE INDEX idx_item_batches_po ON item_batches(po_id);

CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_type_date ON stock_movements(tenant_id, type, created_at);
CREATE INDEX idx_stock_movements_created_by ON stock_movements(created_by);

-- ====================================================================
-- 5. AUTOMATED MODIFICATION TRACKING (TRIGGERS)
-- ====================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_modtime
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
-- REVOKE EXECUTE ON FUNCTION public.update_modified_column() FROM public, anon, authenticated;

-- ====================================================================
-- 6. SECURITY ARCHITECTURE (ROW LEVEL SECURITY)
-- ====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Production Grade Multi-Tenant Access Policies
-- Checks if the user making the request belongs to the tenant owning the items
CREATE POLICY "Tenant CRUD: Items" ON items FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Categories" ON categories FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Brands" ON brands FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Users can access batches in their tenant" ON item_batches
--     FOR ALL TO authenticated
--     USING (
--         tenant_id IN (
--             SELECT tenant_id FROM tenant_memberships 
--             WHERE user_id = auth.uid() AND is_active = true
--         )
--     );

-- Users can only see and update their own profile
CREATE POLICY "Users manage own profile" ON public.users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can view their own memberships
CREATE POLICY "Users view own memberships" ON public.tenant_memberships
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view tenants they are a member of
CREATE POLICY "Users view joined tenants" ON public.tenants
  FOR SELECT USING (id IN (SELECT tenant_id FROM public.tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

  CREATE POLICY "Tenant CRUD: Item Batches" ON item_batches FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenant CRUD: Stock Movements" ON stock_movements FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));