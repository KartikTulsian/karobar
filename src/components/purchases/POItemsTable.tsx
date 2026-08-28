import { POLineItem, PurchaseReturnWithDetails } from '@/types/purchases'


interface POItemsProps {
    items: POLineItem[];
    returns?: PurchaseReturnWithDetails[];
    isGst: boolean;
    isInterstate: boolean;
}

export default function POItemsTable({ items, returns = [], isGst, isInterstate }: POItemsProps) {

    // Calculate total returns for a specific line item
    const getReturnedQty = (lineItemId: string) => {
        let totalReturned = 0;
        returns.forEach(ret => {
            ret.return_items?.forEach(retItem => {
                if (retItem.po_line_item_id === lineItemId) {
                    totalReturned += retItem.return_qty;
                }
            });
        });
        return totalReturned;
    }

    return (
        <div className="py-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                            <tr className="text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider font-bold">
                                <th className="px-4 py-3.5">Description</th>
                                {isGst && <th className="px-4 py-3.5">HSN</th>}
                                <th className="px-4 py-3.5 text-center">Ordered</th>
                                <th className="px-4 py-3.5 text-center">Received</th>
                                <th className="py-3 px-3.5 text-right">Unit Cost</th>
                                <th className="px-4 py-3.5 text-center">Disc %</th>
                                {isGst && <th className="px-4 py-3.5 text-center">GST %</th>}
                                {isGst && !isInterstate && <th className="px-4 py-3.5 text-right">CGST</th>}
                                {isGst && !isInterstate && <th className="px-4 py-3.5 text-right">SGST</th>}
                                {isGst && isInterstate && <th className="px-4 py-3.5 text-right">IGST</th>}
                                <th className="px-4 py-3.5 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {items.map((item) => {
                                const returnedQty = getReturnedQty(item.id);
                                const remainingQty = item.qty_received - returnedQty;

                                return (
                                    <tr key={item.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                {item.item_name}
                                                {returnedQty > 0 && (
                                                    <span className="inline-flex items-center rounded bg-red-100 dark:bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20">
                                                        Ret: {returnedQty}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {isGst && <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs font-mono">{item.hsn_code || '-'}</td>}
                                        <td className="py-4 px-2 text-center">{item.qty_ordered}</td>
                                        <td className="px-4 py-3 text-center">
                                            {returnedQty > 0 ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="text-red-500/70 line-through text-xs">
                                                        {item.qty_received}
                                                    </span>
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {remainingQty} <span className="text-[10px] uppercase font-bold text-slate-400">{item.unit || 'PCS'}</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {item.qty_received} <span className="text-[10px] uppercase font-bold text-slate-400">{item.unit || 'PCS'}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">₹{item.unit_cost.toFixed(2)}</td>
                                        <td className="py-4 px-2 text-center">{item.discount_pct || 0}%</td>
                                        {isGst && <td className="px-4 py-3 text-center text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50/50 dark:bg-slate-800/20">{item.gst_rate}%</td>}
                                        {isGst && !isInterstate && <td className="px-4 py-3 text-right text-xs">₹{item.cgst.toFixed(2)}</td>}
                                        {isGst && !isInterstate && <td className="px-4 py-3 text-right text-xs">₹{item.sgst.toFixed(2)}</td>}
                                        {isGst && isInterstate && <td className="px-4 py-3 text-right text-xs">₹{item.igst.toFixed(2)}</td>}

                                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">₹{item.line_total.toFixed(2)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
