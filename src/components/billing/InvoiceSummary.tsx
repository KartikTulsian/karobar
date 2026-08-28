import { BillDetail } from '@/types/billing'
import { PaymentBatchSummary } from '@/types/finance';
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface InvoiceSummaryProps {
    bill: BillDetail;
    payments?: PaymentBatchSummary[];
    showProfit?: boolean;
}

export function InvoiceSummary({ bill, payments = [], showProfit = false }: InvoiceSummaryProps) {

    const taxableValue = bill.subtotal - bill.discount_amount;

    const profitYield = taxableValue > 0 ? (((bill.total_profit || 0) / taxableValue) * 100).toFixed(1) : "0.0";

    // 1. BUILD THE UNIFIED TIMELINE
    const timeline: { id: string; date: Date; label: string; amount: number; color: string; isCancelled?: boolean }[] = [];

    // Add Returns
    if (bill.sales_returns) {
        bill.sales_returns.forEach(ret => {
            timeline.push({
                id: ret.id,
                date: new Date(ret.created_at),
                label: ret.refund_method === 'credit_note' ? 'Return (Credit Note)' : 'Return (Refunded)',
                amount: ret.refund_amount,
                color: 'text-red-500 dark:text-red-400',
                isCancelled: false
            });
        });
    }

    // Add Payments & Kasar (Write-offs)
    if (payments) {
        payments.forEach(batch => {
            // Look inside the batch to see if this specific bill got paid
            const allocation = batch.allocations.find(a => a.document_id === bill.id);
            
            if (allocation && (allocation.amount > 0 || allocation.discount > 0)) {
                const isCancelled = batch.status === 'cancelled';

                if (allocation.amount > 0) {
                    timeline.push({
                        id: batch.receipt_batch_id,
                        date: new Date(batch.paid_at),
                        label: isCancelled ? `Cancelled (${batch.method})` : (batch.method === 'credit' ? 'Advance Applied' : `Payment (${batch.method})`),
                        amount: allocation.amount,
                        color: isCancelled ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-emerald-600 dark:text-emerald-400',
                        isCancelled: isCancelled
                    });
                }

                if (allocation.discount > 0) {
                    timeline.push({
                        id: batch.receipt_batch_id + '-discount',
                        date: new Date(batch.paid_at),
                        label: isCancelled ? 'Cancelled Settlement' : 'Settlement (Kasar)',
                        amount: allocation.discount,
                        color: isCancelled ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-orange-500 dark:text-orange-400',
                        isCancelled: isCancelled
                    });
                }
            }
        });
    }
    
    // Sort chronologically (Oldest to Newest)
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
        <div className="flex flex-col sm:flex-row justify-between gap-8 py-4">
            {/* Payment Status Indicator */}
            <div className="flex-1">
                <div className="inline-flex flex-col gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-500 uppercase">Payment Status</p>
                    <div className="flex items-center gap-2">
                        {bill.status === 'paid' ? (
                            <><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span className="font-bold text-emerald-600 capitalize">{bill.status}</span></>
                        ) : (
                            <><AlertCircle className="h-5 w-5 text-amber-500" /><span className="font-bold text-amber-600 capitalize">{bill.status}</span></>
                        )}
                    </div>
                    <p className="text-sm font-medium mt-1">
                        {bill.amount_paid < 0 ? (
                            <span className="text-red-500 dark:text-red-400">Net Refunded: ₹{Math.abs(bill.amount_paid).toFixed(2)}</span>
                        ) : (
                            <span className="text-slate-700 dark:text-slate-300">Paid: ₹{bill.amount_paid.toFixed(2)}</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Calculations */}
            <div className="w-full sm:w-[340px] space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 px-2">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{bill.subtotal.toFixed(2)}</span>
                </div>
                
                {bill.discount_amount > 0 && (
                    <div className="flex justify-between py-1 px-2 text-red-500 dark:text-red-400">
                        <span className="font-medium">Discount</span>
                        <span className="font-bold">- ₹{bill.discount_amount.toFixed(2)}</span>
                    </div>
                )}

                {/* Only show Tax details if it's a GST Bill */}
                {bill.is_gst_bill && (
                    <div className="border-y border-slate-200 dark:border-slate-700/60 py-3 my-3 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30 px-3 rounded-lg">
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span>Taxable Value</span>
                            <span className="text-slate-900 dark:text-slate-200">₹{taxableValue.toFixed(2)}</span>
                        </div>
                        {bill.is_interstate ? (
                            <div className="flex justify-between text-xs font-medium">
                                <span>IGST Total</span>
                                <span className="text-slate-900 dark:text-slate-200">₹{(bill.igst_total || 0).toFixed(2)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-xs font-medium">
                                    <span>CGST Total</span>
                                    <span className="text-slate-900 dark:text-slate-200">₹{(bill.cgst_total || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span>SGST Total</span>
                                    <span className="text-slate-900 dark:text-slate-200">₹{(bill.sgst_total || 0).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {(bill.round_off !== 0) && (
                    <div className="flex justify-between py-1 px-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <span>Round Off</span>
                        <span className="text-slate-900 dark:text-slate-200">{bill.round_off > 0 ? '+' : ''}{bill.round_off.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex justify-between items-end pt-4 pb-3 px-2 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Grand Total</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">₹{bill.grand_total.toFixed(2)}</span>
                </div>

                {/* Payments & Refunds */}
                {timeline.length > 0 && (
                    <div className="space-y-2 pt-3 px-2">
                        {timeline.map((item) => (
                            <div key={item.id} className={`flex justify-between text-xs font-bold uppercase tracking-wider ${item.color}`}>
                                <span className="flex items-center gap-3">
                                    {/* Date aligned neatly to the left */}
                                    <span className="w-[72px] text-slate-400 dark:text-slate-500 font-medium tracking-normal">
                                        {item.date.toLocaleDateString('en-GB')}
                                    </span>
                                    {item.label}
                                </span>
                                <span>{item.isCancelled ? '' : '- '}₹{item.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 mt-6 shadow-sm">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-widest text-xs">Balance Due</span>
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">₹{bill.amount_due.toFixed(2)}</span>
                </div>

                {showProfit && (
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800/30 mt-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-widest text-xs">
                            Net Profit
                        </span>
                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 flex items-center">
                            ₹{(bill.total_profit || 0).toFixed(2)}
                            <span className="text-xs font-bold ml-2 bg-emerald-200/50 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300 px-2 py-1 rounded">
                                {profitYield}% Yield
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
