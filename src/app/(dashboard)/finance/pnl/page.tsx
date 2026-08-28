"use client";

import PnLCharts from '@/components/finance/pnl/PnLCharts';
import PnLControlPanel from '@/components/finance/pnl/PnLControlPanel';
import PnLDataTables from '@/components/finance/pnl/PnLDataTables';
import PnLKpiCards from '@/components/finance/pnl/PnLKpiCards';
import { usePnLDashboard } from '@/hooks/useFinance';
import { useTenantStore } from '@/store/useTenantStore';
import { useState } from 'react'

export default function FinancePnLPage() {

  const activeTenant = useTenantStore((state) => state.activeTenant);
  const tenantId = activeTenant?.tenantId || "";

  const [dateRange, setDateRange] = useState({
    start: "2026-06-01",
    end: "2026-06-07",
  });

  const [viewMode, setViewMode] = useState<'overview' | 'items' | 'entities'>('overview');

  const { data, isLoading, isError } = usePnLDashboard(tenantId, dateRange.start, dateRange.end);

  return (
    <div className="flex w-full max-w-7xl flex-col mx-auto gap-6 p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track your business margins and operational costs.</p>
        </div>
      </div>

      <PnLControlPanel 
        dateRange={dateRange} 
        onDateChange={setDateRange} 
        viewMode={viewMode}
        onViewChange={setViewMode}
      />

      {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            <span className="text-sm font-medium text-slate-500">Aggregating financial ledger...</span>
          </div>
        ) : isError || !data ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-red-500">
            <span className="text-sm font-medium">Failed to load financial data.</span>
          </div>
        ) : (
          <div className='flex flex-col gap-6'>
            
            {/* KPI Cards */}
            <PnLKpiCards data={data} />

            {/* Charts - Only visible on the general overview to prevent clutter */}
            {viewMode === 'overview' && (
              <PnLCharts data={data} />
            )}

            {/* The multi-dimensional Data Table */}
            <PnLDataTables data={data} viewMode={viewMode} />
            
          </div>
        )
      }
    </div>
  )
}
