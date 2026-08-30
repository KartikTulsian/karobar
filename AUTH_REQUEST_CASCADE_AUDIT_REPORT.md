# Full Authentication, Request Cascades & Middleware Performance Audit

## 1. Executive Summary

The root cause is a layered auth-routing architecture that is doing too much work in the wrong layer.

The most damaging issue is in [src/middleware.ts](src/middleware.ts#L4-L118): the edge middleware runs on protected routes, calls Supabase auth, and then immediately executes database reads against the `users` and `tenant_memberships` tables on every authenticated route hit. This is amplified by Next.js route prefetching and RSC requests, which are not reliably excluded by the current matcher logic because the request filter relies on pathname rather than a stricter internal-request exclusion strategy. The result is a multiplicative burst of edge requests and database calls.

A second major issue is cookie handling in the same middleware. It mutates both `request.cookies` and `NextResponse.cookies` in a custom Supabase cookie adapter instead of following the canonical SSR cookie sync pattern. That can break auth cookie persistence and chunking, which matches the observed “auth session missing” and “invalid credentials” state drift.

A third issue is conflicting routing intent across middleware, route segments, and client navigation:
- middleware decides route gating
- onboarding pages independently call `getUser()` and redirect
- login/signup pages immediately push users to `/dashboard`
- dashboard layout and sidebar render additional state checks

This creates contradictory redirects and loops between auth, onboarding, and dashboard.

---

## 2. Critical Findings & Root Causes

### Critical — Middleware performs expensive auth + data-layer work on every protected route

- File & Line Reference: [src/middleware.ts](src/middleware.ts#L4-L118)
- Failure Mechanism:
  1. Every matching route causes middleware to start.
  2. It calls `supabase.auth.getUser()` using the middleware edge client.
  3. For authenticated users, it immediately performs two database queries:
     - `users` lookup by `id`
     - `tenant_memberships` lookup by `user_id` and `is_active`
  4. Each dashboard navigation and each route-prefetch can trigger this whole sequence again.
  5. The logic is repeated across multiple app entry points, so the request count multiplies quickly.
- Evidence from Code:
  - `const { data: { user }, error: authError } = await supabase.auth.getUser();` in [src/middleware.ts](src/middleware.ts#L53-L63)
  - `const [profileRes, membershipRes] = await Promise.all([ ... supabase.from('users') ... , ... supabase.from('tenant_memberships') ... ])` in [src/middleware.ts](src/middleware.ts#L86-L98)
- Why this causes the burst:
  - The middleware is acting as both auth gate and profile/tenant oracle.
  - It is not limited to a single authoritative check.
  - The app also uses multiple critical server-side checks later in the route tree, so the same user is re-evaluated repeatedly.

### Critical — Cookie synchronization in the middleware is structurally unsafe and can drop Supabase chunked session cookies

- File & Line Reference: [src/middleware.ts](src/middleware.ts#L15-L42)
- Failure Mechanism:
  1. The custom cookie adapter calls `request.cookies.set(...)` and `supabaseResponse.cookies.set(...)` in the same setter.
  2. In Next.js middleware, `request.cookies` is the incoming request snapshot, not the persisted response state you want to authorize for follow-up requests.
  3. Supabase auth tokens can be chunked across multiple cookies, especially in environments where cookies are split or rotated.
  4. Writing to the request object and response object inconsistently can leave some chunked cookies stale, missing, or overwritten.
- Evidence from Code:
  - `request.cookies.set({ name, value, ...options });` and `supabaseResponse.cookies.set({ name, value, ...options });` in [src/middleware.ts](src/middleware.ts#L24-L39)
  - `request.cookies.set({ name, value: '', ...options });` in [src/middleware.ts](src/middleware.ts#L35-L41)
- Why this produces session mismatch:
  - The middleware is not using the canonical server-side cookie persistence pattern for Supabase SSR.
  - It can easily cause partial cookie states, which explains intermittent “Auth session missing!” and stale auth behavior even after a successful sign-in.

### High — The matcher is not reliably excluding internal RSC and prefetch traffic

- File & Line Reference: [src/middleware.ts](src/middleware.ts#L126-L130)
- Failure Mechanism:
  1. The matcher tries to skip static assets and `_next` routes.
  2. But many Next.js RSC prefetches and internal requests arrive with query-string parameters rather than pathnames that clearly indicate they are internal requests.
  3. Since the logic checks `pathname` and only strips obvious static paths, it still runs on many navigation-prefetch requests.
- Evidence from Code:
  - `const isStaticAssetRoute = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('/_rsc') || ...` in [src/middleware.ts](src/middleware.ts#L7-L14)
  - `matcher: [ '/((?!_next/static|_next/image|_next/data|_rsc|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map|woff2?|ttf|eot)$).*)', ]` in [src/middleware.ts](src/middleware.ts#L126-L130)
- Why this matters:
  - The user is not just visiting pages; the app is also doing route prefetching and internal data fetches.
  - The middleware is likely firing on these internal requests and performing expensive auth checks repeatedly.
  - This is a direct amplifier for the 500+ request burst.

### High — Redirect logic is contradictory and can bounce users between auth, onboarding, and dashboard

- File & Line Reference: [src/middleware.ts](src/middleware.ts#L64-L117)
- Failure Mechanism:
  1. The middleware redirects unauthenticated users away from protected routes to `/login`.
  2. For logged-in users, it checks profile completeness and tenant memberships.
  3. If the profile is incomplete, it sends them to `/onboarding/profile`.
  4. If the profile is complete but no memberships exist, it sends them to `/onboarding`.
  5. If they are fully onboarded, it redirects them back to `/dashboard`.
  6. At the same time, the login and signup UI pushes a successful user straight to `/dashboard`, which then triggers middleware-based re-routing.
- Evidence from Code:
  - `if (!user && !isAuthRoute && !isPublicRoute) ... redirect to /login` in [src/middleware.ts](src/middleware.ts#L72-L76)
  - `if (isProfileIncomplete && pathname !== '/onboarding/profile') ... redirect to /onboarding/profile` in [src/middleware.ts](src/middleware.ts#L90-L95)
  - `if (!isProfileIncomplete && !hasMemberships && !pathname.startsWith('/onboarding')) ... redirect to /onboarding` in [src/middleware.ts](src/middleware.ts#L96-L101)
  - `if (!isProfileIncomplete && hasMemberships && (pathname.startsWith('/onboarding') || isAuthRoute || pathname === '/')) ... redirect to /dashboard` in [src/middleware.ts](src/middleware.ts#L102-L117)
- Why it loops:
  - Auth route and onboarding route are being used as both destination and redirect target depending on partial state.
  - The client-side redirect to `/dashboard` immediately after login can be caught by middleware and changed again.
  - This is exactly the kind of route churn that creates redirect loops.

### High — Duplicate auth/profile checks exist in route-level pages and client-side components, creating contradictory state

- File & Line Reference:
  - [src/app/(auth)/onboarding/page.tsx](src/app/(auth)/onboarding/page.tsx#L10-L20)
  - [src/app/(auth)/onboarding/profile/page.tsx](src/app/(auth)/onboarding/profile/page.tsx#L10-L18)
  - [src/components/layout/UserProfile.tsx](src/components/layout/UserProfile.tsx#L16-L33)
  - [src/components/layout/SidebarNav.tsx](src/components/layout/SidebarNav.tsx#L7-L31)
  - [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx#L1-L30)
- Failure Mechanism:
  1. Server pages check `getUser()` independently.
  2. Middleware checks the same auth state again.
  3. Dashboard header/profile client code separately fetches session state.
  4. Sidebar render path is active in the same route tree.
  5. The app effectively evaluates auth state in multiple places and re-renders around the same transitions.
- Evidence from Code:
  - `const { data: { user } } = await supabase.auth.getUser();` in [src/app/(auth)/onboarding/page.tsx](src/app/(auth)/onboarding/page.tsx#L10-L17)
  - `const { data: { user } } = await supabase.auth.getUser();` in [src/app/(auth)/onboarding/profile/page.tsx](src/app/(auth)/onboarding/profile/page.tsx#L10-L17)
  - `const { data: { session } } = await supabase.auth.getSession();` in [src/components/layout/UserProfile.tsx](src/components/layout/UserProfile.tsx#L19-L31)
  - The dashboard layout is a client component with no server guard in [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx#L1-L30)
- Why this causes instability:
  - There are multiple sources of truth for the same state.
  - One state is valid in middleware, another in server render, another in browser session.
  - During transitions, those observers disagree and route the user in different directions.

### High — OAuth and password reset flows use a hardcoded localhost fallback, which breaks environment-consistent auth and can produce invalid callback behavior

- File & Line Reference:
  - [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L72-L107)
  - [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L5-L44)
- Failure Mechanism:
  1. The app generates redirect URLs with a fallback to `localhost:3000` when `NEXT_PUBLIC_SITE_URL` is missing.
  2. That means email links and OAuth redirects may be created against a development URL in production or a mismatched URL in staging.
  3. The callback route consumes the `next` parameter and redirects without normalizing or validating it against a whitelist.
- Evidence from Code:
  - `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L72-L81)
  - `redirectTo: ${siteUrl}/callback?next=/onboarding` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L77-L83)
  - `const next = searchParams.get('next') ?? '/dashboard';` in [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L5-L11)
- Why this matters:
  - Cross-device and reset flows are supposed to be portable; a localhost fallback makes them fragile.
  - It is especially dangerous after password resets because the same callback route is expected to handle token-hash and code flows across environments.

### Medium — Sign-up normalizes email inconsistently, which can create invalid-credential drift after account creation

- File & Line Reference: [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L7-L54)
- Failure Mechanism:
  1. Password sign-in trims email before sending it to Supabase.
  2. Sign-up does not trim or normalize email before sending it to the auth service.
  3. A trailing space or inconsistent casing can create a user that looks different from the login form value.
- Evidence from Code:
  - `const email = (formData.get("email") as string).trim();` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L7-L9)
  - `const email = formData.get("email") as string;` in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L37-L42)
- Why this appears as “invalid credentials”:
  - Login and sign-up are not using a single canonical input sanitation path.
  - This is not the full cause of the storm, but it is definitely a contributor to inconsistent auth state.

### Medium — Client-side auth success handlers immediately navigate to `/dashboard` without waiting for the authoritative server to settle

- File & Line Reference:
  - [src/components/auth/LoginForm.tsx](src/components/auth/LoginForm.tsx#L25-L58)
  - [src/components/auth/SignUpForm.tsx](src/components/auth/SignUpForm.tsx#L24-L47)
  - [src/app/(auth)/update-password/page.tsx](src/app/(auth)/update-password/page.tsx#L17-L36)
- Failure Mechanism:
  1. After auth succeeds, the UI calls `router.push("/dashboard")`.
  2. The middleware then re-checks profile and membership state and may redirect the user elsewhere.
  3. This creates a race between client-side navigation and server-side auth gating.
- Evidence from Code:
  - `router.push("/dashboard");` in [src/components/auth/LoginForm.tsx](src/components/auth/LoginForm.tsx#L49-L58)
  - `router.push("/dashboard");` in [src/components/auth/SignUpForm.tsx](src/components/auth/SignUpForm.tsx#L39-L47)
  - `router.push("/dashboard");` in [src/app/(auth)/update-password/page.tsx](src/app/(auth)/update-password/page.tsx#L30-L36)
- Why this matters:
  - The browser is actively racing the server’s redirect logic.
  - It is a classic source of “sometimes it lands in the right route, sometimes it redirects again” behavior.

---

## 3. Request Flow Diagram / Trace

### 1) Unauthenticated user visits `/login` or `/reset`

- Browser navigates to `/login` or `/reset`.
- Middleware matcher includes these routes, so the request enters [src/middleware.ts](src/middleware.ts#L4-L63).
- The middleware calls Supabase `auth.getUser()` and evaluates route protection.
- Because the user is not logged in and the route is a public/auth route, it does not redirect.
- For `/reset`:
  - User submits form.
  - [src/app/(auth)/reset/page.tsx](src/app/(auth)/reset/page.tsx#L8-L20) calls `requestPasswordResetAction`.
  - That action trims email and builds `redirectTo` with `NEXT_PUBLIC_SITE_URL` or localhost fallback in [src/actions/auth.actions.ts](src/actions/auth.actions.ts#L96-L114).
  - Supabase sends a reset email pointing back to the callback route.

### 2) OAuth or magic-link user completes `/callback`

- User clicks the email/OAuth link and lands at the callback route in [src/app/(auth)/callback/route.ts](src/app/(auth)/callback/route.ts#L5-L44).
- The callback reads:
  - `code` for PKCE exchange
  - `token_hash` and `type` for email-OTP flows
- If `code` exists, it calls `exchangeCodeForSession`.
- If `token_hash` exists, it calls `verifyOtp`.
- On success, it redirects to the value in `next` or to `/dashboard`.
- That redirect immediately interacts with [src/middleware.ts](src/middleware.ts#L64-L117), which can redirect again to `/onboarding/profile` or `/onboarding`, depending on profile and memberships.

### 3) Logged-in user lands on `/dashboard` with sidebar links rendered

- User hits `/dashboard`.
- Middleware begins: `auth.getUser()`, then profile and membership queries.
- If still authenticated, it checks `full_name` and `phone` in `users`, then `tenant_memberships`.
- If profile incomplete, it redirects to `/onboarding/profile`.
- If profile complete but no memberships, it redirects to `/onboarding`.
- If fully onboarded, it allows the route and the user reaches the dashboard.
- The dashboard then renders the sidebar in [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx#L1-L31) and [src/components/layout/SidebarNav.tsx](src/components/layout/SidebarNav.tsx#L7-L31).
- Those links aggressively create internal navigation prefetches. Since the middleware does not reliably exclude those internal requests, each prefetched route can trigger the same middleware auth + DB path again.

This is the core amplification loop: middleware on route entry + prefetch + repeated server-side auth checks.

---

## 4. Recommended Architectural Blueprint

### Ideal separation of concerns

1. Middleware should be minimal and fast
   - It should do only:
     - cookie refresh/session hydration for Supabase SSR
     - a single, narrow route gate for anonymous-only vs protected-only paths
     - no profile lookup
     - no tenant membership lookup
     - no user business logic
   - This logic belongs in middleware only if it is necessary for redirecting before rendering a protected page.

2. Routing and onboarding decisions should live in server route/segment logic
   - The authoritative “what access level does this user have?” decision should be made once in the server render path or on a dedicated route guard helper.
   - Profile completeness and membership checks belong in a single server-side gate, not both in middleware and multiple page loaders.

3. Client components should not be state owners for auth session truth
   - Browser-side session reads should be focused on UI-only presentation (avatar info, current user label), not auth gating.
   - The main auth gate should live in server code.

4. Callback logic should be strict and environment-safe
   - Build redirect URLs from the request origin or a validated site URL.
   - Do not default to localhost in non-local environments.
   - Validate the `next` param against an allowlist of internal paths.

5. Navigation should be static and low-cost
   - The dashboard navigation should not trigger expensive server-side auth checks multiple times per render.
   - If route prefetching is kept, the auth middleware must be exclude-safe for internal prefetch traffic.

### Prioritized remediation plan

1. Fix the middleware contract first
   - Remove the `users` and `tenant_memberships` queries from middleware.
   - Keep only fast session verification and redirect if the route is protected and unauthenticated.
   - Do not mutate both `request.cookies` and `response.cookies` in the same adapter.

2. Centralize auth gate logic
   - Choose one source of truth for:
     - authenticated vs anonymous
     - profile complete vs incomplete
     - active membership vs onboarding required
   - Apply it once per protected route, not in multiple locations.

3. Harden callback and reset URLs
   - Remove localhost fallback for production paths.
   - Enforce a strict allowlist for `next` values.
   - Ensure OAuth and reset flows use the actual request origin or trusted site URL.

4. Normalize input and auth data
   - Trim and lowercase email consistently in sign-up, sign-in, and password reset flows.
   - Avoid inconsistent casing or whitespace as a cause of invalid credential mismatches.

5. Reduce request amplification
   - Tune middleware matcher carefully and ensure internal prefetch traffic does not trigger the same auth path repeatedly.
   - Prefer server-side route segmentation and route-level guards rather than repeated edge checks.

6. Recheck the dashboard entry path
   - Remove the immediate client-side `router.push("/dashboard")` after success unless that redirect is validated against server-side auth state.
   - Let the server redirect or render the correct route after a stable auth session is established.

### Final verdict

This is not a single bug; it is a systemic auth-routing design issue:
- middleware is over-eager
- cookie sync is unsafe
- page-level and client-level guards are duplicated
- auth redirects are racing each other
- prefetch traffic is amplifying the entire cycle

The observed request spikes, “invalid credentials,” “auth session missing,” and route-loop behavior are all consistent with this combination of architecture flaws.
