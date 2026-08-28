"use client";

import StatCard from '@/components/common/StatCard';
import DashboardHeader from '@/components/reports/inventory/DashboardHeader';
import ReorderTable from '@/components/reports/inventory/ReorderTable';
import VelocitySection from '@/components/reports/inventory/VelocitySection';
import { useInventoryReport } from '@/hooks/useReports';
import { useTenantStore } from '@/store/useTenantStore';
import { ReportTimeframe } from '@/types/reports';
import { IndianRupee, AlertCircle, PackageSearch, Activity, Loader2 } from 'lucide-react';
import { useState } from 'react';

// import AuditTabs from './components/AuditTabs'; // We can build this tab component next

export default function InventoryDashboardPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [timeframe, setTimeframe] = useState<ReportTimeframe>('monthly');

    const { data, isLoading, isError, error, isPlaceholderData } = useInventoryReport(tenantId, { timeframe });

    const formatINR = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    if (isError) {
        return (
            <div className="p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl m-6">
                <h3 className="font-semibold text-lg">Failed to load report</h3>
                <p className="text-sm mt-1">{error?.message || "An error occurred while fetching inventory metrics."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">

                {/* Row 0: Context */}
                <DashboardHeader
                    selectedTimeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    isFetching={isLoading || isPlaceholderData}
                    tenantId={tenantId}
                />

                {isLoading && !data ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                ) : data ? (
                    <>
                        {/* Row 1: Executive Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard
                                title="Asset Value (COGS)"
                                value={formatINR(data.executive_summary.total_asset_value)}
                                subtitle="Based on active batch buy price"
                                icon={<IndianRupee className="w-5 h-5" />}
                            />
                            <StatCard
                                title="Potential Revenue"
                                value={formatINR(data.executive_summary.potential_revenue)}
                                subtitle="Expected yield at default sell price"
                                icon={<Activity className="w-5 h-5" />}
                            />
                            <StatCard
                                title="Locked Capital"
                                value={formatINR(data.executive_summary.locked_capital)}
                                valueColor="text-amber-600 dark:text-amber-500"
                                subtitle="Idle stock in selected timeframe"
                                icon={<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />}
                            />
                            <StatCard
                                title="Stock Health"
                                value={
                                    <div className="flex gap-2 text-sm mt-2">
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md font-medium">
                                            {data.executive_summary.health.in_stock} Healthy
                                        </span>
                                        {(data.executive_summary.health.low_stock > 0 || data.executive_summary.health.out_of_stock > 0) && (
                                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md font-medium">
                                                {data.executive_summary.health.low_stock + data.executive_summary.health.out_of_stock} Risk
                                            </span>
                                        )}
                                    </div>
                                }
                                subtitle="Current inventory status"
                                icon={<PackageSearch className="w-5 h-5" />}
                            />
                        </div>

                        {/* Row 2: Analytics & Trends */}
                        <VelocitySection
                            chartData={data.velocity.chart_data}
                            runners={data.velocity.runners}
                            stragglers={data.velocity.stragglers}
                        />

                        {/* Row 3: Actionable Intelligence */}
                        <ReorderTable items={data.reorder_intelligence} />
                    </>
                ) : null}
            </div>
        </div>
    );
}