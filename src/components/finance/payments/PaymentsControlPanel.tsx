"use client";

import { Search, Plus } from 'lucide-react';

interface PaymentsControlPanelProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedTab: string;
    setSelectedTab: (val: string) => void;
    paymentMode: string;
    setPaymentMode: (val: string) => void;
    dateFilter: string;
    setDateFilter: (val: string) => void;
    onRecordPayment: () => void;
}

export default function PaymentsControlPanel({
    searchQuery, setSearchQuery, selectedTab, setSelectedTab, paymentMode, setPaymentMode, dateFilter, setDateFilter, onRecordPayment
}: PaymentsControlPanelProps) {
    return (
        <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {/* ROW 1: Pill Tabs & Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                {/* Pill Tabs */}
                <div className="inline-flex w-full sm:w-auto items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    {[
                        { id: 'all', label: 'All Payments' },
                        { id: 'in', label: 'Money In (Sales)' },
                        { id: 'out', label: 'Money Out (Purchases)' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`flex-1 sm:flex-none rounded-md px-4 py-1.5 text-sm font-medium transition-all ${selectedTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onRecordPayment}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Record Payment
                </button>
            </div>

            {/* ROW 2: Search & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800/80">

                {/* Search Bar */}
                <div className="relative md:col-span-6 lg:col-span-8">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Party Name or Receipt ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                {/* Mode Filter */}
                <div className="md:col-span-3 lg:col-span-2">
                    <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full h-[38px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        <option value="all">All Modes</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card / POS</option>
                    </select>
                </div>

                {/* Date Filter */}
                <div className="md:col-span-3 lg:col-span-2">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full h-[38px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    />
                </div>
            </div>

        </div>
    )
}
