"use client";

import { useUIStore } from '@/store/useUIStore';
import { Bell, Maximize, Menu, PlusCircle, Search } from 'lucide-react';
import { ShopSwitcher } from '../auth/ShopSwitcher';
import UserProfile from './UserProfile';
import ThemeToggle from '../theme/ThemeToggle';
import Link from 'next/link';

export default function Header() {
    const { toggleSidebar } = useUIStore();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 px-4 sm:px-6 sticky top-0 z-40">
            {/* Left side: toggle & search */}
            <div className="flex items-center gap-4 flex-1">
                <button
                    onClick={toggleSidebar}
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="relative w-full max-w-md hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search items, bills, or customers..."
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-indigo-400 dark:focus:bg-slate-900 transition-all"
                    />
                </div>
            </div>

            {/* Right side: Actions & profile */}
            <div className="flex items-center gap-2 sm:gap-4">
                
                {/* Widen the container slightly for the new ShopSwitcher */}
                <div className="w-56 hidden lg:block">
                    <ShopSwitcher />
                </div>

                {/* Quick Action Button */}
                <Link 
                    href="/billing/new"
                    className='hidden sm:flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-sm shadow-orange-500/20'
                >
                    <PlusCircle className="h-4 w-4" />
                    New Bill
                </Link>

                {/* Utility Icons */}
                <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4 mr-1 dark:border-slate-800">
                    <ThemeToggle/>
                    <button className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                        <Maximize className="h-4 w-4" />
                    </button>
                    <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                        <Bell className="h-4 w-4" />
                        <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
                    </button>
                </div>

                {/* User Profile */}
                <UserProfile/>
            </div>
        </header>
    )
}
