"use client";

import { SidebarNav } from './SidebarNav'
import Image from 'next/image'
import { useUIStore } from '@/store/useUIStore';

export default function Sidebar() {
    const { isSidebarCollapsed } = useUIStore();
    return (
        <aside className={`flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-20" : "w-64"
            }`}
        >
            <div className="flex h-16 shrink-0 items-center justify-center border-b dark:bg-white border-slate-100 dark:border-slate-800">
                {/* Header Brand Block */}
                {isSidebarCollapsed ? (
                    <Image
                        src="/logo/karobar_single_bgr.png"
                        alt="Karobar Icon"
                        width={40}
                        height={40}
                        className="h-10 w-10 object-contain"
                        priority
                    />
                ) : (
                    <Image
                        src="/logo/karobar_full_bgr.png"
                        alt="Karobar Logo"
                        width={150}
                        height={40}
                        className="h-11 w-auto object-contain"
                        priority
                    />
                )}
            </div>
            {/* Scrollable Navigation Area */}
            <div className="flex flex-1 flex-col overflow-hidden px-3 py-4">
                <SidebarNav />
            </div>
        </aside>
    )
}
