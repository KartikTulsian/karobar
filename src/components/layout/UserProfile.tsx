"use client";

import { signOutAction } from '@/actions/auth.actions';
import { supabase } from '@/lib/supabase/client';
import { useTenantStore } from '@/store/useTenantStore';
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

export default function UserProfile() {
    const activeTenant = useTenantStore((state) => state.activeTenant);

    const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [showConfirm, setShowConfirm] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfile({
                    name: user.user_metadata?.full_name || 'User',
                    email: user.email || '',
                })
            }
        };
        fetchUser();
    }, []);

    const handleLogOut = async () => {
        setIsLoggingOut(true);
        try {
            // Call the secure Server Action to destroy the HTTP-only cookies
            const res = await signOutAction();

            if (res.success) {
                // Clear the Zustand store so no data leaks between accounts
                useTenantStore.getState().clearStore();

                toast.success("Logged out successfully");
                // Use window.location instead of router.push to force a hard reload of all states
                window.location.href = "/login";
            }
        } catch (error) {
            toast.error("Failed to logout");
            setIsLoggingOut(false);
            setShowConfirm(false);
        }
    }

    return (
        <>
            {/* 1. The Normal User Profile Header Element */}
            <div className="flex items-center pl-4 border-l border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mr-3">
                    
                    {/* Premium Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 dark:from-indigo-900/50 dark:to-violet-900/50 dark:border-indigo-800 dark:text-indigo-300 shadow-sm">
                        {profile?.name ? (
                            profile.name.charAt(0).toUpperCase()
                        ) : (
                            <User className="h-5 w-5 opacity-70" />
                        )}
                    </div>

                    {/* Profile Text */}
                    <div className="text-sm hidden md:flex md:flex-col">
                        <p className="font-bold leading-none text-slate-900 dark:text-slate-50 mb-1.5">
                            {profile?.name || 'Loading...'}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium leading-none text-slate-500 dark:text-slate-400">
                                {profile?.email}
                            </p>
                            {activeTenant?.role && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">
                                        {activeTenant.role}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sleek Logout Button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    title="Sign Out"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>

            {/* 2. The Confirmation Modal Overlay */}
            {showConfirm && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500">
                                <LogOut className="h-6 w-6 pr-0.5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sign Out</h3>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Are you sure you want to log out of your account? You will need to sign in again to access your dashboard.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isLoggingOut}
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogOut}
                                disabled={isLoggingOut}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70 transition-colors"
                            >
                                {isLoggingOut ? "Signing out..." : "Yes, Sign Out"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
