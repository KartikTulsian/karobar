"use client";

import { ProfileFormData, profileSchema } from '@/lib/validations/profileSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import Image from 'next/image';
import { updateHumanProfileAction } from '@/actions/profile.actions';
import DeferredImageUploader from '../common/DeferredImageUploader';
import { useRouter } from 'next/navigation';

interface ProfileFormProps {
    initialEmail: string;
    initialName: string;
    initialAvatarUrl?: string | null;
}

export default function ProfileForm({ initialEmail, initialName, initialAvatarUrl }: ProfileFormProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema) as Resolver<ProfileFormData>,
        defaultValues: {
            fullName: initialName || "",
            country_code: "+91",
            phone: ""
        },
    });

    const [avatarFiles, setAvatarFiles] = useState<(File | string)[]>(
        initialAvatarUrl ? [initialAvatarUrl] : []
    );
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);

    const handleFormSubmit = async (data: ProfileFormData) => {
        setServerError(null);
        setIsUploadingFiles(true);

        try {
            let finalAvatarUrl: string | null = null;

            if (avatarFiles.length > 0) {
                const img = avatarFiles[0];
                if (typeof img === "string") {
                    finalAvatarUrl = img; // Keep existing string URL
                } else if (img instanceof File) {

                    // Upload new image. Note: We DO NOT pass entityId. 
                    // Your secure API route automatically attaches the exact Supabase user.id!
                    const presignRes = await fetch("/api/upload/presign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: img.name,
                            contentType: img.type,
                            category: "user_avatar",
                            // No tenantId needed for user profile
                        })
                    });

                    if (!presignRes.ok) throw new Error("Failed to authorize upload");
                    const { uploadUrl, publicUrl } = await presignRes.json();

                    // Direct PUT to Cloudflare R2
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": img.type },
                        body: img,
                    });

                    if (!uploadRes.ok) throw new Error("Failed to upload avatar");

                    finalAvatarUrl = publicUrl;
                }
            }

            // Combine the country code and phone number before sending to the server action
            const fullPhoneNumber = `${data.country_code}${data.phone}`;

            const formData = new FormData();
            formData.append("fullName", data.fullName);
            formData.append("phone", fullPhoneNumber);
            if (finalAvatarUrl) formData.append("avatar_url", finalAvatarUrl);

            // Execute Server Action
            const res = await updateHumanProfileAction(formData);

            if (res?.error) {
                setServerError(res.error);
            } else if (res?.success) {
                router.refresh();
                router.push("/onboarding");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setServerError("Failed to upload profile picture. Please try again.");
        } finally {
            setIsUploadingFiles(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full">
            <div>
                <div className="mb-6 lg:hidden">
                    <Image src="/karobar_single_bgr.png" alt="Karobar Logo" width={48} height={48} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Complete Profile</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    We need your verified phone number to connect you with your past shop visits and bills.
                </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
                {serverError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        {serverError}
                    </div>
                )}

                <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-300">Profile Picture</label>
                    <DeferredImageUploader
                        value={avatarFiles}
                        onChange={setAvatarFiles}
                        maxImages={1}
                    />
                </div>

                {/* Locked Email Display */}
                <div className="flex flex-col gap-2 opacity-60">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">Email Address (Locked)</label>
                    <input
                        type="email"
                        disabled
                        value={initialEmail}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
                    />
                </div>

                <InputField
                    label="Full Name *"
                    name="fullName"
                    type="text"
                    register={register}
                    error={errors.fullName}
                    inputProps={{ placeholder: "e.g. Rahul Sharma" }}
                />

                {/* Phone Number with Country Code Dropdown */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-300">Phone Number *</label>
                    <div className="flex gap-2">
                        <select
                            {...register("country_code")}
                            className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                            <option value="+91">+91 (IN)</option>
                            <option value="+1">+1 (US)</option>
                            <option value="+44">+44 (UK)</option>
                            <option value="+61">+61 (AU)</option>
                            <option value="+971">+971 (UAE)</option>
                        </select>
                        <input
                            type="tel"
                            {...register("phone")}
                            placeholder="10-digit number"
                            maxLength={10}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                    </div>
                    {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || isUploadingFiles}
                    className="mt-4 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-70 shadow-sm"
                >
                    {isUploadingFiles ? "Uploading Profile Picture..." : isSubmitting ? "Saving Profile..." : "Save & Continue"}
                </button>
            </form>
        </div>
    )
}
