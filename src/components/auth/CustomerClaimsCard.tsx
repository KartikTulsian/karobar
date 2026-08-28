"use client";

import { claimCustomerProfileAction } from "@/actions/onboarding.actions";
import { useTenantStore } from "@/store/useTenantStore";
import { CustomerClaimMatch } from "@/types/people";
import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerClaimsCard({ claim }: { claim: CustomerClaimMatch }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { clearStore } = useTenantStore();

    const handleConnect = async () => {
        setLoading(true);
        const res = await claimCustomerProfileAction(claim.id, claim.tenant_id);
        if (res.success) {
            clearStore();
            router.push("/dashboard");
        } else {
            alert(res.error);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{claim.tenant.name}</h4>
                <p className="text-sm flex items-center gap-1 text-slate-500">
                    <Wallet className="w-3 h-3 text-emerald-500" />
                    Pending Bills Found
                </p>
            </div>
            <button 
                onClick={handleConnect}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
                {loading ? "Connecting..." : "Connect Profile"}
            </button>
        </div>
    );
}