"use client";

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTopSuppliersReport, useInvalidateTopSuppliersReport } from '@/hooks/useReports';
import { ReportTimeframe } from '@/types/reports';
import SupplierControlPanel from '@/components/reports/suppliers/SupplierControlPanel';
import SupplierScorecardTable from '@/components/reports/suppliers/SupplierScorecardTable';
import { useTenantStore } from '@/store/useTenantStore';

export default function TopSuppliersPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";
    
    const invalidateReport = useInvalidateTopSuppliersReport();

    // 1. DRAFT STATE
    const [draftTimeframe, setDraftTimeframe] = useState<ReportTimeframe>('monthly');
    const [draftStartDate, setDraftStartDate] = useState<string>('');
    const [draftEndDate, setDraftEndDate] = useState<string>('');

    // 2. APPLIED STATE
    const [appliedFilters, setAppliedFilters] = useState({
        timeframe: 'monthly' as ReportTimeframe,
        startDate: '',
        endDate: ''
    });

    // 3. REACT QUERY
    const { data: topSuppliers = [], isLoading, isError, error, isPlaceholderData } = useTopSuppliersReport(tenantId, {
        timeframe: appliedFilters.timeframe,
        startDate: appliedFilters.timeframe === 'custom' ? appliedFilters.startDate : undefined,
        endDate: appliedFilters.timeframe === 'custom' ? appliedFilters.endDate : undefined,
        limit: 100
    });

    const isFetching = isLoading || isPlaceholderData;

    // 4. APPLY FUNCTION
    const handleApplyFilters = () => {
        setAppliedFilters({
            timeframe: draftTimeframe,
            startDate: draftStartDate,
            endDate: draftEndDate
        });
        
        invalidateReport(tenantId);
    };

    if (isError) {
        return (
            <div className="p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl m-6">
                <h3 className="font-semibold text-lg">Failed to load Vendor Scorecard</h3>
                <p className="text-sm mt-1">{error?.message || "An error occurred while fetching metrics."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 p-6 lg:p-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Top Suppliers
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track purchase volume, manage accounts payable, and monitor vendor quality via return rates.
                    </p>
                </div>

                <SupplierControlPanel
                    timeframe={draftTimeframe}
                    onTimeframeChange={setDraftTimeframe}
                    startDate={draftStartDate}
                    onStartDateChange={setDraftStartDate}
                    endDate={draftEndDate}
                    onEndDateChange={setDraftEndDate}
                    onApply={handleApplyFilters}
                    isFetching={isFetching}
                />

                {isLoading && topSuppliers.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                ) : topSuppliers.length === 0 ? (
                    <div className="text-center p-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                        <p className="text-gray-500 dark:text-gray-400">No purchase history found for the selected timeframe.</p>
                    </div>
                ) : (
                    <SupplierScorecardTable suppliers={topSuppliers} />
                )}
            </div>
        </div>
    );
}