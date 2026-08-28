"use client";

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useInvalidateTopCustomersReport, useTopCustomersReport } from '@/hooks/useReports';
import { ReportTimeframe } from '@/types/reports';
import CustomerControlPanel from '@/components/reports/customers/CustomerControlPanel';
import TopThreePodium from '@/components/reports/customers/TopThreePodium';
import CustomerLeaderboardTable from '@/components/reports/customers/CustomerLeaderboardTable';
import { useTenantStore } from '@/store/useTenantStore';

export default function TopCustomersPage() {
    // Replace with your actual auth context provider value
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const invalidateReport = useInvalidateTopCustomersReport();
    
    const [draftTimeframe, setDraftTimeframe] = useState<ReportTimeframe>('monthly');
    const [draftCustomerType, setDraftCustomerType] = useState<'all' | 'registered' | 'flying'>('all');
    const [draftStartDate, setDraftStartDate] = useState<string>('');
    const [draftEndDate, setDraftEndDate] = useState<string>('');

    const [appliedFilters, setAppliedFilters] = useState({
        timeframe: 'monthly' as ReportTimeframe,
        customerType: 'all' as 'all' | 'registered' | 'flying',
        startDate: '',
        endDate: ''
    });

    const { data: topCustomers = [], isLoading, isError, error, isPlaceholderData } = useTopCustomersReport(tenantId, {
        timeframe: appliedFilters.timeframe,
        customerType: appliedFilters.customerType,
        startDate: appliedFilters.timeframe === 'custom' ? appliedFilters.startDate : undefined,
        endDate: appliedFilters.timeframe === 'custom' ? appliedFilters.endDate : undefined,
        limit: 100
    });

    const isFetching = isLoading || isPlaceholderData;

    const handleApplyFilters = () => {
        // Overwrite the applied state with whatever is in the draft state
        setAppliedFilters({
            timeframe: draftTimeframe,
            customerType: draftCustomerType,
            startDate: draftStartDate,
            endDate: draftEndDate
        });
        
        invalidateReport(tenantId);
    };

    // Slice the data into the Top 3 (for the podium) and the Rest (for the table)
    const podiumCustomers = topCustomers.slice(0, 3);
    const leaderboardCustomers = topCustomers.slice(3);

    if (isError) {
        return (
            <div className="p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl m-6">
                <h3 className="font-semibold text-lg">Failed to load Top Customers</h3>
                <p className="text-sm mt-1">{error?.message || "An error occurred while fetching metrics."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 p-6 lg:p-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">
                
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Top Customers
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Ranked by total cash paid. Monitor your most valuable relationships and manage credit risks.
                    </p>
                </div>

                <CustomerControlPanel
                    timeframe={draftTimeframe}
                    onTimeframeChange={setDraftTimeframe}
                    startDate={draftStartDate}
                    onStartDateChange={setDraftStartDate}
                    endDate={draftEndDate}
                    onEndDateChange={setDraftEndDate}
                    customerType={draftCustomerType}
                    onCustomerTypeChange={setDraftCustomerType}
                    onApply={handleApplyFilters}
                    isFetching={isFetching}
                />

                {isLoading && topCustomers.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                ) : topCustomers.length === 0 ? (
                    <div className="text-center p-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                        <p className="text-gray-500 dark:text-gray-400">No customers found for the selected timeframe and filters.</p>
                    </div>
                ) : (
                    <>
                        <TopThreePodium topCustomers={podiumCustomers} />
                        
                        {/* Only show the table if we have 4 or more customers */}
                        {leaderboardCustomers.length > 0 && (
                            <CustomerLeaderboardTable customers={leaderboardCustomers} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}