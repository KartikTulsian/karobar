import Image from 'next/image'
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen w-full">

            {/* LEFT SIDE: Dynamic Form Container (Supports Light/Dark Mode) */}
            <div className="flex w-full flex-col items-center justify-center bg-white px-6 sm:px-12 lg:w-1/2 dark:bg-slate-950">
                <div className="w-full max-w-md">
                    {/* Mobile-only Logo */}
                    <div className="mb-8 flex items-center justify-center lg:hidden">
                        <Image src="/karobar_full_bgr.png" alt="Karobar Logo" width={160} height={40} className="dark:brightness-200 dark:invert" />
                    </div>
                    {children}
                </div>
            </div>

            {/* RIGHT SIDE: Dark Hero Panel (Always Dark) */}
            <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] p-12 lg:flex">
                {/* Abstract Background Elements matching the reference */}
                <div className="absolute -right-20 top-0 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute -left-20 bottom-0 h-[500px] w-[500px] rounded-full bg-rose-600/10 blur-[120px]" />

                <div className="relative z-10 flex max-w-lg flex-col items-start">
                    {/* Large Stylized Logo */}
                    <Image
                        src="/logo/karobar_full_bgr.png"
                        alt="Karobar Icon"
                        width={400}
                        height={220}
                        className="mb-8 drop-shadow-2xl"
                    />

                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
                        Welcome to Karobar
                    </h1>
                    <p className="mb-10 text-lg leading-relaxed text-slate-400">
                        Apka Dhanda Hamara Karobar. Organize your inventory, manage multi-tenant billing, and start building your automotive empire today.
                    </p>

                    {/* Marketing Card from reference */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                        <h3 className="mb-2 text-lg font-semibold text-white">Streamline your daily operations</h3>
                        <p className="text-sm text-slate-400">
                            Be among the first founders to experience the easiest way to run a multi-shop business.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
