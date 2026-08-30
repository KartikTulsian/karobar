import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react'

export default async function DashBoardLayout({ children }: { children: React.ReactNode }) {

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Perform profile completeness & membership checks on the server layout
    const [profileRes, membershipRes] = await Promise.all([
        supabase.from('users').select('full_name, phone').eq('id', user.id).single(),
        supabase.from('tenant_memberships').select('id').eq('user_id', user.id).eq('is_active', true)
    ]);

    const profile = profileRes.data;
    const hasMemberships = membershipRes.data && membershipRes.data.length > 0;

    // A. Enforce profile details (name and phone)
    if (!profile?.full_name || !profile?.phone) {
        redirect('/onboarding/profile');
    }

    // B. Enforce tenant creation / membership
    if (!hasMemberships) {
        redirect('/onboarding');
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
            {/* SideBar Layout on the left */}
            <Sidebar/>


            {/* The right side is a column containing the Header and the Main Workspace */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />

                {/* Only this specific workspace area is allowed to scroll vertically */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-7xl space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

