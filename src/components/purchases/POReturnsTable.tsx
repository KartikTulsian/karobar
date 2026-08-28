import { PurchaseReturnWithDetails, POLineItem } from '@/types/purchases';
import { CornerDownLeft } from 'lucide-react';


interface POReturnsTableProps {
    returns: PurchaseReturnWithDetails[];
    originalItems: POLineItem[];
}

export default function POReturnsTable({ returns, originalItems }: POReturnsTableProps) {

    if (!returns || returns.length === 0) return null;

    const getItemName = (lineItemId: string) => {
        const item = originalItems.find(i => i.id === lineItemId);
        return item ? item.item_name : 'Unknown Item';
    };

    return (
        <div className="py-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded bg-orange-100 dark:bg-orange-500/10">
                    <CornerDownLeft className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">Processed Returns</h3>
            </div>

            <div className="space-y-4">
                {returns.map((ret) => (
                    <div key={ret.id} className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-orange-950/20 overflow-hidden shadow-sm">
                        <div className="flex flex-wrap justify-between items-center gap-4 p-4 border-b border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Return Date: <span className="text-slate-900 dark:text-slate-200">{new Date(ret.created_at).toLocaleDateString('en-GB')}</span>
                                </p>
                                {ret.reason && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1"><span className="font-medium">Reason:</span> {ret.reason}</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                                    Refunded via {ret.refund_method?.replace('_', ' ')}
                                </p>
                                <p className="text-lg font-black text-orange-600 dark:text-orange-400">
                                    ₹{ret.refund_amount.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-500 dark:text-slate-400 border-b border-orange-100 dark:border-orange-900/30">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider">Returned Item</th>
                                    <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-center">Qty</th>
                                    <th className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-right">Refund Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-50 dark:divide-orange-900/20">
                                {ret.return_items?.map(item => (
                                    <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                                        <td className="px-4 py-3 font-medium">{getItemName(item.po_line_item_id)}</td>
                                        <td className="px-4 py-3 text-center font-bold text-orange-600 dark:text-orange-400">{item.return_qty}</td>
                                        <td className="px-4 py-3 text-right font-medium">₹{item.refund_amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    )
}
