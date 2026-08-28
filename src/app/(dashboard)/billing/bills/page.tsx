"use client";

import BillsTable from '@/components/billing/BillsTable';
import { useBills } from '@/hooks/useBilling';
import { useTenantStore } from '@/store/useTenantStore';
import { CustomerType } from '@/types/people';
import { AlertTriangle, Download, FileText, Filter, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react'

type TabType = 'all' | CustomerType;

export default function AllBillsPage() {

    const router = useRouter();

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: bills = [], isLoading, isError } = useBills(tenantId);

    const filteredBills = useMemo(() => {
        let result = bills;

        if (activeTab !== 'all') {
            result = result.filter(bill => bill.customers?.type === activeTab);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                bill =>
                    bill.bill_number.toLowerCase().includes(query) ||
                    (bill.customers?.name.toLowerCase() || "").includes(query)
            );
        }

        return result;
    }, [bills, activeTab, searchQuery]);

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>
            {/* Page Header Area */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Balance Sheet</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and manage customer invoices and dues.</p>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </button>
                    <button className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> POS
                    </button>
                </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                {/* Custom Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {(['all', 'registered', 'flying'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === tab
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            {tab === 'all' ? 'All Bills' : `${tab} Customers`}
                        </button>
                    ))}
                </div>

                <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Invoice No or Customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50"
                        />
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-3">
                        <button className="inline-flex h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800">
                            <Filter className="h-4 w-4 text-slate-400" />
                            Status
                        </button>
                        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Month</option>
                        </select>
                    </div>
                </div>

                {/* Table Rendering */}
                {isLoading ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                        <span className="text-sm font-medium text-slate-500">Loading bills...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <AlertTriangle className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">Error fetching bills.</span>
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <FileText className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No bills found for the selected criteria.</span>
                    </div>
                ) : (
                    <BillsTable
                        data={filteredBills}
                        // onEdit={(bill) => router.push(`/bills/${bill.id}`)}
                        // onDelete={(bill) => router.push(`/bills/${bill.id}`)}
                    />
                )}
            </div>

        </div>
    )
}
