"use client";

import { useTenantStore } from '@/store/useTenantStore';
import { useLowStockInventory } from '@/hooks/useInventory';
import { Loader2, TriangleAlert } from 'lucide-react';

export default function LowStockPanel() {
  const { activeTenant } = useTenantStore();
  const tenantId = activeTenant?.tenantId || "";
  
  // Fetch real inventory data leveraging the custom hook
  const { lowStockItems, outOfStockItems, isLoading } = useLowStockInventory(tenantId);

  // Combine out-of-stock and low-stock items, prioritizing out-of-stock first, and take the top 5
  const itemsToDisplay = [...outOfStockItems, ...lowStockItems].slice(0, 5);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Low Stock Alerts</h3>
        <TriangleAlert className="h-5 w-5 text-orange-500" />
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-5 py-3 font-medium">Item Name</th>
              <th className="px-5 py-3 font-medium text-right">Current Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={2} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
                </td>
              </tr>
            ) : itemsToDisplay.length === 0 ? (
              <tr>
                <td colSpan={2} className="h-32 text-center text-slate-500">
                  Inventory is looking healthy!
                </td>
              </tr>
            ) : (
              itemsToDisplay.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold
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
    </div>
  );
}