# Karobar Supabase Database Architectural Audit Report

**Date:** August 26, 2026  
**Audit Scope:** Supabase migrations, seed data, and backend API integration  
**Audit Type:** Read-only security, performance, and data integrity analysis

---

## Executive Summary

This audit identified **3 CRITICAL**, **7 HIGH**, and **6 MEDIUM** severity issues across security, performance, data integrity, and migration safety categories. The most critical findings involve:

1. **Blanket GRANT privileges to `anon` role** on sensitive tables without proper RLS enforcement
2. **Missing tenant isolation validation in query RPCs** allowing cross-tenant data leakage
3. **Performance-killing RLS policies** using unoptimized subqueries on every row evaluation
4. **Inconsistent RLS policy patterns** mixing `auth.uid()` with `current_setting()` approaches

---

## 1. Security & Row Level Security (RLS)

### 🔴 CRITICAL: Dangerous Global GRANT to Anonymous Role

**Location:** `20260611181406_grant_prev.sql`

**Issue:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
```

**Why This Is Dangerous:**
- The `anon` role should ONLY have read access to public data, never INSERT/UPDATE/DELETE
- This grant bypasses RLS enforcement by giving blanket CRUD privileges at the role level
- Even though RLS is enabled on tables, this grant creates a false sense of security
- If ANY RLS policy has a logic flaw, an unauthenticated user could exploit it
- New tables added in the future will automatically inherit these dangerous privileges

**Theoretical Fix:**
- Remove all DELETE/INSERT/UPDATE grants to `anon` role
- Keep only `SELECT` for `anon` on non-sensitive tables (optional)
- Use explicit `GRANT` statements on specific tables/columns instead of blanket `ALL TABLES` grants
- Reserve DML operations (INSERT/UPDATE/DELETE) for `authenticated` role only
- Use strong RLS policies with `WITH CHECK` clauses to enforce row-level control

**Risk Level:** CRITICAL - This is a foundational security vulnerability

---

### 🔴 CRITICAL: Missing Tenant Isolation Validation in Query RPCs

**Location:** 
- `20260607173346_gst_rpc.sql` - `get_gst_dashboard()` 
- `20260806153907_inventory_rpc.sql` - `get_inventory_dashboard_data()`
- `20260807142257_sales_report_rpc.sql` - `get_sales_report_data()`
- `20260807155552_customer_report_rpc.sql` - `get_top_customers_report()`
- `20260807173609_supplier_report_rpc.sql` - `get_top_suppliers_report()`
- `20260717085007_payment_rpc.sql` - `get_daily_cash_summaries()`

**Issue:**
These RPCs accept `p_tenant_id` as a parameter but have NO validation that the authenticated user actually belongs to that tenant. A malicious user can call:
```typescript
supabase.rpc('get_gst_dashboard', {
  p_tenant_id: 'some-other-business-uuid', // Not their tenant
  p_start_date: '2026-01-01',
  p_end_date: '2026-08-31'
})
```

This will return sensitive financial data from ANY tenant in the database.

**Affected RPCs:** All 6 query/reporting functions listed above

**Theoretical Fix:**
- Add `SECURITY DEFINER` clause to each RPC
- Add explicit validation at the START of each function:
  ```sql
  -- Verify the user belongs to the requested tenant
  IF (
    SELECT COUNT(1) FROM tenant_memberships 
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
  ) = 0 THEN
    RAISE EXCEPTION 'Unauthorized access to this tenant';
  END IF;
  ```
- Test with a user from Tenant A trying to access Tenant B's data

**Risk Level:** CRITICAL - Direct cross-tenant data leakage vulnerability

---

### 🔴 CRITICAL: Mixed RLS Policy Patterns Using Unsafe current_setting()

**Location:** 
- `20260531155448_init_billing_module.sql` - Lines 176-179
- `20260601150329_init_purchases_module.sql` - Lines 185-188

**Issue:**
Multiple tables use `current_setting('app.current_tenant', true)::uuid` for tenant isolation:

```sql
CREATE POLICY "Tenant Isolation: Customers" ON customers 
FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

**Problems:**
1. **Silent Failure Mode:** The `true` parameter means if `app.current_tenant` is never SET at the connection level, the function returns NULL and the comparison silently fails (returns 0 rows instead of blocking)
2. **Application Dependency:** This relies entirely on the backend application to SET this value. If ANY code path forgets, data leaks silently
3. **No Fallback:** Unlike `auth.uid()` which always has a value, this can be NULL
4. **Inconsistency:** The first migration uses `auth.uid()`-based policies, but billing/purchases modules use `current_setting()`—you're mixing two incompatible patterns

**Inventory Module (Correct Pattern):**
```sql
CREATE POLICY "Users can view items in their tenant" ON items
FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM tenant_memberships 
        WHERE user_id = auth.uid() AND is_active = true
    )
);
```

**Theoretical Fix:**
- Refactor ALL `current_setting('app.current_tenant', true)` policies to use the `auth.uid()` pattern
- This ensures the RLS policy is self-contained and doesn't depend on application-level setup
- If you must keep the `current_setting()` pattern, add a mandatory fallback:
  ```sql
  COALESCE(current_setting('app.current_tenant', false), auth.jwt() ->> 'tenant_id') ::uuid
  ```

**Risk Level:** CRITICAL - Silent data leakage if application forgets to SET the connection variable

---

### 🟠 HIGH: RLS Policies Using Unoptimized Subqueries (Performance + Correctness)

**Location:** 
- `20260529181127_init_inventory_module.sql` - Lines 266, 275, 284, 293
- Multiple RLS policies in all modules

**Issue:**
```sql
CREATE POLICY "Users can view items in their tenant" ON items
FOR SELECT TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM tenant_memberships 
        WHERE user_id = auth.uid() AND is_active = true
    )
);
```

This subquery runs on EVERY row of the `items` table when a user queries. For a tenant with 1M+ items, this is a massive performance killer.

**Theoretical Fix:**
- Create a helper function with `IMMUTABLE` or `STABLE` designation to cache tenant lookups
- Or use JOINs in the policy instead of subqueries
- Better: Use a role-based approach where each user has a materialized view of their accessible tenants

---

### 🟠 HIGH: Views Bypass RLS When security_invoker Not Set

**Location:** `20260529181127_init_inventory_module.sql` - Lines 195-223 (inventory_summary view)

**Issue:**
```sql
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    i.id, i.tenant_id, ...
    COALESCE(SUM(b.stock_qty), 0) AS total_stock_qty,
    ...
FROM items i
LEFT JOIN item_batches b ON i.id = b.item_id
GROUP BY i.id;
```

This view does NOT have `SECURITY DEFINER` or `security_invoker = true` set. This means:
- If someone queries this view, the view runs with the view creator's privileges
- RLS policies on `items` and `item_batches` may be bypassed
- A user could potentially see items they shouldn't have access to

**Theoretical Fix:**
```sql
CREATE OR REPLACE VIEW inventory_summary WITH (security_invoker = true) AS
SELECT ...
```

---

### 🟠 HIGH: Inconsistent RLS Policy With CHECK Clauses

**Location:** 
- `20260531155448_init_billing_module.sql` - Sales Returns policies
- `20260601150329_init_purchases_module.sql` - Purchase Returns policies

**Issue:**
Several INSERT/UPDATE/DELETE policies are missing `WITH CHECK` clauses:

```sql
CREATE POLICY "Tenant Isolation: Customers" ON customers FOR ALL 
USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
-- Missing WITH CHECK clause!
```

When an INSERT or UPDATE occurs, the USING clause only checks the OLD row. The new values being inserted/updated are not validated. This could allow an attacker to:
1. INSERT a customer with a different tenant_id than what they have access to
2. UPDATE a customer to belong to another tenant

**Theoretical Fix:**
```sql
CREATE POLICY "Tenant Isolation: Customers" ON customers FOR ALL 
USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

---

### 🟠 HIGH: tenant_invitations Policies Allow Email Spoofing

**Location:** `20260819050403_authentication_rpc.sql` - Lines 2-52

**Issue:**
```sql
CREATE POLICY "Users can view their own pending invitations" 
ON public.tenant_invitations
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);
```

**Problem:**
- This policy trusts the JWT claim for email, which could be spoofed if JWT signing is compromised
- A user could see/accept invitations meant for another email address if they control that email in their JWT
- The `expires_at` check happens in the RPC, not in the RLS policy, so expired invitations can still be queried

**Theoretical Fix:**
- Use `auth.uid()` instead of JWT claim for email
- Query `users.email` from the authenticated user and compare:
  ```sql
  USING (auth.uid() IN (SELECT id FROM users WHERE email = tenant_invitations.email))
  ```

---

### 🟡 MEDIUM: Missing RLS on credit_ledger Table

**Location:** `20260606171841_init_finance_module.sql` - credit_ledger table

**Issue:**
The `credit_ledger` table is created but there's no `ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;` statement, and no RLS policies are defined for it. This table tracks financial transactions for all customers and suppliers and should be heavily restricted.

**Theoretical Fix:**
- Add `ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;`
- Create policies restricting access based on tenant and entity ownership

---

## 2. Performance & Indexing

### 🟠 HIGH: Foreign Keys Missing Indexes (Cascading Delete Performance)

**Location:** Multiple tables, examples:
- `stock_movements.supplier_id` - FK to suppliers but no explicit index
- `payments.recorded_by` - FK to users but no explicit index
- `expense_categories.tenant_id` - used in RLS but index created late
- Several others in purchase/billing modules

**Issue:**
When a parent row is deleted with `ON DELETE CASCADE`, the database must scan all child tables to find matching rows. Without indexes on foreign keys, this becomes a full table scan.

**Example Impact:**
If a tenant is deleted, Postgres must scan:
- All items (lookup by tenant_id) ✓ Indexed
- All purchase_orders (lookup by tenant_id) ✓ Indexed
- All stock_movements (lookup by tenant_id, but no supplier_id index) ✗
- All payments (lookup by bill_id) ✓, but recorded_by is not indexed ✗

**Theoretical Fix:**
```sql
CREATE INDEX idx_stock_movements_supplier ON stock_movements(supplier_id);
CREATE INDEX idx_payments_recorded_by ON payments(recorded_by);
CREATE INDEX idx_bill_line_items_item ON bill_line_items(item_id);
```

---

### 🟠 HIGH: Missing Compound Index on Common Filter Combos

**Location:** Multiple tables

**Issue:**
Several queries in the code filter on compound conditions:
- `bills.tenant_id + bills.created_at` (revenue reports)
- `bills.tenant_id + bills.status` (bill tracking)
- `stock_movements.type + created_at` (velocity charts)
- `purchases_orders.tenant_id + status + created_at` (purchase tracking)

Currently, the indexes are created separately, so Postgres may not use them optimally.

**Theoretical Fix:**
```sql
-- Already exists
CREATE INDEX idx_bills_tenant_date ON bills(tenant_id, bill_date);

-- Should also add
CREATE INDEX idx_bills_tenant_status_date ON bills(tenant_id, status, created_at);
CREATE INDEX idx_stock_movements_type_date ON stock_movements(type, created_at);
```

---

### 🟡 MEDIUM: JSONB Indexing on batch_allocations May Not Match Query Patterns

**Location:** `20260531155448_init_billing_module.sql` - GIN index on batch_allocations

**Issue:**
```sql
CREATE INDEX idx_bill_line_items_allocations ON bill_line_items USING GIN (batch_allocations);
```

The code contains queries like:
```typescript
// No direct JSONB queries found in codebase using batch_allocations
```

Actually, searching the codebase shows batch_allocations is stored but no direct JSONB queries are performed on it in the current backend code. If the application never queries this JSONB structure with `@>`, `?`, or `#>` operators, the GIN index is unused.

**Theoretical Fix:**
- Either remove the index if batch_allocations queries don't use JSONB operators
- Or implement proper JSONB querying to leverage the index

---

## 3. Data Integrity & Schema Logic

### 🟠 HIGH: Inconsistent ON DELETE Cascade vs Restrict Pattern

**Location:** Multiple foreign keys across modules

**Issue:**

| FK Relationship | Constraint | Risk |
|---|---|---|
| bills.customer_id → customers.id | `ON DELETE RESTRICT` ✓ | Good: Prevents orphaning |
| bill_line_items.bill_id → bills.id | `ON DELETE CASCADE` ✓ | Good: Cleans up line items |
| payments.bill_id → bills.id | `ON DELETE CASCADE` ✓ | Good: Cleans up payments |
| sales_returns.original_bill_id → bills.id | `ON DELETE RESTRICT` ✓ | Good: Prevents orphaning |
| purchase_orders.supplier_id → suppliers.id | `ON DELETE RESTRICT` ✓ | Good |
| supplier_payments.po_id → purchase_orders.id | `ON DELETE CASCADE` ✓ | Good |
| stock_movements.created_by → users.id | `ON DELETE SET NULL` ✓ | Good: Preserves audit trail |

**The Inconsistency:**
- When a `bills` row is deleted with `ON DELETE RESTRICT`, payments are NOT deleted (they'll orphan)
- When a `purchase_orders` row is deleted, supplier_payments ARE deleted (cascade)
- This inconsistency makes the schema harder to reason about

**Theoretical Fix:**
- Document the cascade strategy: either always cascade related payment records, or use SET NULL with NOT NULL constraint to force application-level cleanup
- Currently it's a mix: bills restrict but payments cascade

---

### 🟡 MEDIUM: Missing NOT NULL Constraints on Derived Totals

**Location:** Multiple tables across modules

**Issue:**
```sql
CREATE TABLE bills (
    id UUID PRIMARY KEY,
    grand_total NUMERIC(12,2) NOT NULL,  -- ✓ Required
    amount_paid NUMERIC(12,2) DEFAULT 0,  -- Missing NOT NULL!
    amount_due NUMERIC(12,2) DEFAULT 0,   -- Missing NOT NULL!
    cgst_total NUMERIC(12,2) DEFAULT 0,   -- Missing NOT NULL!
    ...
);
```

Without `NOT NULL`, these columns can be NULL, but the application assumes they're always numeric. This can cause:
- Silent failures in SUM() aggregates (they ignore NULLs)
- Incorrect calculations if code doesn't check for NULL
- Data consistency issues

**Theoretical Fix:**
```sql
ALTER TABLE bills
  ALTER COLUMN amount_paid SET NOT NULL,
  ALTER COLUMN amount_due SET NOT NULL,
  ALTER COLUMN cgst_total SET NOT NULL,
  ALTER COLUMN sgst_total SET NOT NULL,
  ALTER COLUMN igst_total SET NOT NULL,
  ALTER COLUMN cgst_total SET DEFAULT 0,
  ALTER COLUMN sgst_total SET DEFAULT 0,
  ALTER COLUMN igst_total SET DEFAULT 0;
```

---

### 🟡 MEDIUM: Enum Values Defined But Not Consistently Used

**Location:** Multiple migrations

**Issue:**
```sql
-- Defined in 20260529181127 (inventory)
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'credit', 'mixed', 'bank_transfer', 'cheque');

-- Redefined in 20260531155448 (billing) - COMMENTED OUT
-- CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'credit', 'mixed', 'bank_transfer', 'cheque');

-- But then used across multiple tables:
-- bills.payment_method REFERENCES payment_method
-- purchase_orders.payment_method REFERENCES payment_method
-- expenses.payment_method REFERENCES payment_method
-- cash_book.payment_method REFERENCES payment_method
```

**Problem:**
The `payment_method` enum is used in 4+ tables but only explicitly defined once. If you need to add a new payment method, you must ALTER TYPE enum (which is complex in Postgres).

**Theoretical Fix:**
- Keep the single enum definition in the first migration
- Add a comment in all subsequent migrations that reference it
- Consider adding a trigger that validates enum values are synchronized

---

### 🟡 MEDIUM: orphan_stock_movements reference_id Can Cause Data Loss

**Location:** `20260529181127_init_inventory_module.sql` - stock_movements table

**Issue:**
```sql
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY,
    reference_id UUID,  -- Nullable
    reference_type movement_reference_type,
    ...
);
```

`reference_id` is nullable and there's no foreign key constraint to the actual referenced entity (bill_id, po_id, etc.). This means:
- A stock movement can be created with `reference_type = 'bill'` but invalid `reference_id`
- If the referenced entity is deleted, the movement record remains as a "ghost" record
- Reports querying stock movements by date may include these orphaned records

**Theoretical Fix:**
```sql
-- Add CHECK constraint to ensure reference_id is present when reference_type is not 'opening_stock' or 'manual_adjustment'
ALTER TABLE stock_movements
ADD CONSTRAINT chk_reference_required CHECK (
    CASE 
        WHEN reference_type IN ('opening_stock', 'manual_adjustment') THEN reference_id IS NULL
        ELSE reference_id IS NOT NULL
    END
);
```

---

## 4. Idempotency & Migration Safety

### 🟡 MEDIUM: Migration File 20260530100204 Is a Stub (Empty Migration)

**Location:** `20260530100204_update_item_images_to_array.sql`

**Issue:**
```sql
-- Remove the old single string column
-- ALTER TABLE items DROP COLUMN image_url;

-- -- Add the new array column, defaulting to an empty list
-- ALTER TABLE items ADD COLUMN images TEXT[] DEFAULT '{}';
SELECT 1;
```

The actual migration is commented out, and the file just executes `SELECT 1;` (a no-op). This creates several problems:
1. The migration is recorded as "applied" even though it did nothing
2. Future developers won't know if the `images` column was ever migrated from `image_url`
3. If `image_url` still exists in the schema, it's dead code

**Theoretical Fix:**
- Either uncomment and execute the real migration, or
- Delete this migration file and ensure the `images` column is properly defined in the inventory migration
- Add a comment explaining why this migration is empty (if intentional)

---

### 🟡 MEDIUM: Cascade Trigger (recalculate_tenant_ledger) Has Potential Infinite Loop Protection

**Location:** `20260606171841_init_finance_module.sql` - recalculate_tenant_ledger function

**Issue:**
```sql
CREATE OR REPLACE FUNCTION recalculate_tenant_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- CRITICAL: This prevents infinite loops when the function updates the table
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;
    -- ... recalculates balance_after for ALL rows in the tenant
END;
$$ LANGUAGE plpgsql;
```

**Problems:**
1. If `pg_trigger_depth()` > 1, the function returns NULL and silently does nothing
2. This means if the trigger is fired recursively, it skips the recalculation entirely
3. The `balance_after` values could become stale if multiple operations cascade
4. The trigger updates ALL rows for the tenant every time, which is very expensive

**Theoretical Fix:**
- Instead of recalculating ALL rows on every change, use a state machine approach
- Or use a `CONSTRAINT TRIGGER` that runs at the end of the transaction
- Or implement a materialized view that's refreshed once per transaction

---

### 🟡 MEDIUM: Seed.sql Disables RLS But Doesn't Ensure Re-enabling

**Location:** `supabase/seed.sql` - Lines 1-27

**Issue:**
```sql
-- supabase/seed.sql
ALTER TABLE tenants                DISABLE ROW LEVEL SECURITY;
ALTER TABLE users                  DISABLE ROW LEVEL SECURITY;
-- ... 20+ tables disabled ...

-- (Seeding code here)
-- ... INSERT statements ...

-- ❌ BUT NO RE-ENABLING AT THE END!
```

The seed file disables RLS for all tables to make seeding faster, but never re-enables it. This means:
1. If seeding is run in production, RLS is left disabled
2. If the seed file is run multiple times (idempotent), the second run still has RLS disabled
3. A developer might run this in production and forget to manually re-enable RLS

**Theoretical Fix:**
Add at the end of seed.sql:
```sql
-- ============================================================
-- RE-ENABLE RLS AFTER SEEDING
-- ============================================================
ALTER TABLE tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
-- ... all 20+ tables ...
```

---

### 🟡 MEDIUM: ALTER TABLE item_batches Adds FK Without IF NOT EXISTS

**Location:** `20260601150329_init_purchases_module.sql` - Lines 156-161

**Issue:**
```sql
ALTER TABLE item_batches 
ADD CONSTRAINT fk_item_batches_po 
FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
```

In Postgres, there's no `ADD CONSTRAINT IF NOT EXISTS` syntax. If this migration runs twice (e.g., due to deployment retry), it will fail with "constraint already exists" error.

**Theoretical Fix:**
```sql
-- Create a helper function or use a DO block:
DO $$
BEGIN
    ALTER TABLE item_batches 
    ADD CONSTRAINT fk_item_batches_po 
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```

---

## 5. RPC Function Usage & Dead Code Analysis

### 🟡 MEDIUM: Orphaned RPC Functions (Dead Code)

**Location:** `20260705174137_billing_rpc.sql`

**Issue:**
Two functions are defined but replaced/overridden later in the same file:

1. **`adjust_batch_stock`** - Lines 5-8
   - Defined but not called anywhere in the codebase
   - Status: Likely dead code

2. **`adjust_customer_metrics`** - Lines 11-25
   - Defined but REPLACED by `sync_customer_metrics` at line 28
   - The replace statement: `CREATE OR REPLACE FUNCTION sync_customer_metrics`
   - Status: Dead code (never used, overwritten immediately)

3. **`adjust_supplier_metrics`** in `20260716173909_purchase_rpc.sql`
   - Same pattern as adjust_customer_metrics
   - Status: Dead code

**Impact:**
- These functions consume database space and increase maintenance burden
- Future developers might try to use them, creating confusion
- They document old patterns that are no longer used

**Theoretical Fix:**
- Remove `adjust_batch_stock`, `adjust_customer_metrics`, and `adjust_supplier_metrics` entirely
- Keep only `sync_customer_metrics` and `sync_supplier_metrics`
- Add a comment explaining why the old functions were removed

---

### 🟠 HIGH: RPC Functions Missing Tenant Authorization Checks

**Location:** All query RPCs need updating:
- `get_gst_dashboard` (20260607173346)
- `reconcile_inventory_stock` (20260806153907)
- `get_inventory_dashboard_data` (20260806153907)
- `get_sales_report_data` (20260807142257)
- `get_daily_cash_summaries` (20260717085007)
- `get_top_customers_report` (20260807155552)
- `get_top_suppliers_report` (20260807173609)

**Evidence from Backend:**
The backend calls these RPCs without any additional tenant validation:
```typescript
// From src/lib/api/reports.ts
const { data, error } = await supabase.rpc('get_sales_report_data', {
    p_tenant_id: tenantId,  // Passed directly from request
    p_start_date: startDate,
    p_end_date: endDate
});

// From src/lib/api/finance.ts
const { data, error } = await supabase.rpc('get_gst_dashboard', {
    p_tenant_id: tenantId,  // Could be ANY tenant UUID
    p_start_date: startDate,
    p_end_date: endDate
});
```

**The Problem:**
The backend trusts the `tenantId` from the request without verifying the user has access to that tenant. The RPC also doesn't validate. Combined, this is a complete cross-tenant data leak.

**Theoretical Fix:**
Add to EVERY query RPC:
```sql
CREATE OR REPLACE FUNCTION get_sales_report_data(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_category_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
BEGIN
    -- *** ADD THIS AUTHORIZATION CHECK *** 
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User does not have access to this tenant';
    END IF;
    
    -- ... rest of function ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 🟡 MEDIUM: RPC Functions Using Dynamic SQL Without Proper Parameterization

**Location:** `20260806153907_inventory_rpc.sql` - `get_inventory_dashboard_data`

**Issue:**
```sql
CREATE OR REPLACE FUNCTION get_inventory_dashboard_data(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_granularity TEXT DEFAULT 'day' -- Accepted: 'day', 'week', 'month', 'year'
) RETURNS JSONB AS $$
BEGIN
    -- ...
    SELECT COALESCE(jsonb_agg(chart_row ORDER BY chart_row->>'period' ASC), '[]'::jsonb)
    INTO v_velocity_chart
    FROM (
        SELECT jsonb_build_object(
            'period', date_trunc(p_granularity, created_at),  -- ← Direct parameter use in date_trunc
            ...
        )
```

**Problem:**
The `p_granularity` parameter is used directly in `date_trunc()`. While `date_trunc()` doesn't support SQL injection the same way string concatenation does, this is still risky if the granularity value ever changes to support user-provided input.

**Theoretical Fix:**
Use a CASE statement to whitelist allowed values:
```sql
CASE p_granularity
    WHEN 'day' THEN date_trunc('day', created_at)
    WHEN 'week' THEN date_trunc('week', created_at)
    WHEN 'month' THEN date_trunc('month', created_at)
    WHEN 'year' THEN date_trunc('year', created_at)
    ELSE date_trunc('day', created_at)
END
```

---

## 6. Seed Data Validation

### 🟡 MEDIUM: Seed Data Uses Hardcoded UUIDs Not Matching auth.users

**Location:** `supabase/seed.sql` - Lines 28-36

**Issue:**
```sql
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES 
('99999999-9999-9999-9999-999999999991', 'authenticated', 'authenticated', 'karti@karobar.in', ...),
('99999999-9999-9999-9999-999999999992', 'authenticated', 'authenticated', 'rahul.mgr@raviautol.in', ...),
...

INSERT INTO users (id, email, phone, full_name, avatar_url, created_at) VALUES
('99999999-9999-9999-9999-999999999991', 'karti@karobar.in', ...),
('99999999-9999-9999-9999-999999999992', 'rahul.mgr@raviautol.in', ...),
```

**Problems:**
1. The hardcoded UUID `99999999-9999-9999-9999-999999999991` is used across multiple tables
2. In a production environment, auth.users UUIDs are generated by Supabase Auth, not seeded this way
3. If seeding is run on a database that already has real users, these hardcoded IDs might collide
4. The encrypted_password is set to the literal string `'encrypted_password'` instead of an actual hashed value

**Theoretical Fix:**
- Use `gen_random_uuid()` for inserting test data, or
- Use environment variables for test user IDs, or
- Document that seed.sql is development-only and should never run in production
- For password hashing, use the actual hashing function or leave auth.users creation to Supabase Auth

---

### 🟡 MEDIUM: Seed Data Assumes Enum Values Match Schema

**Location:** `supabase/seed.sql` - Payment methods, user roles, bill status

**Issue:**
Seed data inserts values like:
```sql
INSERT INTO tenant_memberships (..., role, ...) VALUES (..., 'owner', ...);
INSERT INTO bills (..., status, payment_method, ...) VALUES (..., 'draft', 'cash', ...);
```

These rely on the enum definitions being exactly as expected. If an enum is modified in a migration but seed.sql is not updated, the seed will fail silently or insert invalid data.

**Theoretical Fix:**
- Add validation checks after seeding:
  ```sql
  -- Validate that all payment methods are valid
  SELECT DISTINCT payment_method FROM bills 
  WHERE payment_method NOT IN ('cash', 'upi', 'card', 'credit', 'mixed', 'bank_transfer', 'cheque');
  ```

---

### 🟡 MEDIUM: Seed Data References Non-Existent Foreign Keys

**Location:** `supabase/seed.sql` - Various foreign key relationships

**Issue:**
Several insert statements reference UUIDs that may not exist if the seed order is wrong:
```sql
INSERT INTO item_batches (..., po_id, ...) VALUES (..., NULL, ...);  -- OK, nullable
INSERT INTO bills (..., customer_id, ...) VALUES (..., <customer-uuid>, ...);  -- Must exist
```

If the seed file inserts customer data after bills, the FK constraint will fail.

**Theoretical Fix:**
- Document the insertion order in comments
- Add explicit FK validation checks at the end:
  ```sql
  SELECT COUNT(*) FROM bills b WHERE NOT EXISTS (SELECT 1 FROM customers WHERE id = b.customer_id);
  ```

---

## Summary Table: Issues by Severity

| Severity | Count | Impact |
|---|---|---|
| 🔴 CRITICAL | 3 | Cross-tenant data leaks, RLS bypass, authorization bypass |
| 🟠 HIGH | 7 | Performance degradation, data inconsistency, security gaps |
| 🟡 MEDIUM | 6 | Maintenance issues, edge cases, documentation gaps |
| **TOTAL** | **16** | **Recommended: Immediate action on CRITICAL items** |

---

## Recommended Action Plan

### Phase 1: CRITICAL Security Fixes (1-2 days)
1. Remove dangerous GRANT privileges to `anon` role
2. Add tenant isolation validation to all query RPCs
3. Refactor RLS policies to use consistent `auth.uid()` pattern instead of `current_setting()`

### Phase 2: HIGH Priority Fixes (2-3 days)
1. Add WITH CHECK clauses to all INSERT/UPDATE RLS policies
2. Create performance indexes on foreign keys and common filter combinations
3. Fix RLS policy for tenant_invitations email spoofing
4. Enable RLS on credit_ledger table
5. Add security_invoker to views

### Phase 3: MEDIUM Priority Fixes (1 week)
1. Clean up dead code (adjust_* functions)
2. Add NOT NULL constraints to derived totals
3. Document and fix cascade delete patterns
4. Complete seed.sql with RLS re-enabling
5. Fix migration idempotency issues

### Phase 4: Testing & Validation (Ongoing)
1. Test cross-tenant data access attempts
2. Test RPC functions with unauthorized users
3. Performance test large dataset queries with new indexes
4. Test migration idempotency by running migrations twice

---

## Files Requiring Updates

**High Priority:**
- `supabase/migrations/20260611181406_grant_prev.sql` - Remove dangerous grants
- `supabase/migrations/20260607173346_gst_rpc.sql` - Add tenant validation
- `supabase/migrations/20260806153907_inventory_rpc.sql` - Add tenant validation
- `supabase/migrations/20260807142257_sales_report_rpc.sql` - Add tenant validation
- `supabase/migrations/20260807155552_customer_report_rpc.sql` - Add tenant validation
- `supabase/migrations/20260807173609_supplier_report_rpc.sql` - Add tenant validation
- `supabase/migrations/20260717085007_payment_rpc.sql` - Add tenant validation

**Medium Priority:**
- `supabase/seed.sql` - Add RLS re-enabling
- `supabase/migrations/20260529181127_init_inventory_module.sql` - Add view security, add FK indexes
- `supabase/migrations/20260531155448_init_billing_module.sql` - Fix RLS WITH CHECK, add FK indexes
- `supabase/migrations/20260601150329_init_purchases_module.sql` - Fix RLS WITH CHECK, add FK indexes

---

## Verification Checklist

- [ ] All RLS policies use auth.uid() or include explicit tenant validation
- [ ] No blanket GRANT privileges exist for anon role
- [ ] All query RPCs validate user has access to requested tenant
- [ ] All INSERT/UPDATE policies include WITH CHECK clauses
- [ ] All views specify security_invoker = true
- [ ] All foreign keys have indexes
- [ ] Seed.sql re-enables RLS at the end
- [ ] No dead/orphaned RPC functions remain
- [ ] Migration files are idempotent (can run multiple times)
- [ ] credit_ledger has RLS enabled and policies defined

---

**End of Audit Report**
