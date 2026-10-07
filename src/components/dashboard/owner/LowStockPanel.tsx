"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useTenantStore } from '@/store/useTenantStore';
import { useLowStockInventory } from '@/hooks/useInventory';
import { Loader2, TriangleAlert } from 'lucide-react';

const LOW_STOCK_HREF = '/inventory/low-stock'; // adjust to your "Low stock" route
const MAX_ROWS = 6;

export default function LowStockPanel() {
  const { activeTenant } = useTenantStore();
  const tenantId = activeTenant?.tenantId || "";

  const { lowStockItems, outOfStockItems, isLoading } = useLowStockInventory(tenantId);

  // Out-of-stock first, then low-stock; de-duplicated by id in case an item is in both lists
  const allItems = useMemo(() => {
    const seen = new Set<string>();
    return [...(outOfStockItems ?? []), ...(lowStockItems ?? [])].filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [outOfStockItems, lowStockItems]);

  const itemsToDisplay = allItems.slice(0, MAX_ROWS);
  const outCount = outOfStockItems?.length ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Low Stock Alerts</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isLoading ? 'Loading…' : `${allItems.length} need attention${outCount > 0 ? ` · ${outCount} out of stock` : ''}`}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100/60 dark:bg-orange-500/10">
          <TriangleAlert className="h-5 w-5 text-orange-500" strokeWidth={1.75} />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Item Name</th>
              <th className="px-5 py-3 text-right font-medium">Stock / Min</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={2} className="h-40 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
                </td>
              </tr>
            ) : itemsToDisplay.length === 0 ? (
              <tr>
                <td colSpan={2} className="h-40 text-center text-slate-500">
                  Inventory is looking healthy!
                </td>
              </tr>
            ) : (
              itemsToDisplay.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    <span className="line-clamp-2" title={item.name}>{item.name}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums
                      ${item.total_stock_qty === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}
                    `}>
                      {item.total_stock_qty} / {item.low_stock_threshold}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && allItems.length > MAX_ROWS && (
        <Link
          href={LOW_STOCK_HREF}
          className="block border-t border-slate-200 px-5 py-3 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800/40"
        >
          View all {allItems.length} →
        </Link>
      )}
    </div>
  );
}