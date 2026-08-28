"use client";

import { Search, Calendar, Plus } from 'lucide-react';

interface DailyCashSummaryControlPanelProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedMonth: string;
    setSelectedMonth: (val: string) => void;
    onAddEntry: () => void;
}

export default function DailyCashSummaryControlPanel({
    searchQuery, setSearchQuery, selectedMonth, setSelectedMonth, onAddEntry
}: DailyCashSummaryControlPanelProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">

            {/* Left side: Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="date"
                        placeholder="Search by date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Calendar className="h-4 w-4 text-slate-400 hidden sm:block" />
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="h-9 w-full sm:w-auto rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    />
                </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex shrink-0 gap-3">
                <button
                    onClick={onAddEntry}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 shadow-sm"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Quick Entry
                </button>
            </div>
        </div>
    )
}
