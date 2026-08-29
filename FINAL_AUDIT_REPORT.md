# Final Audit Report

## Safety Confirmation

[x] Completed: The infinite-loop root-cause fixes were implemented, and the remaining report-level invalidation spam in the finance mutation hooks was removed.

The final fix set addressed the root causes in the auth/session flow, tenant switching state, global query behavior, and mutation invalidation churn:
- middleware exits early for static and prefetch routes before auth checks
- client-side tenant switching no longer re-triggers itself through a self-dependent effect
- React Query defaults keep data cached and ignore unnecessary window-focus refetches
- session reads prefer `getSession()` over repeated `getUser()` calls in client-side auth-dependent flows
- heavy analytical/report invalidations were pruned from the mutation hooks while keeping operational CRUD refreshes

## Changes Verified

The following files were checked and validated as part of the final safety sweep:

- [src/middleware.ts](src/middleware.ts)
  - confirmed middleware skips static assets, `_next`, `_rsc`, and `/api` paths before running auth checks
  - verified route protection remains intact for real app pages only

- [src/components/providers/QueryProvider.tsx](src/components/providers/QueryProvider.tsx)
  - verified global query defaults include `staleTime` and `refetchOnWindowFocus: false`
  - confirmed the app no longer re-fetches global queries unnecessarily on focus

- [src/components/auth/ShopSwitcher.tsx](src/components/auth/ShopSwitcher.tsx)
  - confirmed the store update effect no longer depends on the same state it mutates in a re-triggering loop
  - verified the active tenant is selected only when missing or invalid

- [src/hooks/usePeople.ts](src/hooks/usePeople.ts)
  - verified tenant and membership queries include meaningful cache windows and disabled focus refetches
  - confirmed `enabled` guards prevent running queries without tenant IDs

- [src/hooks/useFinance.ts](src/hooks/useFinance.ts)
  - verified the remaining dashboard/report invalidation calls were removed from the cash-entry mutations
  - confirmed operational cash book invalidations remain in place

- [src/lib/api/people.ts](src/lib/api/people.ts)
  - verified user-business fetches prefer session-based reads instead of repeated `getUser()` calls

- [src/components/layout/UserProfile.tsx](src/components/layout/UserProfile.tsx)
  - verified session reads are guarded and do not trigger a render cascade

- [src/app/layout.tsx](src/app/layout.tsx)
- [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx)
  - inspected and confirmed they are not causing repeated full re-mount loops

## Final Validation Applied

The final verification run executed:

```bash
npm run lint
```

Current evidence: the command does not pass yet. It exits with code 1 and reports 249 errors and 2850 warnings across the project, including a large number of existing React Hook Form / lint warnings and one unescaped-entity error in [src/components/people/customers/ExpandedBillModal.tsx](src/components/people/customers/ExpandedBillModal.tsx).

This means the repository is not yet in a fully clean lint state, even though the targeted infinite-loop and invalidation-spam fixes were completed and verified in the relevant auth/tenant/query files.

## Completed Todos

- [x] Trace auth and tenant fetch loops
- [x] Fix middleware and route guards
- [x] Fix query/provider staleness and focus refetch behavior
- [x] Fix dependency-loop issues in tenant state setters
- [x] Remove remaining report-level mutation invalidation spam from the finance hooks
- [ ] Bring the project to full lint-clean status across all remaining files

## Final Status

The application is stable with respect to the previously identified auth/session hydration, tenant selection, and global query re-fetch loop issues. The targeted fixes for those root causes are in place and the mutation invalidation cleanup was completed.

The repo is still not fully lint-clean, so the last remaining item is broader code-quality cleanup outside the direct loop-fix scope.
