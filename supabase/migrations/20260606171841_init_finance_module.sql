-- CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'credit', 'mixed');
CREATE TYPE cash_entry_type AS ENUM ('in', 'out');
-- CREATE TYPE cash_reference_type AS ENUM ('manual', 'sale', 'expense', 'purchase', 'payment');
CREATE TYPE cash_reference_type AS ENUM ('manual', 'single_sale', 'multi_sale', 'single_purchase', 'multi_purchase', 'expense', 'advance_receipt', 'advance_payment', 'sales_return', 'purchase_return');
CREATE TYPE credit_reference_type AS ENUM ('sales_return', 'purchase_return', 'advance_payment', 'bill_payment', 'manual_adjustment');
-- Create Expense Categories Table
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false
);

-- Create Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Daily Summaries (Materialized P&L Data)
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    total_sales NUMERIC(12,2) DEFAULT 0,
    total_collections NUMERIC(12,2) DEFAULT 0,
    total_expenses NUMERIC(12,2) DEFAULT 0,
    total_purchases NUMERIC(12,2) DEFAULT 0,
    gst_collected NUMERIC(12,2) DEFAULT 0,
    gst_paid NUMERIC(12,2) DEFAULT 0,
    bill_count INT DEFAULT 0,
    gross_profit NUMERIC(12,2) DEFAULT 0,
    net_profit NUMERIC(12,2) DEFAULT 0,
    UNIQUE(tenant_id, summary_date)
);

CREATE TABLE cash_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    entry_date TIMESTAMPTZ DEFAULT now(),
    type cash_entry_type NOT NULL,
    payment_method payment_method DEFAULT 'cash',
    amount NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    reference_type cash_reference_type DEFAULT 'manual',
    reference_id UUID, -- Links to the bill_id or expense_id if automated
    -- balance_after NUMERIC(12,2), -- The running balance in the drawer
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- THE UNIFIED CREDIT LEDGER TABLE
-- ==============================================================================
CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('customer', 'supplier')),
    entity_id UUID NOT NULL, 
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('in', 'out')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(12,2) NOT NULL,
    reference_type credit_reference_type NOT NULL,
    reference_id UUID, -- Nullable to allow for manual adjustments
    description TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Create the new, robust Recalculation Function
-- CREATE OR REPLACE FUNCTION recalculate_tenant_ledger()
-- RETURNS TRIGGER AS $$
-- DECLARE
--     v_balance NUMERIC(12,2) := 0;
--     v_rec RECORD;
--     v_tenant_id UUID;
-- BEGIN
--     -- CRITICAL: This prevents infinite loops when the function updates the table
--     IF pg_trigger_depth() > 1 THEN
--         RETURN NULL;
--     END IF;

--     -- Find out which tenant we are updating
--     IF TG_OP = 'DELETE' THEN
--         v_tenant_id := OLD.tenant_id;
--     ELSE
--         v_tenant_id := NEW.tenant_id;
--     END IF;

--     -- Loop through EVERY transaction for this tenant in exact chronological order
--     FOR v_rec IN 
--         SELECT id, type, amount 
--         FROM cash_book 
--         WHERE tenant_id = v_tenant_id 
--         ORDER BY entry_date ASC, created_at ASC
--     LOOP
--         -- Do the math
--         IF v_rec.type = 'in' THEN
--             v_balance := v_balance + v_rec.amount;
--         ELSE
--             v_balance := v_balance - v_rec.amount;
--         END IF;

--         -- Update the specific row with the correct running balance
--         UPDATE cash_book 
--         SET balance_after = v_balance 
--         WHERE id = v_rec.id;
--     END LOOP;

--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW cash_book_ledger 
WITH (security_invoker = true) AS
SELECT 
    id,
    tenant_id,
    recorded_by,
    entry_date,
    type,
    payment_method,
    amount,
    description,
    reference_type,
    reference_id,
    created_at,
    SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END) OVER (
        PARTITION BY tenant_id 
        ORDER BY entry_date ASC, created_at ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS balance_after
FROM cash_book;

-- 2. Attach the new trigger to INSERT, UPDATE, and DELETE
-- CREATE TRIGGER trg_maintain_ledger_balance
-- AFTER INSERT OR UPDATE OF amount, type, entry_date OR DELETE
-- ON cash_book
-- FOR EACH ROW
-- EXECUTE FUNCTION recalculate_tenant_ledger();

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant CRUD: Credit Ledger" ON credit_ledger FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant Isolation: Credit Ledger" ON credit_ledger
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

-- CREATE POLICY "Tenant CRUD: Expense Categories" ON expense_categories FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant CRUD: Expenses" ON expenses FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

-- CREATE POLICY "Tenant CRUD: Daily Summaries" ON daily_summaries FOR ALL TO authenticated
-- USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
-- WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenants can view expense categories" ON expense_categories FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenants can view expenses" ON expenses FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Tenants can view daily summaries" ON daily_summaries FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));


CREATE POLICY "Managers manage expense categories" ON expense_categories FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = true));

CREATE POLICY "Managers manage expenses" ON expenses FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = true));

CREATE POLICY "Tenant CRUD: Cash Book" ON cash_book FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));

CREATE INDEX idx_expenses_tenant_date ON expenses(tenant_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_daily_summaries_tenant_date ON daily_summaries(tenant_id, summary_date);
CREATE INDEX idx_bills_tenant_created ON bills(tenant_id, created_at DESC);
CREATE INDEX idx_expenses_tenant_created ON expenses(tenant_id, created_at DESC);
CREATE INDEX idx_po_tenant_created ON purchase_orders(tenant_id, created_at DESC);
CREATE INDEX idx_expenses_recorded_by ON expenses(recorded_by);
CREATE INDEX idx_cash_book_recorded_by ON cash_book(recorded_by);
-- Indexes for lightning-fast history lookups
CREATE INDEX IF NOT EXISTS idx_credit_ledger_tenant_entity ON credit_ledger(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_reference ON credit_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at DESC);

CREATE OR REPLACE VIEW daily_cash_overview 
WITH (security_invoker = true) AS
WITH daily_stats AS (
    SELECT 
        DATE(entry_date) as summary_date,
        SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out,
        MIN(balance_after) as opening_balance_calc, -- Needs logic adjustment
        MAX(balance_after) as closing_balance
    FROM cash_book_ledger
    GROUP BY DATE(entry_date)
)
SELECT * FROM daily_stats ORDER BY summary_date DESC;

-- ==============================================================================
-- 3. DATA MIGRATION: CLEAN UP THE "GHOST" ADVANCES
-- ==============================================================================
-- This script finds anyone with a negative outstanding_due, moves that money to 
-- their new advance_balance, resets their due to 0, and logs it in the ledger.

DO $$
DECLARE
    entity_record RECORD;
BEGIN
    -- Fix Customers
    FOR entity_record IN SELECT id, tenant_id, outstanding_due FROM customers WHERE outstanding_due < 0 
    LOOP
        -- Move the money to the wallet
        UPDATE customers SET 
            advance_balance = ABS(outstanding_due), 
            outstanding_due = 0 
        WHERE id = entity_record.id;

        -- Create the paper trail
        INSERT INTO credit_ledger (
            tenant_id, entity_type, entity_id, flow_type, amount, balance_after, reference_type, description
        ) VALUES (
            entity_record.tenant_id, 'customer', entity_record.id, 'in', ABS(entity_record.outstanding_due), ABS(entity_record.outstanding_due), 'migration', 'System Upgrade: Converted negative outstanding balance to dedicated advance wallet.'
        );
    END LOOP;

    -- Fix Suppliers
    FOR entity_record IN SELECT id, tenant_id, outstanding_due FROM suppliers WHERE outstanding_due < 0 
    LOOP
        UPDATE suppliers SET 
            advance_balance = ABS(outstanding_due), 
            outstanding_due = 0 
        WHERE id = entity_record.id;

        INSERT INTO credit_ledger (
            tenant_id, entity_type, entity_id, flow_type, amount, balance_after, reference_type, description
        ) VALUES (
            entity_record.tenant_id, 'supplier', entity_record.id, 'in', ABS(entity_record.outstanding_due), ABS(entity_record.outstanding_due), 'migration', 'System Upgrade: Converted negative outstanding balance to dedicated advance wallet.'
        );
    END LOOP;
END $$;