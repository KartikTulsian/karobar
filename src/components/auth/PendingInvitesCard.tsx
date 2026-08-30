"use client";

import { acceptStaffInviteAction } from '@/actions/onboarding.actions';
import { useTenantStore } from '@/store/useTenantStore';
import { TenantInvitation } from '@/types/people';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react'

export function PendingInvitesCard({ invite }: { invite: TenantInvitation }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { clearStore } = useTenantStore(); // Clear store to force a fresh fetch on dashboard load

    const handleAccept = async () => {
        setLoading(true);
        const res = await acceptStaffInviteAction(invite.token);
        if (res.success) {
            clearStore();
            router.refresh();
            router.push("/dashboard");
        } else {
            alert(res.error);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-900/10">
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{invite.tenants?.name}</h4>
                <p className="text-sm flex items-center gap-1 text-slate-500 capitalize">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    Invited as {invite.role}
                </p>
            </div>
            <button
                onClick={handleAccept}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading ? "Joining..." : "Accept & Join"}
            </button>
        </div>
    )
}
