"use client";

import StatCard from '@/components/common/StatCard';
import SalesControlPanel from '@/components/reports/sales/SalesControlPanel';
import SalesDataTable from '@/components/reports/sales/SalesDataTable'
import SalesReportHeader from '@/components/reports/sales/SalesReportHeader'
import { useBrands, useCategories } from '@/hooks/useInventory';
import { useSalesReport } from '@/hooks/useReports';
import { useTenantStore } from '@/store/useTenantStore';
import { ReportTimeframe } from '@/types/reports';
import { AlertOctagon, Clock, IndianRupee, Loader2, Wallet } from 'lucide-react';
import { useState } from 'react'

export default function SalesReportPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [timeframe, setTimeframe] = useState<ReportTimeframe>('monthly');
    const [brandId, setBrandId] = useState<string>('');
    const [categoryId, setCategoryId] = useState<string>('');

    const { data, isLoading, isError, error, isPlaceholderData } = useSalesReport(tenantId, {
        timeframe,
        brandId: brandId || undefined, // undefined prevents empty strings passing to API
        categoryId: categoryId || undefined,
    });

    const { data: brands = [] } = useBrands(tenantId);
    const { data: categories = [] } = useCategories(tenantId);

    const formatINR = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    if (isError) {
        return (
            <div className="p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl m-6">
                <h3 className="font-semibold text-lg">Failed to load sales report</h3>
                <p className="text-sm mt-1">{error?.message || "An error occurred while fetching metrics."}</p>
            </div>
        );
    }

    const isFetching = isLoading || isPlaceholderData;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
                
                <SalesReportHeader />

                {/* Filters and Controls */}
                <SalesControlPanel
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    brandId={brandId}
                    onBrandChange={setBrandId}
                    categoryId={categoryId}
                    onCategoryChange={setCategoryId}
                    brands={brands}
                    categories={categories}
                    isFetching={isFetching}
                />

                {isLoading && !data ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                ) : data ? (
                    <>
                        {/* Executive KPIs using the reusable StatCard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Amount (Revenue)"
                                value={formatINR(data.kpis.totalAmount)}
                                subtitle="Gross revenue raised"
                                icon={<IndianRupee className="w-5 h-5 text-green-600 dark:text-green-400" />}
                            />
                            <StatCard
                                title="Total Paid"
                                value={formatINR(data.kpis.totalPaid)}
                                subtitle="Cash successfully collected"
                                icon={<Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                            />
                            <StatCard
                                title="Total Unpaid"
                                value={formatINR(data.kpis.totalUnpaid)}
                                valueColor="text-orange-600 dark:text-orange-500"
                                subtitle="Pending credit collections"
                                icon={<Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                            />
                            <StatCard
                                title="Overdue Debt"
                                value={formatINR(data.kpis.overdue)}
                                valueColor="text-red-600 dark:text-red-500"
                                subtitle="Unpaid past the due date"
                                icon={<AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />}
                            />
                        </div>

                        {/* Data Table */}
                        <SalesDataTable data={data.products} />
                    </>
                ) : null}
            </div>
        </div>
    )
}
