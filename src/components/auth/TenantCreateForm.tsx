"use client";

import { TenantFormData, tenantSchema } from '@/lib/validations/tenantSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import Image from 'next/image';
import { createBusinessAccountAction } from '@/actions/tenant.actions';

export default function TenantCreateForm() {
    const [serverError, setServerError] = useState<string | null>(null);
    const router = useRouter();
    const { setActiveTenant } = useTenantStore();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<TenantFormData>({
        resolver: zodResolver(tenantSchema) as Resolver<TenantFormData>,
        defaultValues: { country_code: "+91", country: "India" },
    });

    const handleFormSubmit = async (data: TenantFormData) => {
        setServerError(null);

        const formData = new FormData();
        formData.append("name", data.name);

        // Contact
        if (data.email) formData.append("email", data.email);
        if (data.country_code) formData.append("country_code", data.country_code);
        if (data.phone) formData.append("phone", data.phone);

        // Tax
        if (data.gstin) formData.append("gstin", data.gstin.toUpperCase());
        if (data.state_code) formData.append("state_code", data.state_code);

        // Location
        if (data.address) formData.append("address", data.address);
        if (data.city) formData.append("city", data.city);
        if (data.pincode) formData.append("pincode", data.pincode);
        if (data.country) formData.append("country", data.country);

        // if (data.logo_url) formData.append("logo_url", data.logo_url);

        try {
            const res = await createBusinessAccountAction(formData);

            if (res?.error) {
                setServerError(res.error);
                return;
            }

            if (res?.success && res.tenant) {
                setActiveTenant(res.tenant);
                router.refresh();
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setServerError("An unexpected error occurred: " + err.message);
            } else {
                setServerError("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pb-10">
            <div>
                <div className="mb-6 lg:hidden">
                    <Image src="/karobar_single_bgr.png" alt="Karobar Logo" width={48} height={48} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Register Business</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Set up your primary shop details to start issuing invoices.
                </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
                {serverError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        {serverError}
                    </div>
                )}
                <InputField
                    label="Business Name *"
                    name="name"
                    type="text"
                    register={register}
                    error={errors.name}
                    inputProps={{ placeholder: "e.g. Verma Auto Spares" }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField
                        label="GSTIN (Optional)"
                        name="gstin"
                        type="text"
                        register={register}
                        error={errors.gstin}
                        inputProps={{
                            placeholder: "22AAAAA0000A1Z5",
                            onInput: (e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())
                        }}
                    />
                    <InputField
                        label="State Code"
                        name="state_code"
                        type="text"
                        register={register}
                        error={errors.state_code}
                        inputProps={{ placeholder: "e.g. 27", maxLength: 2 }}
                    />
                </div>


                {/* --- CONTACT INFO --- */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Support Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField
                            label="Business Email"
                            name="email"
                            type="email"
                            register={register}
                            error={errors.email}
                            inputProps={{ placeholder: "shop@example.com" }}
                        />
                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-sm font-semibold text-slate-900 dark:text-slate-300">Support Phone</label>
                            <div className="flex gap-2">
                                <select
                                    {...register("country_code")}
                                    className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="+91">+91 (IN)</option>
                                    <option value="+1">+1 (US)</option>
                                </select>
                                <input
                                    type="tel"
                                    {...register("phone")}
                                    placeholder="10-digit number"
                                    maxLength={10}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            {errors.phone && <span className="text-xs text-red-500 mt-1">{errors.phone.message}</span>}
                        </div>
                    </div>
                </div>

                {/* --- ADDRESS INFO --- */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-col gap-5">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Registered Address</h3>
                    <InputField
                        label="Street Address"
                        name="address"
                        type="text"
                        register={register}
                        error={errors.address}
                        inputProps={{ placeholder: "Shop No. 4, Main Market Road..." }}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <InputField
                            label="City"
                            name="city"
                            type="text"
                            register={register}
                            error={errors.city}
                            inputProps={{ placeholder: "e.g. Mumbai" }}
                        />
                        <InputField
                            label="Pincode"
                            name="pincode"
                            type="text"
                            register={register}
                            error={errors.pincode}
                            inputProps={{ placeholder: "e.g. 400001", maxLength: 6 }}
                        />
                        <InputField
                            label="Country"
                            name="country"
                            type="text"
                            register={register}
                            error={errors.country}
                            inputProps={{ placeholder: "e.g. India" }}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-6 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-70 shadow-sm"
                >
                    {isSubmitting ? "Registering..." : "Launch Dashboard"}
                </button>
            </form>
        </div>
    )
}
