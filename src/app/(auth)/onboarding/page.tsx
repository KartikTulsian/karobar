import { CustomerClaimsCard } from "@/components/auth/CustomerClaimsCard";
import { PendingInvitesCard } from "@/components/auth/PendingInvitesCard";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CustomerClaimMatch, TenantInvitation } from "@/types/people";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function OnboardingHub() {
    const supabase = await createClient();
    const adminDb = getAdminClient();

    // 1. get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) redirect("/login");

    console.log("[DEBUG - OnboardingHub] Scanning for authenticated user email:", user.email);

    const { data: profile } = await supabase.from('users').select('phone').eq('id', user.id).single();
    if (!profile?.phone) redirect("/onboarding/profile");

    // 2. Scan for Data using Service Role (Bypassing RLS safely on the server)
    const [invitesRes, claimsRes] = await Promise.all([
        adminDb
            .from('tenant_invitations')
            .select('*, tenants(name)')
            .eq('email', user.email.toLowerCase().trim())
            .eq('is_accepted', false)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString()),
        adminDb
            .from('customers')
            .select('*, tenant:tenants(name, address, phone)')
            .eq('phone', profile.phone)
            .is('user_id', null)
    ]);

    console.log("[DEBUG - OnboardingHub] Invitations Query Result:", invitesRes.data);
    console.log("[DEBUG - OnboardingHub] Invitations Query Error:", invitesRes.error);

    const invites = (invitesRes.data as unknown as TenantInvitation[]) || [];
    const claims = (claimsRes.data as unknown as CustomerClaimMatch[]) || [];

    const hasPendingActions = invites.length > 0 || claims.length > 0;

    return (
        <div className="flex flex-col gap-8 w-full max-w-xl mx-auto pb-10">
            <div>
                <div className="mb-6 lg:hidden">
                    <Image src="/karobar_single_bgr.png" alt="Karobar Logo" width={48} height={48} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome to Karobar</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Your profile is ready. Choose how you want to use the platform below.
                </p>
            </div>

            {hasPendingActions && (
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Found for You</h3>

                    {/* Render Staff Invitations */}
                    {invites.map(invite => (
                        <PendingInvitesCard key={invite.id} invite={invite} />
                    ))}

                    {/* Render Shadow Customer Links */}
                    {claims.map(claim => (
                        <CustomerClaimsCard key={claim.id} claim={claim} />
                    ))}
                </div>
            )}

            {!hasPendingActions && (
                <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        We are scanning for staff invitations for <span className="font-medium text-slate-900 dark:text-white">{user.email}</span>, but nothing was found yet.
                    </p>
                </div>
            )}

            <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                <span className="absolute bg-white px-4 text-xs font-medium uppercase text-slate-400 dark:bg-slate-950">OR</span>
            </div>

            {/* The Escape Hatch: Always allow them to open their own shop */}
            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Start Your Own Business</h3>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">Register a New Shop</h4>
                        <p className="text-sm text-slate-500 mt-1">Start issuing invoices and managing inventory immediately.</p>
                    </div>
                    <Link
                        href="/onboarding/tenant"
                        className="flex items-center justify-center whitespace-nowrap px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Create Business
                    </Link>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <form action={async () => {
                    "use server";
                    const supabaseServer = await createClient();
                    await supabaseServer.auth.signOut();
                    redirect("/");
                }}>
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out or switch account
                    </button>
                </form>
            </div>
        </div>
    )
}