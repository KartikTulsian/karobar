"use client";

import { useTenantStore } from '@/store/useTenantStore';
import { useBills } from '@/hooks/useBilling';
import { Loader2 } from 'lucide-react';

export default function RecentBillsPanel() {
  const { activeTenant } = useTenantStore();
  const tenantId = activeTenant?.tenantId || "";
  
  // Fetch real bills from the database
  const { data: bills, isLoading } = useBills(tenantId);

  // Sort by newest first, and slice the top 5
  const recentBills = bills 
    ? [...bills].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).reverse().slice(0, 5)
    : [];

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Bills</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium text-right">Amount</th>
              <th className="px-5 py-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
                </td>
              </tr>
            ) : recentBills.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-32 text-center text-slate-500">
                  No recent bills found.
                </td>
              </tr>
            ) : (
              recentBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {/* Assuming the query joins customer details, otherwise fallback to generic text */}
                    {bill.customers?.name || "Walk-in Customer"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{bill.bill_number}</td>
                  <td className="px-5 py-3 text-right">{formatCurrency(Number(bill.grand_total))}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wider
                      ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                      ${bill.status === 'issued' || bill.status === 'partial' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                      ${bill.status === 'draft' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : ''}
                    `}>
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