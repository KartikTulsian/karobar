# React Query Cache Invalidation Audit

**Date:** 2026-08-28  
**Scope:** Custom hooks under `src/hooks`  
**Status:** Cache invalidation gaps found

## Executive Summary

The reviewed mutations generally use valid query-key prefixes, but several mutations do not invalidate all datasets affected by their server-side changes. The main gaps affect inventory reports, financial dashboards, payment-related ledgers and unpaid documents, and deleted document detail queries.

## Confirmed Bugs

### 1. Inventory item CRUD does not refresh inventory reports

**File:** [useInventory.ts](src/hooks/useInventory.ts)

**Affected hooks:**

- `useCreateItem` at line 72
- `useUpdateItem` at line 89
- `useDeleteItem` at line 103

Add this invalidation to each affected `onSuccess` callback:

```ts
queryClient.invalidateQueries({ queryKey: ['reports', 'inventory', tenantId] });
```

`useUpdateItem` already creates `invalidateReport`, but the call is commented out at line 92.

### 2. Billing updates and deletes do not refresh financial dashboards

**File:** [useBilling.ts](src/hooks/useBilling.ts)

**Affected hooks:**

- `useUpdateBill` at line 65
- `useDeleteBill` at line 81
- `useUpdateSalesReturn` at line 136
- `useDeleteSalesReturn` after line 149

Add:

```ts
queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', tenantId] });
queryClient.invalidateQueries({ queryKey: ['gst_dashboard', tenantId] });
```

The existing `['pnl-dashboard']` and `['gst_dashboard']` calls in create and return-create mutations are valid TanStack Query prefixes and match tenant-specific query keys.

### 3. Deleted bills do not invalidate the specific bill query

`useDeleteBill` receives `billId` but discards it at [useBilling.ts](src/hooks/useBilling.ts#L73-L75).

Use the mutation variable and add:

```ts
onSuccess: (_, billId) => {
    queryClient.invalidateQueries({ queryKey: ['bill', billId, tenantId] });
}
```

Keep the existing list invalidation.

### 4. Purchase order updates and deletes miss dashboard invalidation

**File:** [usePurchases.ts](src/hooks/usePurchases.ts)

**Affected hooks:**

- `useUpdatePurchaseOrder` at line 108
- `useDeletePurchaseOrder` at line 122

Add:

```ts
queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', tenantId] });
queryClient.invalidateQueries({ queryKey: ['gst_dashboard', tenantId] });
```

### 5. Deleted purchase orders do not invalidate the specific document query

`useDeletePurchaseOrder` receives `poId` but discards it at [usePurchases.ts](src/hooks/usePurchases.ts#L115-L118).

Use the mutation variable and add:

```ts
onSuccess: (_, poId) => {
    queryClient.invalidateQueries({ queryKey: ['purchase_order', poId, tenantId] });
}
```

Keep the existing list invalidation.

### 6. Purchase return updates and deletes miss financial dashboard invalidation

**File:** [usePurchases.ts](src/hooks/usePurchases.ts)

**Affected hooks:**

- `useUpdatePurchaseReturn` at line 166
- `useDeletePurchaseReturn` at line 181

Add:

```ts
queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', tenantId] });
queryClient.invalidateQueries({ queryKey: ['gst_dashboard', tenantId] });
```

### 7. Payment mutations omit credit ledger and unpaid-document caches

**File:** [useFinance.ts](src/hooks/useFinance.ts)

**Affected hooks:**

- `useRecordPaymentBatch` at lines 258-275
- `useUpdatePaymentBatch` at lines 288-305
- `useDeletePaymentBatch` at lines 318-335

For customer payments, add:

```ts
queryClient.invalidateQueries({
    queryKey: ['credit_ledger', variables.tenantId, 'customer', variables.data.entity_id],
});
queryClient.invalidateQueries({
    queryKey: ['unpaid_documents', variables.tenantId, 'customer', variables.data.entity_id],
});
```

For supplier payments, add:

```ts
queryClient.invalidateQueries({
    queryKey: ['credit_ledger', variables.tenantId, 'supplier', variables.data.entity_id],
});
queryClient.invalidateQueries({
    queryKey: ['unpaid_documents', variables.tenantId, 'supplier', variables.data.entity_id],
});
```

For `useDeletePaymentBatch`, use `variables.entityType` and `variables.entityId` instead of `variables.data`.

### 8. Cash entry mutations do not refresh the P&L dashboard

**File:** [useFinance.ts](src/hooks/useFinance.ts)

**Affected hooks:**

- `useCreateCashEntry` at lines 183-184
- `useUpdateCashEntry` at lines 195-196
- `useDeleteCashEntry` at lines 207-208

Add:

```ts
queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
```

## Exact Key Matching Results

These existing invalidations correctly match their corresponding query keys:

- `['inventory', 'items', tenantId]`
- `['bill', billId, tenantId]`
- `['purchase_order', poId, tenantId]`
- `['customers', tenantId]`
- `['suppliers', tenantId]`
- `['cash_book', tenantId]`
- `['daily_cash_summaries', tenantId]`
- `['expense_categories', tenantId]`
- `['to_purchase_list', tenantId]`

Prefix invalidations such as `['customer_profile']`, `['bill']`, and `['supplier_profile']` are effective because TanStack Query matches descendant keys by default.

## Mutation Callback Coverage

Every reviewed `useMutation` has an `onSuccess` callback. The identified problems are incomplete invalidation coverage, not missing callbacks.

## Recommended Fix Order

1. Add inventory report invalidation to all item mutations.
2. Add P&L and GST invalidation to billing and purchasing update/delete mutations.
3. Invalidate `credit_ledger` and `unpaid_documents` after payment mutations.
4. Preserve IDs in delete mutations and invalidate the affected detail queries.
5. Refresh P&L after cash entry mutations.
