"use client";

import { signInWithOAuthAction, signUpAction } from '@/actions/auth.actions';
import { SignUpFormData, signUpSchema } from '@/lib/validations/authSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function SignUpForm() {
    const [serverError, setServerError] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema) as Resolver<SignUpFormData>,
        defaultValues: {
            fullName: "",
            email: "",
            password: ""
        },
    });

    const handleFormSubmit = async (data: SignUpFormData) => {
        setServerError(null);

        const formData = new FormData();
        formData.append("fullName", data.fullName);
        formData.append("email", data.email);
        formData.append("password", data.password);

        // Execute the backend call securely
        const res = await signUpAction(formData);

        if (res?.error) {
            setServerError(res.error);
            toast.error(res.error); // E.g., "User already registered"
        } else if (res?.success) {
            toast.success("Account created! Let's set up your profile.");
            router.push("/dashboard");
        }
    };
    return (
        <div className="flex flex-col gap-8 w-full">
            <div>
                <div className="mb-6 lg:hidden">
                    <Image src="/karobar_single_bgr.png" alt="Karobar Logo" width={48} height={48} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create Account</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Join Karobar today to streamline your business.
                </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
                {serverError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                        {serverError}
                    </div>
                )}

                <InputField
                    label="Full Name"
                    name="fullName"
                    type="text"
                    register={register}
                    error={errors.fullName}
                    inputProps={{ placeholder: "e.g. Rahul Sharma" }}
                />

                <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    register={register}
                    error={errors.email}
                    inputProps={{ placeholder: "johndoe@gmail.com" }}
                />

                <InputField
                    label="Password"
                    name="password"
                    type="password"
                    register={register}
                    error={errors.password}
                    inputProps={{ placeholder: "••••••••" }}
                />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg bg-[#18181B] py-3 text-sm font-semibold text-white transition-all hover:bg-black disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-slate-200 shadow-sm"
                >
                    {isSubmitting ? "Creating Account..." : "Sign up"}
                </button>
            </form>

            <div className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-slate-900 hover:underline dark:text-white">
                    Sign in
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

                <div className="text-sm text-slate-500 dark:text-slate-400">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-slate-900 hover:underline dark:text-white">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
