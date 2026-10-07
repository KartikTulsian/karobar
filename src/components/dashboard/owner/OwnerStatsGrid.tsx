"use client";

import { useBills } from '@/hooks/useBilling';
import { useDailySummaries, usePnLDashboard, useGstDashboard } from '@/hooks/useFinance';
import { useLowStockInventory } from '@/hooks/useInventory';
import { useCustomers, useSuppliers } from '@/hooks/usePeople';
import { useTenantStore } from '@/store/useTenantStore';
import { Calculator, ChartLine, IndianRupee, Loader2, Receipt, TriangleAlert, Truck, Users } from 'lucide-react';
import { useMemo } from 'react'
import { getLocalDateString } from '@/lib/utils';
import { toAmount } from './Duespanel';

export default function OwnerStatsGrid() {

  const { activeTenant } = useTenantStore();
  const tenantId = activeTenant?.tenantId || "";

  // 1. Calculate relative dates for the queries
  const { today, yesterday, startOfMonth, endOfMonth } = useMemo(() => {
    const t = new Date();
    const y = new Date(t);
    y.setDate(y.getDate() - 1);
    const som = new Date(t.getFullYear(), t.getMonth(), 1);
    const eom = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return {
      today: getLocalDateString(t.toISOString()),
      yesterday: getLocalDateString(y.toISOString()),
      startOfMonth: getLocalDateString(som.toISOString()),
      endOfMonth: getLocalDateString(eom.toISOString())
    };
  }, []);

  // 2. Fetch all required data concurrently
  const { data: dailySummaries, isLoading: isLoadingDaily, isError: isErrDaily, refetch: refetchDaily } = useDailySummaries(tenantId, yesterday, today);
  const { data: pnlData, isLoading: isLoadingPnl, isError: isErrPnl, refetch: refetchPnl } = usePnLDashboard(tenantId, startOfMonth, endOfMonth);
  const { data: gstData, isLoading: isLoadingGst, isError: isErrGst, refetch: refetchGst } = useGstDashboard(tenantId, startOfMonth, endOfMonth);
  const { data: customers, isLoading: isLoadingCust, isError: isErrCust, refetch: refetchCust } = useCustomers(tenantId);
  const { data: suppliers, isLoading: isLoadingSupp, isError: isErrSupp, refetch: refetchSupp } = useSuppliers(tenantId);
  const { lowStockItems, isLoading: isLoadingInv } = useLowStockInventory(tenantId);
  const { data: allBills, isLoading: isLoadingBills, isError: isErrBills, refetch: refetchBills } = useBills(tenantId);

  // 3. Process the stats if data is loaded
  const isLoading = isLoadingDaily || isLoadingPnl || isLoadingGst || isLoadingCust || isLoadingInv || isLoadingBills || isLoadingSupp;

  const hasError = isErrDaily || isErrPnl || isErrGst || isErrCust || isErrSupp || isErrBills;
  const retryAll = () => {
    if (isErrDaily) refetchDaily();
    if (isErrPnl) refetchPnl();
    if (isErrGst) refetchGst();
    if (isErrCust) refetchCust();
    if (isErrSupp) refetchSupp();
    if (isErrBills) refetchBills();
  };

  const stats = useMemo(() => {
    if (isLoading || hasError) return [];

    // Sales & Trends
    const todaySummary = dailySummaries?.find(s => s.summary_date === today);
    const yesterdaySummary = dailySummaries?.find(s => s.summary_date === yesterday);

    const todaySales = Number(todaySummary?.total_sales || 0);
    const yesterdaySales = Number(yesterdaySummary?.total_sales || 0);
    const salesTrend = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
    const todayBillsCount = Number(todaySummary?.bill_count || 0);

    // Pending Bills Count (Today)
    const todaysBills = allBills?.filter(b => b.bill_date === today) || [];
    const pendingTodayCount = todaysBills.filter(b => b.status === 'issued' || b.status === 'partial').length;

    // Profit & Margins
    const monthProfit = pnlData?.kpis.netProfit || 0;
    const monthRevenue = pnlData?.kpis.totalRevenue || 0;
    const margin = monthRevenue > 0 ? ((monthProfit / monthRevenue) * 100) : 0;

    // Dues Collection
    const totalDues = customers?.reduce((sum, c) => sum + Math.max(0, toAmount(c.outstanding_due)), 0) || 0;
    const customersWithDuesCount = customers?.filter(c => toAmount(c.outstanding_due) > 0).length || 0;

    // Supplier Dues (to pay)
    const totalSupplierDues = suppliers?.reduce((sum, s) => sum + Math.max(0, toAmount(s.outstanding_due)), 0) || 0;
    const suppliersWithDuesCount = suppliers?.filter(s => toAmount(s.outstanding_due) > 0).length || 0;

    // GST & Inventory
    const gstLiability = gstData?.net_gst_payable || 0;
    const lowStockCount = lowStockItems?.length || 0;

    // Formatter
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const formatExact = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    return [
      {
        title: "Today's Sales",
        value: formatCurrency(todaySales),
        trend: yesterdaySales > 0 ? `${salesTrend > 0 ? '+' : ''}${salesTrend.toFixed(1)}% vs yesterday` : 'No sales yesterday',
        trendUp: salesTrend >= 0,
        icon: IndianRupee,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100/50 dark:bg-emerald-500/10",
      },
      {
        title: "Today's Bills",
        value: String(todayBillsCount),
        subtext: pendingTodayCount > 0 ? `${pendingTodayCount} pending payment` : 'All settled today',
        alert: pendingTodayCount > 0,
        icon: Receipt,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100/50 dark:bg-blue-500/10",
      },
      {
        title: "Month Profit",
        value: formatCurrency(monthProfit),
        subtext: `Margin ${margin.toFixed(1)}%`,
        icon: ChartLine,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-100/50 dark:bg-indigo-500/10",
      },
      {
        title: "Dues to Collect",
        value: formatExact(totalDues),
        subtext: `${customersWithDuesCount} customers`,
        alert: totalDues > 0,
        icon: Users,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100/50 dark:bg-orange-500/10",
      },
      {
        title: "Dues to Pay",
        value: formatExact(totalSupplierDues),
        subtext: `${suppliersWithDuesCount} suppliers`,
        alert: totalSupplierDues > 0,
        icon: Truck,
        color: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-100/50 dark:bg-rose-500/10",
      },
      {
        title: "Low Stock Items",
        value: String(lowStockCount),
        subtext: lowStockCount > 0 ? "Reorder needed" : "Stock optimal",
        alert: lowStockCount > 0,
        icon: TriangleAlert,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100/50 dark:bg-red-500/10",
      },
      {
        title: "GST Liability",
        value: formatCurrency(gstLiability),
        subtext: "This month",
        icon: Calculator,
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-800",
      }
    ];
  }, [isLoading, hasError, dailySummaries, today, yesterday, pnlData, customers, suppliers, gstData, lowStockItems, allBills]);

  if (isLoading) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-center dark:border-red-500/20 dark:bg-red-500/10">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">Couldn&apos;t load dashboard stats</p>
        <button
          onClick={retryAll}
          className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className='grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/5 transition-transform duration-300 group-hover:scale-110 ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={1.5} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
            <h3 className='text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>{stat.value}</h3>
          </div>

          <div className="mt-4 flex items-center">
            {stat.trend ? (
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${stat.trendUp ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20'}`}>
                {stat.trend}
              </span>
            ) : (
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${stat.alert ? 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20' : 'bg-slate-50 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'}`}>
                {stat.subtext}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}