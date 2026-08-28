# PostgreSQL/Supabase Security Audit

**Date:** 2026-08-27  
**Scope:** 16 migration files under `supabase/migrations`  
**Conclusion:** **Not production-ready.** Tenant isolation is inconsistent, several RLS policies are incomplete, and privileged functions expose integrity risks.

## CRITICAL VULNERABILITIES

### 1. RLS policies permit tenant reassignment

`FOR ALL` policies lack `WITH CHECK` on:

- `users` via `FOR ALL USING` only: [inventory migration](supabase/migrations/20260529181127_init_inventory_module.sql#L308)
- `item_batches`: [inventory migration](supabase/migrations/20260529181127_init_inventory_module.sql#L297)
- `expense_categories`: [finance migration](supabase/migrations/20260606171841_init_finance_module.sql#L181)
- `expenses`: [finance migration](supabase/migrations/20260606171841_init_finance_module.sql#L190)

For `UPDATE`, `USING` protects the existing row, while `WITH CHECK` protects the new row. Without it, callers may change `tenant_id` or other ownership fields.

### 2. RLS-enabled operational tables have no usable policy

These tables are RLS-enabled but have no active policy granting authenticated access:

- `stock_movements`: RLS enabled but no policy follows it: [inventory migration](supabase/migrations/20260529181127_init_inventory_module.sql#L268)
- `to_purchase_list`: RLS enabled without an active policy: [purchases migration](supabase/migrations/20260601150329_init_purchases_module.sql#L190)
- `cash_book`: RLS enabled, but only other finance tables receive policies: [finance migration](supabase/migrations/20260606171841_init_finance_module.sql#L152)

This currently causes silent denial of access, but future policy additions or bypassing functions could expose these tables unexpectedly.

### 3. Dangerous default privileges for `anon`

All current and future public tables grant `SELECT` to unauthenticated users: [grant migration](supabase/migrations/20260611181406_grant_prev.sql#L7-L18)

RLS still applies, so this is not an immediate bypass. However, any future table created without RLS becomes publicly readable automatically. This is a serious privilege-drift vulnerability.

### 4. Public `SECURITY DEFINER` trigger function lacks hardened `search_path`

`handle_new_user()` is `SECURITY DEFINER` but does not set a fixed search path: [inventory migration](supabase/migrations/20260529181127_init_inventory_module.sql#L69-L82)

Its `REVOKE EXECUTE` is commented out: [inventory migration](supabase/migrations/20260529181127_init_inventory_module.sql#L253)

Fix by setting `search_path = public` or an explicit trusted schema and revoking execution from `PUBLIC`, `anon`, and `authenticated`.

### 5. Inventory reconciliation accepts inconsistent quantities

`reconcile_inventory_stock()` does not verify that:

- allocation quantities equal the requested negative adjustment;
- allocated batches contain sufficient stock;
- every allocation belongs to the requested item;
- the resulting quantity is non-negative.

The function can therefore mutate stock and write an audit record whose `qty_after` does not reflect actual batch stock changes: [inventory RPC](supabase/migrations/20260806153907_inventory_rpc.sql#L31-L75)

### 6. Invitation acceptance is not bound to the invited email

`accept_tenant_invitation()` validates only the bearer token and authenticated user, not that the user’s verified email matches the invitation email: [authentication RPC](supabase/migrations/20260819050403_authentication_rpc.sql#L121-L158)

A leaked token can be redeemed by any authenticated account. Add an explicit email comparison before creating membership.

## ARCHITECTURAL WARNINGS

### 1. Tenant consistency is not enforced across foreign keys

Tables duplicate `tenant_id` while referencing tenant-owned parents only by single-column IDs. Examples include:

- `bills.tenant_id` and `bills.customer_id`
- `payments.tenant_id` and `payments.bill_id`
- `purchase_orders.tenant_id` and `supplier_id`
- `supplier_payments.tenant_id` and `po_id`

Nothing prevents a row in Tenant A from referencing a customer, bill, supplier, or order from Tenant B if its UUID is known. Add composite tenant-aware foreign keys or enforce consistency in trusted functions.

### 2. Broad `FOR ALL` policies exceed the stated RBAC model

Several tables allow every authenticated tenant member to insert, update, and delete: [billing policies](supabase/migrations/20260531155448_init_billing_module.sql#L194-L230) and [purchase policies](supabase/migrations/20260601150329_init_purchases_module.sql#L200-L237)

The finance module restricts some writes to owners/managers, but billing, purchasing, inventory batches, and credit ledger do not consistently do so. This is an RBAC inconsistency.

### 3. Inactive memberships are accepted by some policies

Tenant and finance read policies query `tenant_memberships` without `is_active = true`: [tenant policy](supabase/migrations/20260529181127_init_inventory_module.sql#L314-L317) and [finance policies](supabase/migrations/20260606171841_init_finance_module.sql#L178-L197)

A deactivated member may retain read access through these policies.

### 4. Cascading tenant deletion is highly destructive

`tenants` cascades into memberships, inventory, billing, purchasing, finance, and historical records: [inventory tables](supabase/migrations/20260529181127_init_inventory_module.sql#L41-L162)

This may be intentional for account deletion, but it permanently destroys financial history. Prefer soft deletion or an explicit archival workflow.

Supplier deletion is correctly protected by `RESTRICT` for purchase orders: [purchases migration](supabase/migrations/20260601150329_init_purchases_module.sql#L40-L42). However, deleting a purchase order cascades supplier payments: [purchases migration](supabase/migrations/20260601150329_init_purchases_module.sql#L135-L145)

### 5. Auth-user deletion behavior is inconsistent

Some references use `ON DELETE CASCADE`, while many references to `auth.users` use the default `NO ACTION`, including expenses, cash entries, bills, suppliers, and customers. User deletion may therefore fail depending on related records.

### 6. Stub migrations are recorded as applied without performing changes

These migrations execute only `SELECT 1`: [image migration](supabase/migrations/20260530100204_update_item_images_to_array.sql#L1-L8) and [purchase update migration](supabase/migrations/20260620123312_upd_purchase_tables.sql#L1-L17)

This creates schema-history drift and should be resolved before production deployment.

## PERFORMANCE & INDEXING

Missing or weakly indexed foreign-key/query columns include:

- `tenant_invitations.tenant_id` and `invited_by`
- `tenant_memberships.invited_by`
- `categories.parent_id`
- `stock_movements.created_by`
- `expenses.recorded_by`
- `cash_book.recorded_by`

Existing indexes, but not the missing ones, are shown in [inventory indexes](supabase/migrations/20260529181127_init_inventory_module.sql#L214-L235) and [finance indexes](supabase/migrations/20260606171841_init_finance_module.sql#L198-L209)

Additional performance concerns:

- RLS repeatedly evaluates membership subqueries per row.
- `stock_movements(type, created_at)` omits `tenant_id`, despite tenant-scoped analytics: [inventory indexes](supabase/migrations/20260529181127_init_inventory_module.sql#L233-L235)
- Several report queries apply `DATE(created_at)`, preventing efficient use of a normal timestamp index: [GST RPC](supabase/migrations/20260607173346_gst_rpc.sql#L91-L105)
- Report RPCs aggregate large tenant datasets repeatedly and lack explicit maximum date-range validation.

## ALL CLEAR

These controls are correctly implemented:

- All currently created operational tables have `ENABLE ROW LEVEL SECURITY`, including `credit_ledger`.
- Billing and purchasing tenant policies generally include both `USING` and `WITH CHECK`.
- The six report/dashboard RPCs validate active tenant membership before querying: [GST RPC](supabase/migrations/20260607173346_gst_rpc.sql#L42-L51)
- Privileged RPCs generally revoke execution from `public` and `anon`.
- Active `SECURITY DEFINER` RPCs use `SET search_path = public`, except `handle_new_user()`.
- Inventory and finance views use `security_invoker`: [inventory view](supabase/migrations/20260529181127_init_inventory_module.sql#L195-L203)
- Historical supplier and customer parent records use `RESTRICT` in important relationships.
- Most primary foreign keys used by billing and purchasing queries have supporting indexes.

## Priority Remediation Order

1. Fix every `FOR ALL` policy missing `WITH CHECK`.
2. Add policies for `stock_movements`, `to_purchase_list`, and `cash_book`.
3. Remove blanket `anon` default table grants.
4. Harden `handle_new_user()` and revoke direct execution.
5. Bind invitation tokens to verified email addresses.
6. Enforce tenant-consistent foreign keys.
7. Add the missing foreign-key and tenant-scoped indexes.
