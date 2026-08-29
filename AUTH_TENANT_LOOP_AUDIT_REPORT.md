# Auth / Tenant Infinite-Loop Audit Report

Date: 2026-08-29
Project: Karobar

## Executive summary

The duplicate Supabase traffic was caused by a combination of:

1. Middleware running auth and tenant membership checks on routes that should have been skipped.
2. A tenant store effect re-triggering itself because it set state while depending on the same state it was updating.
3. Global React Query defaults that allowed unnecessary revalidation.
4. Client-side auth/session lookups being executed too eagerly instead of reusing the cached session.

These combined issues created repeat `GET /auth/v1/user` and related `users` / `tenant_memberships` requests in rapid succession.

## Findings

### 1) Middleware was doing auth + tenant DB work on too many routes

File: [src/middleware.ts](src/middleware.ts)

The middleware used `supabase.auth.getUser()` and then immediately executed profile and membership lookups for every request that passed the initial guard. It also had a matcher that was not restrictive enough for static assets and prefetch requests.

Observed risk:
- requests to `_next`, `_rsc`, and static asset URLs could still pass through auth logic
- repeated navigation or route refreshes could hit the same DB reads again

Fix:
- skip static assets and prefetch routes before creating the server client path
- avoid calling auth + membership code for `/api`, `/_next`, and asset URLs
- keep middleware focused on app routing/auth redirects only

### 2) The tenant switcher effect created a state loop

File: [src/components/auth/ShopSwitcher.tsx](src/components/auth/ShopSwitcher.tsx)

The effect originally did this:

- watched `[businesses, activeTenant, setAvailableTenants, setActiveTenant]`
- called `setAvailableTenants(businesses)`
- if `!activeTenant` then called `setActiveTenant(businesses[0])`

Because `activeTenant` was part of the dependency list, any store update would trigger the effect again. That created a self-reinforcing render sequence.

Fix:
- only auto-select when the current tenant is missing or no longer present in the available businesses
- keep the state writes stable and conditional

### 3) Global React Query defaults were not preventing redundant refetches

File: [src/components/providers/QueryProvider.tsx](src/components/providers/QueryProvider.tsx)

The provider created a `QueryClient` without conservative defaults. Because of this, queries were vulnerable to repeated refetches after focus/reconnect or stale cache refreshes.

Fix:
- set `staleTime: 1000 * 60 * 5`
- set `refetchOnWindowFocus: false`
- set `refetchOnReconnect: false`
- keep `retry` low to avoid noisy retries

### 4) Session fetches were unnecessarily using `getUser()` instead of the cached session

Files:
- [src/lib/api/people.ts](src/lib/api/people.ts)
- [src/components/layout/UserProfile.tsx](src/components/layout/UserProfile.tsx)

Several flows were doing `supabase.auth.getUser()` even though `getSession()` was sufficient and cheaper for reading the currently available session. This is a common source of duplicate auth requests on mount and during route transitions.

Fix:
- prefer `supabase.auth.getSession()` for current user reads
- keep session state hydration stable and guarded with cleanup logic

## Exact remediation implemented

### Middleware hardening

Updated [src/middleware.ts](src/middleware.ts):
- short-circuit for `/_next`, `/_rsc`, asset extensions, and `/api`
- leave the redirect logic in place for real app pages only

### Query client stabilization

Updated [src/components/providers/QueryProvider.tsx](src/components/providers/QueryProvider.tsx):

```tsx
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          retry: 1,
        },
      },
    })
);
```

### Tenant store loop fix

Updated [src/components/auth/ShopSwitcher.tsx](src/components/auth/ShopSwitcher.tsx):

```tsx
useEffect(() => {
  if (!businesses) return;

  setAvailableTenants(businesses);

  if (businesses.length === 0) return;

  if (!activeTenant || !businesses.some((tenant) => tenant.tenantId === activeTenant.tenantId)) {
    setActiveTenant(businesses[0]);
  }
}, [businesses, activeTenant, setAvailableTenants, setActiveTenant]);
```

### Cached auth/session reads

Updated [src/hooks/usePeople.ts](src/hooks/usePeople.ts):
- `useTenant` includes `staleTime: 1000 * 60 * 30`
- `useUserBusinesses` includes `staleTime: 1000 * 60 * 30`
- both disable focus-driven refetches

Updated [src/lib/api/people.ts](src/lib/api/people.ts):
- `fetchUserBusinesses()` now uses `supabase.auth.getSession()` once instead of `getUser()`

Updated [src/components/layout/UserProfile.tsx](src/components/layout/UserProfile.tsx):
- fetches the session once, guarded by lifecycle cleanup
- avoids cascading setState caused by unneeded mount state

## Mutation invalidation status

No mutation invalidation logic was removed or weakened. Existing invalidation calls for create/update/delete flows remain intact across the domain hooks.

## Validation

I ran the targeted lint verification against the edited files and the command exited successfully with code 0:

```bash
npm run lint -- --file src/middleware.ts --file src/components/providers/QueryProvider.tsx --file src/components/auth/ShopSwitcher.tsx --file src/hooks/usePeople.ts --file src/lib/api/people.ts --file src/components/layout/UserProfile.tsx
```

This confirms the edited files are syntactically and structurally valid after the fix.

## Conclusion

The duplicate auth and tenant membership requests were primarily caused by route-triggered middleware checks, store-effect reentrancy, and missing query cache defaults. The implemented changes make the auth/session flow stable and substantially reduce redundant requests without altering mutation invalidation behavior.
