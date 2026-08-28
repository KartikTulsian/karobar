"use client";

import { useCreditLedger } from '@/hooks/useFinance';
import { ArrowDownLeft, ArrowUpRight, Loader2, Wallet } from 'lucide-react';

interface WalletLedgerProps {
    tenantId: string;
    entityType: 'customer' | 'supplier';
    entityId: string;
}

export default function WalletLedger({ tenantId, entityType, entityId }: WalletLedgerProps) {
    const { data: ledgerEntries, isLoading, isError } = useCreditLedger(tenantId, entityType, entityId);

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-red-500 dark:border-slate-800 dark:bg-slate-950">
                Failed to load wallet history.
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                    <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Wallet & Advance History</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Track credit notes, overpayments, and usage.</p>
                </div>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto p-5">
                {!ledgerEntries || ledgerEntries.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-50 p-4 dark:bg-slate-900/50">
                            <Wallet className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">No wallet activity yet</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 dark:border-slate-800">
                        {ledgerEntries.map((entry) => {
                            const isIn = entry.flow_type === 'in';
                            return (
                                <div key={entry.id} className="relative pl-6">
                                    {/* Timeline Node */}
                                    <div className={`absolute -left-[11px] top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-950 ${
                                        isIn ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
                                    }`}>
                                        {isIn ? (
                                            <ArrowDownLeft className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <ArrowUpRight className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                        )}
                                    </div>

                                    {/* Content Card */}
                                    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:bg-slate-900/50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                    {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                <h4 className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    {entry.reference_type.replace('_', ' ')}
                                                </h4>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block text-base font-bold ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                                                    {isIn ? '+' : '-'} ₹{Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                            {entry.description}
                                        </p>

                                        <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
                                            <span className="text-[10px] text-slate-400">ID: {entry.reference_id?.split('-')[0] || 'Manual'}</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Bal: ₹{Number(entry.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}