"use client";

import Link from 'next/link';
import { useTenantStore } from '@/store/useTenantStore';
import { useBills } from '@/hooks/useBilling';
import { Loader2, TriangleAlert } from 'lucide-react';

const ALL_BILLS_HREF = '/bills'; // adjust to your "All bills" route

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  issued: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};
const STATUS_FALLBACK = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

const formatBillDate = (d?: string | null) => {
  if (!d) return '—';
  const parsed = new Date(`${d.slice(0, 10)}T00:00:00`); // avoids UTC day-shift
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function RecentBillsPanel() {
  const { activeTenant } = useTenantStore();
  const tenantId = activeTenant?.tenantId || "";

  const { data: bills, isLoading, isError, refetch } = useBills(tenantId);

  // Newest first (the old code reversed this and showed the OLDEST bills)
  const recentBills = bills
    ? [...bills]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    : [];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Bills</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Latest 5 bills created</p>
        </div>
        <Link href={ALL_BILLS_HREF} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="h-40 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="h-40 text-center">
                  <TriangleAlert className="mx-auto mb-2 h-6 w-6 text-red-500" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Couldn&apos;t load recent bills</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : recentBills.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-40 text-center text-slate-500">
                  No recent bills found.
                </td>
              </tr>
            ) : (
              recentBills.map((bill) => (
                <tr key={bill.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {bill.customers?.name || "Walk-in Customer"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs">{bill.bill_number}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-500 dark:text-slate-400">
                    {formatBillDate(bill.bill_date)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(Number(bill.grand_total))}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider ${STATUS_STYLES[bill.status] ?? STATUS_FALLBACK}`}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}