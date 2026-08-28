"use client";

import PurchaseOrdersTable from '@/components/purchases/PurchaseOrdersTable';
import { usePurchaseOrders } from '@/hooks/usePurchases';
import { useTenantStore } from '@/store/useTenantStore';
import { Download, Search, FileText } from 'lucide-react';
import { useMemo, useState } from 'react'

export default function PurchaseOrdersPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data: orders = [], isLoading, isError } = usePurchaseOrders(tenantId);

    const filteredOrders = useMemo(() => {
        let result = orders;

        if (statusFilter) {
            result = result.filter(po => po.status === statusFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(po => 
                po.po_number.toLowerCase().includes(query) ||
                (po.suppliers?.name || "").toLowerCase().includes(query)
            );
        }
        
        return result;
    }, [searchQuery, statusFilter, orders]);

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>
            {/* Page Header Area */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your purchases, supplier bills, and payments.</p>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </button>
                    {/* <button className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Purchase
                    </button> */}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">

                {/* Table Toolbar */}
                <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Supplier or Reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        />
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-3">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                            <option value="">All Statuses</option>
                            <option value="received">Received</option>
                            <option value="sent">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="draft">Draft</option>
                        </select>
                        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
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
                        <span className="text-sm font-medium text-slate-500">Loading purchase orders...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-red-500">
                        <span className="text-sm font-medium">Failed to load data.</span>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <FileText className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No purchase orders found.</span>
                    </div>
                ) : (
                    <PurchaseOrdersTable data={filteredOrders} />
                )}
            </div>
        </div>
    );
}
