"use client";

import { signInWithOAuthAction, signInWithPasswordAction } from '@/actions/auth.actions';
import { LoginFormData, loginSchema } from '@/lib/validations/authSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

// interface LoginFormProps {
//     onSubmit: (data: LoginFormData) => Promise<void>
//     serverError?: string | null;
// }

export default function LoginForm() {
    const [serverError, setServerError] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
        defaultValues: {
            email: "",
            password: "",
            rememberMe: false,
        },
    });

    const handleFormSubmit = async (data: LoginFormData) => {
        setServerError(null);

        //Convert Zod data to FormData for the Server Action
        const formData = new FormData();
        formData.append("email", data.email.trim().toLowerCase());
        formData.append("password", data.password);

        // Call the backend securely
        const res = await signInWithPasswordAction(formData);

        if (res?.error) {
            // Displays the red box above the form
            setServerError(res.error);
            // Also triggers an error toast for better visibility
            toast.error("Login failed. Please check your credentials.");
        } else if (res?.success) {
            toast.success("Successfully logged in!");

            router.refresh();
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full">
            {/* Header section matching reference design */}
            <div>
                <div className="mb-6 lg:hidden">
                    {/* Mobile Logo Fallback */}
                    <Image src="/karobar_single_bgr.png" alt="Karobar Logo" width={48} height={48} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in</h2>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
                {/* Server Error Display (e.g., "Invalid Credentials") */}
                {serverError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        {serverError}
                    </div>
                )}

                {/* Email Field using your common InputField component */}
                <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    register={register}
                    error={errors.email}
                    inputProps={{ placeholder: "johndoe@gmail.com" }}
                />

                {/* Password Field */}
                <InputField
                    label="Password"
                    name="password"
                    type="password"
                    register={register}
                    error={errors.password}
                    inputProps={{ placeholder: "••••••••" }}
                />

                {/* Options row: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register("rememberMe")}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-indigo-500"
                        />
                        Remember me
                    </label>
                    <Link
                        href="/reset"
                        className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        Forgot Password?
                    </Link>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg bg-[#18181B] py-3 text-sm font-semibold text-white transition-all hover:bg-black disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-slate-200 shadow-sm"
                >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
            </form>

            {/* Social Logins (From Reference Image) & Signup Link */}
            <div className="flex flex-col gap-6">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-semibold text-slate-900 hover:underline dark:text-white">
                        Sign up
                    </Link>
                </div>

                {/* Social Logins */}
                <div className="flex gap-4">
                    <form action={async (formData: FormData) => {
                        const res = await signInWithOAuthAction('google');
                        if (res?.error) setServerError(res.error);
                    }}>
                        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                            <Image src="https://authjs.dev/img/providers/google.svg" alt="Google" width={20} height={20} />
                        </button>
                    </form>

                    <form action={async (formData: FormData) => {
                        const res = await signInWithOAuthAction('github');
                        if (res?.error) setServerError(res.error);
                    }}>
                        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                            <Image src="https://authjs.dev/img/providers/github.svg" alt="GitHub" width={20} height={20} className="dark:invert" />
                        </button>
                    </form>

                    {/* <div className="flex flex-col gap-6">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="font-semibold text-slate-900 hover:underline dark:text-white">
                                Sign up
                            </Link>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    )
}
