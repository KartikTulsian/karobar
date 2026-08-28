import { PaymentBatchSummary } from '@/types/finance';
import { PurchaseOrderDetail } from '@/types/purchases'
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';


interface POSummaryProps {
    po: PurchaseOrderDetail;
    payments?: PaymentBatchSummary[];
}

export default function POSummary({ po, payments = [] }: POSummaryProps) {

    const taxableValue = (po.subtotal || 0) - (po.discount_amount || 0);

    // 1. BUILD THE UNIFIED TIMELINE
    const timeline: { id: string; date: Date; label: string; amount: number; color: string, isCancelled?: boolean }[] = [];

    // Add Returns
    if (po.purchase_returns) {
        po.purchase_returns.forEach(ret => {
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
            // Look inside the batch to see if this specific PO got paid
            const allocation = batch.allocations.find(a => a.document_id === po.id);
            
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

    const getPaymentDisplay = () => {
        switch (po.payment_status) {
            case 'paid': return { icon: CheckCircle2, iconColor: "text-emerald-500", textColor: "text-emerald-600", label: "Paid" };
            case 'partial': return { icon: Clock, iconColor: "text-amber-500", textColor: "text-amber-600", label: "Partially Paid" };
            case 'cancelled': return { icon: AlertCircle, iconColor: "text-slate-400", textColor: "text-slate-500", label: "Cancelled" };
            case 'unpaid': default: return { icon: AlertCircle, iconColor: "text-red-500", textColor: "text-red-600", label: "Unpaid" };
        }
    };

    const paymentDisplay = getPaymentDisplay();
    const PaymentIcon = paymentDisplay.icon;

    return (
        <div className="flex flex-col sm:flex-row justify-between gap-8 py-4">
            {/* Status Indicators */}
            <div className="flex-1 flex gap-4">
                <div className="inline-flex flex-col gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 h-fit min-w-[160px]">
                    <p className="text-sm font-semibold text-slate-500 uppercase">Payment Status</p>
                    <div className="flex items-center gap-2">
                        <PaymentIcon className={`h-5 w-5 ${paymentDisplay.iconColor}`} />
                        <span className={`font-bold ${paymentDisplay.textColor}`}>{paymentDisplay.label}</span>
                    </div>
                    <div className="mt-1">
                        {/* Handle negative amount_paid gracefully for over-refunded POs */}
                        {po.amount_paid < 0 ? (
                            <p className="text-sm font-medium text-red-500 dark:text-red-400">Net Refund Received: ₹{Math.abs(po.amount_paid).toFixed(2)}</p>
                        ) : (
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Paid: ₹{po.amount_paid.toFixed(2)}</p>
                        )}
                        {po.payment_method && (
                            <p className="text-xs font-medium text-slate-400 capitalize mt-0.5">
                                Via {po.payment_method.replace('_', ' ')}
                            </p>
                        )}
                    </div>
                </div>

                <div className="inline-flex flex-col gap-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 h-fit min-w-[160px]">
                    <p className="text-sm font-semibold text-slate-500 uppercase">Order Status</p>
                    <div className="flex items-center gap-2">
                        {po.status === 'received' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock className="h-5 w-5 text-indigo-500" />}
                        <span className={`font-bold capitalize ${po.status === 'received' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {po.status === 'sent' ? 'Pending' : po.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Calculations */}
            <div className="w-full sm:w-80 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 px-2">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{po.subtotal.toFixed(2)}</span>
                </div>

                {po.discount_amount > 0 && (
                    <div className="flex justify-between py-1 px-2 text-red-500 dark:text-red-400">
                        <span className="font-medium">Discount</span>
                        <span className="font-bold">- ₹{po.discount_amount.toFixed(2)}</span>
                    </div>
                )}

                {/* Only show Tax details if it's a GST po */}
                {po.is_gst_supply && (
                    <div className="border-y border-slate-200 dark:border-slate-700/60 py-3 my-3 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30 px-3 rounded-lg">
                        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <span>Taxable Value</span>
                            <span className="text-slate-900 dark:text-slate-200">₹{taxableValue.toFixed(2)}</span>
                        </div>
                        {po.is_interstate ? (
                            <div className="flex justify-between text-xs font-medium">
                                <span>IGST Total</span>
                                <span className="text-slate-900 dark:text-slate-200">₹{(po.igst_total || 0).toFixed(2)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-xs font-medium">
                                    <span>CGST Total</span>
                                    <span className="text-slate-900 dark:text-slate-200">₹{(po.cgst_total || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span>SGST Total</span>
                                    <span className="text-slate-900 dark:text-slate-200">₹{(po.sgst_total || 0).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {(po.round_off !== undefined && po.round_off !== 0) && (
                    <div className="flex justify-between py-1 px-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <span>Round Off</span>
                        <span className="text-slate-900 dark:text-slate-200">{po.round_off > 0 ? '+' : ''}{po.round_off.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex justify-between items-end pt-4 pb-3 px-2 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Original PO Total</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">₹{po.total_amount.toFixed(2)}</span>
                </div>

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
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">₹{po.amount_due.toFixed(2)}</span>
                </div>
            </div>
        </div>
    )
}
