# Post-Remediation Authentication, Middleware & Request Flow Verification Report

## 1. Remediation Scorecard

| Original Finding | Severity | Target File | Status (Resolved / Partially Resolved / Unresolved / Regression) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Middleware performed expensive auth + DB lookups on every protected route | Critical | [src/middleware.ts](src/middleware.ts#L4-L118) | Resolved | The direct `supabase.from('users')` and `supabase.from('tenant_memberships')` reads were removed from middleware. The middleware now only performs a session check and route gating. |
| Cookie sync was unsafe and could drop chunked Supabase session cookies | Critical | [src/middleware.ts](src/middleware.ts#L20-L52) | Regression / Partially Resolved | The file now uses `getAll()` and `setAll()`, but `setAll()` mutates `request.cookies` and references `name`/`value` variables that are not in scope. This is still not canonical and can fail at runtime. |
| Internal RSC/prefetch traffic was not excluded from middleware | High | [src/middleware.ts](src/middleware.ts#L7-L18), [src/middleware.ts](src/middleware.ts#L126-L130) | Resolved | `request.nextUrl.searchParams.has('_rsc')` is added to the static-route bypass and the matcher excludes `_rsc` internally. |
| Redirect logic bounced users across auth/onboarding/dashboard | High | [src/middleware.ts](src/middleware.ts#L64-L80), [src/app/(auth)/onboarding/page.tsx](src/app/(auth)/onboarding/page.tsx#L10-L31), [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx#L5-L39) | Resolved | Middleware is now narrow and only enforces protected-route access. Server-side dashboard and onboarding checks handle onboarding flow, reducing redirect churn. |
| Duplicate auth/profile checks existed across route tree and client UI | High | [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx#L5-L39), [src/components/layout/UserProfile.tsx](src/components/layout/UserProfile.tsx#L16-L33) | Partially Resolved | The authoritative gate moved into the dashboard server layout, but browser profile/session reads still exist and some duplication remains in onboarding logic. |
| OAuth and reset flows used localhost fallback values | High | [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L72-L110) | Unresolved | Fallback to `http://localhost:3000` is still present in the OAuth/reset redirect builders. |
| Email normalization was inconsistent | Medium | [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L7-L41), [src/components/auth/LoginForm.tsx](src/components/auth/LoginForm.tsx#L24-L57), [src/components/auth/SignUpForm.tsx](src/components/auth/SignUpForm.tsx#L24-L48) | Partially Resolved | Sign-up and browser-side login now trim/lowercase email consistently, but `signInWithPasswordAction` still only trims and does not lowercase. |
| `updateHumanProfileAction` returned redirect-like behavior inside client-consumed server action | Medium | [src/actions/profile.actions.ts](src/actions/profile.actions.ts#L7-L59) | Resolved | It returns `{ success: true }` and does not `redirect()` from within the server action. |
| `createBusinessAccountAction` missed revalidation after shop creation | Medium | [src/actions/tenant.actions.ts](src/actions/tenant.actions.ts#L5-L80) | Unresolved | No `revalidatePath('/', 'layout')` call is present after business creation. |
| `acceptStaffInviteAction` and `claimCustomerProfileAction` needed layout invalidation | Medium | [src/actions/onboarding.actions.ts](src/actions/onboarding.actions.ts#L6-L90) | Resolved | Both functions call `revalidatePath('/', 'layout')` after membership generation. |
| Callback dual flow had no destination sanitization | High | [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L5-L44) | Unresolved | `next` is accepted as-is and inserted into redirects without any allowlist or normalization. |
| Client auth success handlers raced server redirects | Medium | [src/components/auth/LoginForm.tsx](src/components/auth/LoginForm.tsx#L25-L57), [src/components/auth/SignUpForm.tsx](src/components/auth/SignUpForm.tsx#L25-L48), [src/app/(auth)/update-password/page.tsx](src/app/(auth)/update-password/page.tsx#L17-L36) | Resolved | `router.refresh()` precedes `router.push()` in login/sign-up flows, reducing stale cache issues. |
| Sign-up routed through `/dashboard` instead of onboarding | Medium | [src/components/auth/SignUpForm.tsx](src/components/auth/SignUpForm.tsx#L25-L48) | Resolved | New sign-ups now go to `/onboarding/profile` directly. |
| Duplicate sign-in/sign-up links remained in social login area | Low | [src/components/auth/LoginForm.tsx](src/components/auth/LoginForm.tsx#L93-L114), [src/components/auth/SignUpForm.tsx](src/components/auth/SignUpForm.tsx#L92-L116) | Resolved | The duplicate social-link JSX blocks were commented out and removed from the rendered output. |
| `CustomerClaimsCard` and `PendingInvitesCard` missed store reset / refresh after accept/connect | Medium | [src/components/auth/CustomerClaimsCard.tsx](src/components/auth/CustomerClaimsCard.tsx#L10-L22), [src/components/auth/PendingInvitesCard.tsx](src/components/auth/PendingInvitesCard.tsx#L10-L22) | Resolved | Both clear store state and refresh the router after successful action execution. |

---

## 2. Deep Dive: Remaining Issues & Regressions

### Issue 1 — Cookie sync still violates the canonical Supabase SSR pattern

- File & Line Reference: [src/middleware.ts](src/middleware.ts#L20-L52)
- Observed Behavior:
  1. The middleware creates `supabaseResponse = NextResponse.next(...)` and then reuses it.
  2. The `setAll` adapter writes to `request.cookies.set(...)` before writing to `supabaseResponse.cookies.set(...)`.
  3. In the callback, the code references `name`, which is not a parameter of `setAll(cookiesToSet)`, so a runtime `ReferenceError` is possible whenever the library invokes this callback.
  4. That makes the cookie refresh path unsafe even though the file superficially matches the `getAll`/`setAll` API shape.
- Code Snippet Evidence:
  - `setAll(cookiesToSet) {` in [src/middleware.ts](src/middleware.ts#L30-L39)
  - `console.log([Middleware Debug] Setting Auth Cookie: ${name});` in [src/middleware.ts](src/middleware.ts#L31-L32)
  - `cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));` in [src/middleware.ts](src/middleware.ts#L32-L35)

### Issue 2 — `NEXT_PUBLIC_SITE_URL` fallback still preserves an unsafe localhost default

- File & Line Reference: [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L72-L110)
- Observed Behavior:
  1. OAuth and password reset links still default to `http://localhost:3000` when the environment variable is absent.
  2. In production or staging, this can generate redirect URLs that route users to the wrong origin or fail callback validation.
  3. This is a remaining production-risk issue even though the code is not as severe as the earlier database spike.
- Code Snippet Evidence:
  - `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L75-L76)
  - `redirectTo: \\`${siteUrl}/callback?next=/onboarding\\`` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L77-L83)
  - `redirectTo: \\`${siteUrl}/callback?next=/update-password\\`` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L101-L108)

### Issue 3 — `next` destination remains unsanitized in the auth callback route

- File & Line Reference: [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L5-L44)
- Observed Behavior:
  1. The callback reads `next` directly from the query string.
  2. That value is used in a server-side redirect without validating it against a trusted allowlist.
  3. If a malicious or malformed destination is supplied, the user can be redirected outside the app or into a broken state.
- Code Snippet Evidence:
  - `const next = searchParams.get('next') ?? '/dashboard';` in [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L7-L11)
  - `return NextResponse.redirect(`${origin}${next}`);` in [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L20-L27)
  - `return NextResponse.redirect(`${origin}${next}`);` in [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L33-L40)

### Issue 4 — `createBusinessAccountAction` still does not invalidate layout cache after business creation

- File & Line Reference: [src/actions/tenant.actions.ts](src/actions/tenant.actions.ts#L5-L80)
- Observed Behavior:
  1. The server action creates the tenant and returns success to the client.
  2. It does not call `revalidatePath('/', 'layout')` or an equivalent invalidation step.
  3. This can leave stale layout state in the navigation, especially when the user is immediately redirected to the dashboard.
- Code Snippet Evidence:
  - `return { success: true, tenant: activeTenant };` in [src/actions/tenant.actions.ts](src/actions/tenant.actions.ts#L58-L66)
  - No `revalidatePath` call appears anywhere in this function.

### Issue 5 — Email normalization remains incomplete in the server action path

- File & Line Reference: [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L7-L41)
- Observed Behavior:
  1. Sign-up already lowers case server-side.
  2. Sign-in still only trims the email and does not call `.toLowerCase()`.
  3. If a user enters uppercase or whitespace-padded email values, inconsistent login state can still occur.
- Code Snippet Evidence:
  - `const email = (formData.get("email") as string).trim();` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L7-L9)
  - `const email = (formData.get("email") as string).trim().toLowerCase();` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L37-L41)

---

## 3. Estimated Request Footprint Comparison

Assume a dashboard landing page with 15 sidebar links and a user who is already authenticated.

### Before remediation

- Middleware executed on the route request.
- Middleware performed:
  - 1 `auth.getUser()` call
  - 1 `users` query
  - 1 `tenant_memberships` query
- If the page triggered internal route prefetches or RSC fetches, each such request could repeat the same sequence.
- With 15 sidebar links / internal navigations, rough estimated Supabase footprint was:
  - 1 auth request + 2 DB reads per route hit
  - 15 prefetched links × (1 auth + 2 DB reads) ≈ 45 to 60 Supabase calls in a short burst
- That was consistent with the report of 500+ requests under a minute when navigation churn was high.

### After remediation

- Middleware now performs only the minimal auth/session check and route guard.
- The dashboard server layout still performs the authoritative profile and membership validation once per actual dashboard render:
  - 1 `auth.getUser()`
  - 1 `users` lookup
  - 1 `tenant_memberships` lookup
- If internal RSC traffic is excluded correctly, the expected actual Supabase workload per dashboard landing is closer to:
  - 1 auth check + 2 DB reads = ~3 network calls
- For 15 non-prefetched dashboard links, the cost remains bounded to the page render itself and does not multiply via middleware on every internal navigation.

### Net effect

Estimated reduction in route amplification: approximately 90–95% fewer Supabase calls for normal dashboard entry and navigation compared with the original burst pattern, assuming the remaining issues above are fixed.

---

## 4. Final Verdict & Next Steps

### Verdict

The most severe request-amplification issue is materially improved: the direct database reads were removed from the middleware and the route gate is now much narrower. The auth and onboarding flows are also better aligned, with `router.refresh()` being applied before route transitions and the sign-up flow now sending users to `/onboarding/profile` instead of `/dashboard`.

However, the system is not yet fully production-safe. There are three important blockers to resolve before deployment:

1. The cookie adapter in middleware is still not canonical and still mutates the request snapshot; a runtime bug remains possible in `setAll()`.
2. The hardcoded localhost fallback in the auth actions is still present, which can break environment correctness during OAuth/password-reset flows.
3. `next` redirects are still not sanitized, and the tenant creation action still does not invalidate layout cache after a new business is created.

### Deployment recommendation

The system is closer to stable, but it should be treated as a partial remediation rather than a fully hardened release. The remaining blockers above are sufficient to keep this in a “needs final auth hardening” state before production deployment.

### Recommended next actions

1. Fix the middleware cookie adapter to the exact `@supabase/ssr` pattern (`getAll`/`setAll` with response cookies only).
2. Remove or strongly gate localhost fallbacks behind explicit dev-only checks.
3. Sanitize and allowlist the callback `next` parameter.
4. Add `revalidatePath('/', 'layout')` to `createBusinessAccountAction` and validate the resulting navigation state.
5. Normalize email to lowercase consistently in the server-side sign-in action and all auth/email flows.

---

## Status Summary

The current codebase is materially improved relative to the original audit, but the remediation is not yet complete. The main remaining items are concentrated in middleware cookie correctness, auth redirect safety, and layout cache invalidation after tenant creation.
