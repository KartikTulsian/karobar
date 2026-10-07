"use client";

import { useMemo } from 'react';
import { useTenantStore } from '@/store/useTenantStore';
import { usePnLDashboard } from '@/hooks/useFinance';
import { Loader2, TriangleAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalDateString } from '@/lib/utils';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

// Compact Indian-style axis labels: ₹500, ₹12.5k, ₹1.2L
const formatTick = (v: number) =>
  v >= 100000 ? `₹${+(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${+(v / 1000).toFixed(1)}k` : `₹${v}`;

export default function RevenueChart() {
  const { activeTenant } = useTenantStore();
  const tenantId = activeTenant?.tenantId || "";

  // Calculate the Start and End of the current month
  const { startOfMonth, endOfMonth } = useMemo(() => {
    const t = new Date();
    const som = new Date(t.getFullYear(), t.getMonth(), 1);
    const eom = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return {
      startOfMonth: getLocalDateString(som.toISOString()),
      endOfMonth: getLocalDateString(eom.toISOString())
    };
  }, []);

  const { data: pnlData, isLoading, isError, refetch } = usePnLDashboard(tenantId, startOfMonth, endOfMonth);

  // "YYYY-MM-DD" -> "D MMM" (parsed as local time to avoid a one-day shift)
  const chartData = useMemo(() => {
    if (!pnlData?.charts?.dailyTrends) return [];
    return pnlData.charts.dailyTrends.map(day => ({
      ...day,
      displayDate: new Date(`${String(day.date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }));
  }, [pnlData]);

  const monthRevenue = pnlData?.kpis?.totalRevenue;

  return (
    <div className="flex h-full min-h-[420px] w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Revenue Overview</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Daily sales performance for the current month.</p>
        </div>
        {!isLoading && !isError && typeof monthRevenue === 'number' && (
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">This month</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(monthRevenue)}</p>
          </div>
        )}
      </div>

      {/* relative + absolute inset-0 keeps the chart sized correctly whether or not the parent has a fixed height */}
      <div className="relative min-h-[300px] w-full flex-1">
        <div className="absolute inset-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <TriangleAlert className="h-8 w-8 text-red-500" strokeWidth={1.5} />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Couldn&apos;t load revenue data</p>
              <button
                onClick={() => refetch()}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              No revenue data available for this month.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={56}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={formatTick}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                  labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}