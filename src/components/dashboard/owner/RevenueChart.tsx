"use client";

import { useMemo } from 'react';
import { useTenantStore } from '@/store/useTenantStore';
import { usePnLDashboard } from '@/hooks/useFinance';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalDateString } from '@/lib/utils';

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

  // Fetch the P&L Dashboard data
  const { data: pnlData, isLoading } = usePnLDashboard(tenantId, startOfMonth, endOfMonth);

  // Format dates from "YYYY-MM-DD" to "DD MMM" for the X-Axis
  const chartData = useMemo(() => {
    if (!pnlData?.charts?.dailyTrends) return [];
    return pnlData.charts.dailyTrends.map(day => ({
      ...day,
      displayDate: new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }));
  }, [pnlData]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex h-[450px] w-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Revenue Overview</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Daily sales performance for the current month.</p>
      </div>

      <div className="flex-1 min-h-0 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
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
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(val) => `₹${val / 1000}k`}
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
  );
}