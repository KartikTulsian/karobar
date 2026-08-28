"use client";

import { Search, Filter, Plus } from 'lucide-react';

interface CashBookControlPanelProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedType: string;
    setSelectedType: (val: string) => void;
    selectedSource: string;
    setSelectedSource: (val: string) => void;
    selectedMethod: string;
    setSelectedMethod: (val: string) => void;
    onAddEntry: () => void;
}

export default function CashBookControlPanel({
    searchQuery, setSearchQuery, selectedType, setSelectedType, selectedSource, setSelectedSource, selectedMethod, setSelectedMethod, onAddEntry
}: CashBookControlPanelProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">

            {/* Left side: Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="h-9 w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <option value="all">All Flows (In/Out)</option>
                        <option value="in">Money In</option>
                        <option value="out">Money Out</option>
                    </select>

                    <select
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="h-9 w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <option value="all">All Methods</option>
                        <option value="cash">Cash (Drawer)</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card / POS</option>
                    </select>

                    <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="h-9 w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <option value="all">All Sources</option>
                        <option value="manual">Manual Adjustments</option>
                        <option value="sale">Sales</option>
                        <option value="purchase">Purchases</option>
                        <option value="expense">Expenses</option>
                        <option value="advance">Advances</option>
                        <option value="return">Returns & Refunds</option>
                    </select>
                </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex shrink-0 gap-3">
                <button
                    onClick={onAddEntry}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 shadow-sm"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Manual Entry
                </button>
            </div>
        </div>
    )
}
