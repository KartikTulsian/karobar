"use client";

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import React from 'react'

export default function DashBoardLayout({ children }: { children: React.ReactNode }) {

    const roleBadgeStyles: Record<string, string> = {
        system_admin: "bg-red-500 text-white",
        owner: "bg-indigo-600 text-white",
        manager: "bg-amber-500 text-slate-900",
        staff: "bg-emerald-600 text-white",
        customer: "bg-slate-600 text-white"
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
            {/* SideBar Layout on the left */}
            <Sidebar/>


            {/* The right side is a column containing the Header and the Main Workspace */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />

                {/* Only this specific workspace area is allowed to scroll vertically */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-7xl space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

