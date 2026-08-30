"use client";

import { requestPasswordResetAction } from '@/actions/auth.actions';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function ForgotPasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setServerError(null);

        const formData = new FormData(e.currentTarget);
        const res = await requestPasswordResetAction(formData);

        if (res?.error) {
            setServerError(res.error);
            toast.error("Failed to send reset email.");
        } else if (res?.success) {
            setIsSuccess(true);
            toast.success("Reset email sent!");
        }
        
        setIsSubmitting(false);
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col gap-5 w-full text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Check your email</h2>
                <p className="text-slate-500 dark:text-slate-400">
                    We have sent a password reset link to your email address.
                </p>
                <Link href="/login" className="mt-4 font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                    Return to login
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reset Password</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                {serverError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        {serverError}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium text-slate-900 dark:text-white">
                        Email Address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="johndoe@gmail.com"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg bg-[#18181B] py-3 text-sm font-semibold text-white transition-all hover:bg-black disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
            </form>

            <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Remember your password?{" "}
                <Link href="/login" className="font-semibold text-slate-900 hover:underline dark:text-white">
                    Sign in
                </Link>
            </div>
        </div>
    );
}