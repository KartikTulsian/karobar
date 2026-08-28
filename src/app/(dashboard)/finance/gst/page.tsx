"use client";

import GstControlPanel from '@/components/finance/gst/GstControlPanel';
import GstDataTables from '@/components/finance/gst/GstDataTables';
import GstKpiCards from '@/components/finance/gst/GstKpiCards';
import GstSalesCharts from '@/components/finance/gst/GstSalesCharts';
import { useGstDashboard } from '@/hooks/useFinance';
import { useTenantStore } from '@/store/useTenantStore';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { useState } from 'react'

type GstViewMode = 'overview' | 'hsn' | 'suppliers';

export default function GSTDashboardPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    // const handleRefresh = () => {
    //     setIsRefreshing(true);
    //     setTimeout(() => setIsRefreshing(false), 1000);
    // };

    const [dateRange, setDateRange] = useState({
        start: "2026-06-01",
        end: "2026-06-30",
    });
    const [viewMode, setViewMode] = useState<GstViewMode>('overview');

    const { 
        data: dashboardData, 
        isLoading, 
        isError, 
        refetch, 
        isFetching 
    } = useGstDashboard(tenantId, dateRange.start, dateRange.end);

    const actionRequiredCount = dashboardData?.breakdown.find(b => 
        String(b.description).includes('CDNR')
    )?.record_count || 0;

    return (
        <div className="flex w-full max-w-7xl flex-col mx-auto gap-6 p-4 sm:p-6 lg:p-8 min-h-screen">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">GST Reconciliation Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monthly overview of output liability (GSTR-1) and input credits (GSTR-2B).</p>
            </div>

            {/* Modular Control Panel */}
            <GstControlPanel
                dateRange={dateRange}
                viewMode={viewMode}
                onDateChange={setDateRange}
                onViewChange={setViewMode}
                isRefreshing={isFetching}
                onRefresh={refetch}
            />

            {/* State Rendering Logic */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    <span className="text-sm font-medium text-slate-500">Calculating GST aggregates...</span>
                </div>
            ) : isError ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-red-500">
                    <span className="text-sm font-medium">Failed to load GST data.</span>
                </div>
            ) : !dashboardData ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-500">
                    <BarChart3 className="h-10 w-10 text-slate-300" />
                    <span className="text-sm font-medium">No data found.</span>
                </div>
            ) : (
                <div className='flex flex-col gap-6'>
                    {/* Info Banner (Conditionally rendered if actions are needed) */}
                    {actionRequiredCount > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p>
                                <span className="font-semibold">Action Required:</span> There are {actionRequiredCount} B2B Credit Notes that require your attention before pushing to the Government Portal.
                            </p>
                        </div>
                    )}

                    <GstKpiCards data={dashboardData} />
                    
                    {/* Only show visual charts on the overview tab to prevent clutter */}
                    {viewMode === 'overview' && (
                        <GstSalesCharts breakdown={dashboardData.breakdown} />
                    )}
                    
                    {/* The dynamic multi-tab table */}
                    <GstDataTables data={dashboardData} viewMode={viewMode} />
                </div>
            )}

        </div>
    )
}
