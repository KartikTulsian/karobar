"use client";

import { TenantFormData, tenantSchema } from '@/lib/validations/tenantSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import { TenantUpdatePayload } from '@/types/people';
import { useState } from 'react';
import DeferredImageUploader from '../common/DeferredImageUploader';

// We extend TenantFormData to strictly type the logo_url
interface TenantUpdateFormProps {
    tenantId: string;
    defaultValues: Partial<TenantUpdatePayload>;
    onCancel: () => void;
    onSubmit: (data: TenantUpdatePayload) => Promise<void>;
}

export default function TenantUpdateForm({ tenantId, defaultValues, onCancel, onSubmit }: TenantUpdateFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<TenantFormData>({
        resolver: zodResolver(tenantSchema) as Resolver<TenantFormData>,
        defaultValues: {
            ...defaultValues,
            country_code: defaultValues.country_code || "+91",
            country: defaultValues.country || "India"
        },
    });

    const currentLogoUrl = watch("logo_url") || defaultValues.logo_url;

    const [logoFiles, setLogoFiles] = useState<(File | string)[]>(
        defaultValues?.logo_url ? [defaultValues.logo_url] : []
    );
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);

    const handleFormSubmit = async (data: TenantFormData) => {
        setIsUploadingFiles(true);
        try {
            let finalLogoUrl: string | null = null;

            if (logoFiles.length > 0) {
                const img = logoFiles[0]; // Shop only allows 1 logo
                if (typeof img === "string") {
                    finalLogoUrl = img; // User didn't change the logo, keep the existing one
                } else if (img instanceof File) {
                    // Upload the new logo
                    const presignRes = await fetch("/api/upload/presign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: img.name,
                            contentType: img.type,
                            category: "shop_logo",
                            tenantId: tenantId, // Strictly binds to the existing shop
                            // No entityId needed for shop_logo based on your r2.ts config!
                        })
                    });

                    if (!presignRes.ok) throw new Error("Failed to get upload authorization");
                    const { uploadUrl, publicUrl } = await presignRes.json();

                    // Direct PUT to Cloudflare R2
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": img.type },
                        body: img,
                    });

                    if (!uploadRes.ok) throw new Error("Failed to upload logo");

                    finalLogoUrl = publicUrl;
                }
            }

            const finalData: TenantUpdatePayload = {
                ...data,
                logo_url: finalLogoUrl 
            };
            
            await onSubmit(finalData);

        } catch (error) {
            console.error("Upload Error:", error);
            alert("Failed to upload logo. Please try again.");
        } finally {
            setIsUploadingFiles(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
            
            {/* --- LOGO UPLOAD SECTION --- */}
            <div className="flex flex-col sm:flex-row gap-6 items-start rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-300">Shop Logo</label>
                    {/* <ImageUploader 
                        value={currentLogoUrl ? [currentLogoUrl] : []} 
                        onChange={(urls) => setValue("logo_url" as any, urls[0] || null, { shouldValidate: true })}
                        maxImages={1} 
                        category="shop_logo"
                        tenantId={tenantId}
                    /> */}
                    <DeferredImageUploader 
                        value={logoFiles} 
                        onChange={setLogoFiles}
                        maxImages={1} 
                    />
                </div>
                <div className="flex flex-col justify-center text-sm text-slate-500 dark:text-slate-400 mt-2 sm:mt-7">
                    <p>Upload a high-quality logo (PNG, JPG, WEBP) to display on your dashboard and generated invoices.</p>
                </div>
            </div>

            {/* --- BUSINESS IDENTITY --- */}
            <div className="flex flex-col gap-5">
                <InputField label="Business Name *" name="name" type="text" register={register} error={errors.name} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField 
                        label="GSTIN (Optional)" 
                        name="gstin" 
                        type="text" 
                        register={register} 
                        error={errors.gstin} 
                        inputProps={{ onInput: (e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase()) }} 
                    />
                    <InputField label="State Code" name="state_code" type="text" register={register} error={errors.state_code} inputProps={{ maxLength: 2 }} />
                </div>
            </div>

            {/* --- CONTACT INFO --- */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Support Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField label="Business Email" name="email" type="email" register={register} error={errors.email} />
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-semibold text-slate-900 dark:text-slate-300">Support Phone</label>
                        <div className="flex gap-2">
                            <select {...register("country_code")} className="w-24 rounded-md border border-slate-300 bg-slate-50 px-2 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                                <option value="+91">+91 (IN)</option>
                                <option value="+1">+1 (US)</option>
                            </select>
                            <input type="tel" {...register("phone")} maxLength={10} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                        </div>
                        {errors.phone && <span className="mt-1 text-xs text-red-500">{errors.phone.message}</span>}
                    </div>
                </div>
            </div>

            {/* --- ADDRESS INFO --- */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-col gap-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Registered Address</h3>
                <InputField label="Street Address" name="address" type="text" register={register} error={errors.address} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <InputField label="City" name="city" type="text" register={register} error={errors.city} />
                    <InputField label="Pincode" name="pincode" type="text" register={register} error={errors.pincode} inputProps={{ maxLength: 6 }} />
                    <InputField label="Country" name="country" type="text" register={register} error={errors.country} />
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || isUploadingFiles}
                    className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-70"
                >
                    {isUploadingFiles ? "Uploading Logo..." : isSubmitting ? "Saving Updates..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}