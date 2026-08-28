import { ReorderIntelligenceItem } from '@/types/reports';
import { AlertTriangle, ShoppingCart } from 'lucide-react';

interface ReorderProps {
    items: ReorderIntelligenceItem[];
}

export default function ReorderTable({ items }: ReorderProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8 overflow-hidden transition-colors">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Reorder Intelligence</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Based on trailing 30-day average daily sales.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 uppercase">
                        <tr>
                            <th className="px-6 py-3">Item Name</th>
                            <th className="px-6 py-3">Current Stock</th>
                            <th className="px-6 py-3">Avg. Daily Sales</th>
                            <th className="px-6 py-3">Runway</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Inventory levels are healthy.</td></tr>
                        )}
                        {items.map(item => (
                            <tr key={item.item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.current_stock}</td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.avg_daily_sales} / day</td>
                                <td className={`px-6 py-4 font-medium flex items-center gap-2 ${item.runway_days < 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-500'}`}>
                                    {item.runway_days < 7 && <AlertTriangle className="w-4 h-4" />}
                                    ~{item.runway_days} Days
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors">
                                        <ShoppingCart className="w-3 h-3" /> Add to PO
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}