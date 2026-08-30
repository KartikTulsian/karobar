import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    let next = searchParams.get('next') ?? '/dashboard';
    if (!next.startsWith('/') || next.startsWith('//')) {
        next = '/dashboard';
    }
    
    
    // Check for errors sent directly from Supabase
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');
    if (error) {
        console.error("[Callback Error]", error, error_description);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`);
    }

    const supabase = await createClient();

    // 1. Handle standard PKCE Code exchange
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error("[Callback Debug] Code exchange failed:", error.message);
    }

    // 2. Handle Token Hash Verification (Works cross-device)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error("[Callback Debug] Token hash verification failed:", error.message);
    }

    return NextResponse.redirect(`${origin}/login?error=Invalid_or_expired_link`);
}