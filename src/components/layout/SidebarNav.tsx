"use client";

import { useNavigation } from '@/hooks/useNavigation';
import { useUIStore } from '@/store/useUIStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SidebarNav() {
    const pathName = usePathname();
    const { menuGroups, currentRole } = useNavigation();
    const { isSidebarCollapsed } = useUIStore();

    return (
        <div className="flex-1 overflow-auto space-y-6 cursor-scrollbar">
            {menuGroups.map((group, index) => (
                <div key={index}>
                    {!isSidebarCollapsed && (
                        <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {group.title}
                        </h3>
                    )}
                    <nav className="space-y-1">
                        {group.items.map((item) => {
                            const isActive = pathName === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    title={isSidebarCollapsed ? item.name : undefined}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                                        isSidebarCollapsed ? "justify-center" : "gap-3"
                                    } ${
                                        isActive
                                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50 font-semibold"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
                                        }`}
                                >
                                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                                    {/* Only render text if NOT collapsed */}
                                    {!isSidebarCollapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            ))}
        </div>
    )
}
