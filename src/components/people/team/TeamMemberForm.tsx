"use client";

import InputField from "@/components/common/InputField";
import { TeamMemberFormData, teamMemberSchema } from "@/lib/validations/teamMemberSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck } from "lucide-react";
import { Resolver, useForm } from "react-hook-form";

interface TeamMemberFormProps {
    isModal?: boolean;
    defaultValues?: Partial<TeamMemberFormData>;
    onCancel: () => void;
    onSubmit: (data: TeamMemberFormData) => void;
}

export default function TeamMemberForm({ isModal = false, defaultValues, onCancel, onSubmit }: TeamMemberFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<TeamMemberFormData>({
        resolver: zodResolver(teamMemberSchema) as Resolver<TeamMemberFormData>,
        defaultValues: {
            role: "staff",
            ...defaultValues,
        }
    });

    const handleFormSubmit = async (data: TeamMemberFormData) => {
        const finalData = {
            email: data.email.trim().toLowerCase(),
            role: data.role,
        };
        await onSubmit(finalData);
    };

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50";

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className={containerClass}
        >
            {/* SECTION: INVITATION DETAILS */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Send Invitation</h3>
                </div>

                <div className="flex flex-col gap-5 p-5">
                    <div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                        An invitation email will be sent to this address. If they already have a Karobar account, this shop will appear in their dashboard once they accept[cite: 10].
                    </div>

                    <InputField
                        label="Email Address *"
                        name="email"
                        type="email"
                        register={register}
                        error={errors.email}
                        inputProps={{ placeholder: "e.g. rahul@example.com" }}
                    />

                    <div className="flex flex-col gap-1 w-full">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                            Assign Role *
                        </label>
                        <select
                            {...register("role")}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="staff">Staff (POS Billing & Inventory lookup)</option>
                            <option value="manager">Manager (Full Access, minus Billing/Subscription)</option>
                        </select>
                        {errors.role && <span className="text-xs text-red-500">{errors.role.message}</span>}
                    </div>
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className={`mt-2 flex items-center justify-end gap-3 pt-2 ${!isModal && "border-t border-slate-200 dark:border-slate-800 pt-5"}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-70"
                >
                    {isSubmitting ? "Sending Invite..." : "Send Invitation"}
                </button>
            </div>
        </form>
    )
}
