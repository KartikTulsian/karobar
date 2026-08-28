"use client";

import TenantUpdateForm from "@/components/auth/TenantUpdateForm";
import ActionModal from "@/components/ui/ActionModal";
import { useTenant, useUpdateTenantDetails } from "@/hooks/usePeople";
import { useTenantStore } from "@/store/useTenantStore";
import { TenantUpdatePayload } from "@/types/people";
import { Mail, MapPin, Pencil, Phone, Store } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";

export default function TenantHeader() {
    const { activeTenant, setActiveTenant } = useTenantStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Initialize the mutation hook
    const { mutateAsync: updateTenant, isPending } = useUpdateTenantDetails(activeTenant?.tenantId || "");

    const { data: fullTenantDetails, isLoading: isFetchingDetails } = useTenant(activeTenant?.tenantId || "");

    if (!activeTenant) return null;

    const handleUpdateSubmit = async (data: TenantUpdatePayload) => {
        try {
            // 1. Call the API via React Query
            await updateTenant(data);

            // 2. Update the global Zustand store to reflect UI changes instantly
            setActiveTenant({
                ...activeTenant,
                name: data.name,
                businessName: data.name,
                gstin: data.gstin || null,
                logoUrl: data.logo_url || null,
            });

            toast.success("Shop details updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update shop details.");
        }
    };

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                {/* Left Side: Logo and Details */}
                <div className="flex items-start gap-4">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-indigo-50 dark:border-slate-700 dark:bg-slate-800">
                        {activeTenant.logoUrl ? (
                            <Image
                                src={activeTenant.logoUrl}
                                alt={activeTenant.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                            />
                        ) : (
                            <Store className="h-8 w-8 text-indigo-400 dark:text-indigo-500" />
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{activeTenant.name}</h1>
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30 uppercase tracking-wider">
                                {activeTenant.plan} PLAN
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            {activeTenant.gstin && (
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                                    GSTIN: {activeTenant.gstin}
                                </span>
                            )}
                        </div>

                        {/* LIVE FETCHED DETAILS (Email, Phone, Address) */}
                        <div className="mt-1 flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {isFetchingDetails ? (
                                <div className="h-4 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                            ) : (
                                <>
                                    {(fullTenantDetails?.email || fullTenantDetails?.phone) && (
                                        <div className="flex flex-wrap items-center gap-4">
                                            {fullTenantDetails.email && (
                                                <span className="flex items-center gap-1.5">
                                                    <Mail className="h-3.5 w-3.5" /> {fullTenantDetails.email}
                                                </span>
                                            )}
                                            {fullTenantDetails.phone && (
                                                <span className="flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {fullTenantDetails.country_code} {fullTenantDetails.phone}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {(fullTenantDetails?.address || fullTenantDetails?.city) && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="leading-snug">
                                                {[fullTenantDetails.address, fullTenantDetails.city, fullTenantDetails.state_code]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Update Button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
                >
                    <Pencil className="h-4 w-4" />
                    <span className="hidden sm:inline">Update Shop</span>
                </button>
            </div>

            {/* UPDATE MODAL UTILIZING ActionModal */}
            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Update Shop Details"
            >
                <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    <TenantUpdateForm
                        tenantId={activeTenant.tenantId}
                        defaultValues={{
                            name: fullTenantDetails?.name || activeTenant.name,
                            email: fullTenantDetails?.email || "",
                            phone: fullTenantDetails?.phone || "",
                            country_code: fullTenantDetails?.country_code || "+91",
                            gstin: fullTenantDetails?.gstin || activeTenant.gstin || "",
                            state_code: fullTenantDetails?.state_code || "",
                            address: fullTenantDetails?.address || "",
                            city: fullTenantDetails?.city || "",
                            pincode: fullTenantDetails?.pincode || "",
                            country: fullTenantDetails?.country || "India",
                            logo_url: fullTenantDetails?.logo_url || activeTenant.logoUrl || null,
                        }}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleUpdateSubmit}
                    />
                </div>
            </ActionModal>
        </>
    );
}