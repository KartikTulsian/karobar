import { BillLineItem, SalesReturnWithItems } from '@/types/billing'

interface InvoiceItemsProps {
    items: BillLineItem[];
    returns?: SalesReturnWithItems[];
    isGst: boolean;
    isInterstate: boolean;
    showProfit?: boolean;
}

// 2. Line Items Table Component
export function InvoiceItemsTable({ items, returns = [], isGst, isInterstate, showProfit = false }: InvoiceItemsProps) {

    const getReturnMetrics = (lineItemId: string) => {
        let totalReturnedQty = 0;
        let totalReturnedCogs = 0;

        returns.forEach(ret => {
            ret.sales_return_items.forEach(retItem => {
                if (retItem.bill_line_item_id === lineItemId) {
                    totalReturnedQty += retItem.return_qty;
                    
                    // The API already fetches return_batch_allocations, so we calculate the exact cost of returned goods
                    if (retItem.return_batch_allocations && Array.isArray(retItem.return_batch_allocations)) {
                        retItem.return_batch_allocations.forEach(alloc => {
                            totalReturnedCogs += (Number(alloc.qty) * Number(alloc.buy_price));
                        });
                    }
                }
            });
        });
        
        return { totalReturnedQty, totalReturnedCogs };
    }

    const getReturnedQty = (lineItemId: string) => {
        let totalReturned = 0;
        returns.forEach(ret => {
            ret.sales_return_items.forEach(retItem => {
                if (retItem.bill_line_item_id === lineItemId) {
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
                                <th className="px-4 py-3.5 text-center">Qty</th>
                                {showProfit && (
                                    <th className="px-4 py-3.5 text-right text-emerald-700 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30">
                                        Total Cost
                                    </th>
                                )}
                                <th className="px-4 py-3.5 text-right">Price</th>
                                <th className="px-4 py-3.5 text-right">Disc %</th>
                                {isGst && <th className="px-4 py-3.5 text-center">GST %</th>}
                                {isGst && !isInterstate && <th className="px-4 py-3.5 text-right">CGST</th>}
                                {isGst && !isInterstate && <th className="px-4 py-3.5 text-right">SGST</th>}
                                {isGst && isInterstate && <th className="px-4 py-3.5 text-right">IGST</th>}
                                <th className="px-4 py-3.5 text-right">Total</th>
                                {showProfit && (
                                    <th className="px-4 py-3.5 text-right text-emerald-700 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30">
                                        Profit
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {items.map((item) => {
                                const { totalReturnedQty: returnedQty, totalReturnedCogs: returnedCogs } = getReturnMetrics(item.id);
                                const remainingQty = item.qty - returnedQty;

                                // Linear ratio for Revenue and Taxes (Selling price is constant per unit)
                                const ratio = item.qty > 0 ? (remainingQty / item.qty) : 0;

                                const netCgst = (item.cgst || 0) * ratio;
                                const netSgst = (item.sgst || 0) * ratio;
                                const netIgst = (item.igst || 0) * ratio;
                                const netLineTotal = (item.line_total || 0) * ratio;

                                const netTotalCost = Math.max(0, (item.total_buy_price || 0) - returnedCogs);

                                const baseTotal = remainingQty * item.unit_price;
                                const discountAmt = baseTotal * ((item.discount_pct || 0) / 100);
                                const netTaxableValue = baseTotal - discountAmt;

                                const netLineProfit = netTaxableValue - netTotalCost;

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
                                        <td className="px-4 py-3 text-center">
                                            {returnedQty > 0 ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="text-red-500/70 line-through text-xs">
                                                        {item.qty}
                                                    </span>
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {remainingQty} <span className="text-[10px] uppercase font-bold text-slate-400">{item.unit || 'PCS'}</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {item.qty} <span className="text-[10px] uppercase font-bold text-slate-400">{item.unit || 'PCS'}</span>
                                                </span>
                                            )}
                                        </td>

                                        {showProfit && (
                                            <td className="px-4 py-3 text-right text-xs font-medium text-emerald-700 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30">
                                                {returnedQty > 0 ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-red-500/70 line-through text-[10px]">₹{(item.total_buy_price || 0).toFixed(2)}</span>
                                                        <span>₹{netTotalCost.toFixed(2)}</span>
                                                    </div>
                                                ) : (
                                                    `₹${(item.total_buy_price || 0).toFixed(2)}`
                                                )}
                                            </td>
                                        )}

                                        <td className="px-4 py-3 text-right font-medium">₹{item.unit_price.toFixed(2)}</td>
                                        <td className="py-4 px-2 text-center">{item.discount_pct || 0}%</td>
                                        {isGst && <td className="px-4 py-3 text-center text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-slate-50/50 dark:bg-slate-800/20">{item.gst_rate}%</td>}
                                        {isGst && !isInterstate && (
                                            <td className="px-4 py-3 text-right text-xs">
                                                {returnedQty > 0 ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-red-500/70 line-through text-[10px]">₹{item.cgst.toFixed(2)}</span>
                                                        <span>₹{netCgst.toFixed(2)}</span>
                                                    </div>
                                                ) : (`₹${item.cgst.toFixed(2)}`)}
                                            </td>
                                        )}
                                        {isGst && !isInterstate && (
                                            <td className="px-4 py-3 text-right text-xs">
                                                {returnedQty > 0 ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-red-500/70 line-through text-[10px]">₹{item.sgst.toFixed(2)}</span>
                                                        <span>₹{netSgst.toFixed(2)}</span>
                                                    </div>
                                                ) : (`₹${item.sgst.toFixed(2)}`)}
                                            </td>
                                        )}
                                        {isGst && isInterstate && (
                                            <td className="px-4 py-3 text-right text-xs">
                                                {returnedQty > 0 ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-red-500/70 line-through text-[10px]">₹{item.igst.toFixed(2)}</span>
                                                        <span>₹{netIgst.toFixed(2)}</span>
                                                    </div>
                                                ) : (`₹${item.igst.toFixed(2)}`)}
                                            </td>
                                        )}

                                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                            {returnedQty > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-red-500/70 line-through text-[10px] font-normal">₹{item.line_total.toFixed(2)}</span>
                                                    <span>₹{netLineTotal.toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                `₹${item.line_total.toFixed(2)}`
                                            )}
                                        </td>
                                        {showProfit && (
                                            <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-900/30">
                                                {returnedQty > 0 ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-red-500/70 line-through text-[10px] font-normal">₹{(item.line_profit || 0).toFixed(2)}</span>
                                                        <span>₹{netLineProfit.toFixed(2)}</span>
                                                    </div>
                                                ) : (
                                                    `₹${(item.line_profit || 0).toFixed(2)}`
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
