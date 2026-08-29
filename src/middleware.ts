import { CookieOptions, createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const pathname = request.nextUrl.pathname;
    const isStaticAssetRoute =
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('/_rsc') ||
        /\.(?:svg|png|jpe?g|gif|webp|ico|js|css|map|woff2?|ttf|eot)$/i.test(pathname);

    if (isStaticAssetRoute || pathname.startsWith('/api')) {
        return supabaseResponse;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    supabaseResponse = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    supabaseResponse.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    supabaseResponse = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    supabaseResponse.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // 1. Get the current user session
    const { data: { user }} = await supabase.auth.getUser();
    // const pathname = request.nextUrl.pathname;

    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/reset') || pathname.startsWith('/callback');
    const isPublicRoute = pathname === '/';

    // 2. Protect Authenticated Routes
    if (!user && !isAuthRoute && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // 3. Handle logged-in user routing logic
    if (user && !pathname.startsWith('/api')) {
        // Fetch user profile and memberships simultaneously for speed
        const [profileRes, membershipRes] = await Promise.all([
            supabase.from('users').select('full_name, phone').eq('id', user.id).single(),
            supabase.from('tenant_memberships').select('id').eq('user_id', user.id).eq('is_active', true)
        ]);

        const profile = profileRes.data;
        const hasMemberships = membershipRes.data && membershipRes.data.length > 0;

        // A. Check Profile Completeness
        const isProfileIncomplete = !profile?.full_name || !profile?.phone;

        if (isProfileIncomplete && pathname !== '/onboarding/profile') {
            const url = request.nextUrl.clone();
            url.pathname = '/onboarding/profile';
            return NextResponse.redirect(url);
        }

        // B. Check Tenant Memberships (The Onboarding Gate)
        if (!isProfileIncomplete && !hasMemberships && !pathname.startsWith('/onboarding')) {
            const url = request.nextUrl.clone();
            url.pathname = '/onboarding';
            return NextResponse.redirect(url);
        }

        // C. Prevent reverse-routing (Logged-in users with shops shouldn't see login or onboarding)
        if (!isProfileIncomplete && hasMemberships && (pathname.startsWith('/onboarding') || isAuthRoute || pathname === '/')) {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
};

// Ensure the middleware only runs on specific paths to save edge compute
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|_rsc|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map|woff2?|ttf|eot)$).*)',
  ],
}