"use client";

import { updatePasswordAction } from '@/actions/auth.actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function UpdatePasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const router = useRouter();

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setServerError(null);

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            setServerError("Passwords do not match.");
            setIsSubmitting(false);
            return;
        }

        const res = await updatePasswordAction(formData);

        if (res?.error) {
            setServerError(res.error);
            toast.error("Failed to update password.");
        } else if (res?.success) {
            toast.success("Password updated successfully!");
            // Redirect to dashboard, middleware will handle onboarding logic if necessary
            router.push("/dashboard"); 
        }
        
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col gap-8 w-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Set New Password</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Please enter your new password below.
                </p>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                {serverError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        {serverError}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-medium text-slate-900 dark:text-white">
                        New Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-900 dark:text-white">
                        Confirm New Password
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg bg-[#18181B] py-3 text-sm font-semibold text-white transition-all hover:bg-black disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                    {isSubmitting ? "Updating..." : "Update Password"}
                </button>
            </form>
        </div>
    );
}