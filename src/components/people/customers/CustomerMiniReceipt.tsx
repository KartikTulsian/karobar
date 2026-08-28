import { DatabaseBill } from '@/types/people';
import { CreditCard, Maximize2 } from 'lucide-react';

interface CustomerMiniReceiptProps {
    bill: DatabaseBill;
    onClick: () => void;
}

export default function CustomerMiniReceipt({ bill, onClick }: CustomerMiniReceiptProps) {

    const totalRefunded = bill.sales_returns?.reduce((sum, ret) => sum + ret.refund_amount, 0) || 0;

    const getStatusColor = (status: string) => {
        if (status === 'paid') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
        if (status === 'overdue') return 'text-red-600 bg-red-50 dark:bg-red-500/10';
        if (status === 'partial') return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10';
        return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10';
    };
    return (
        <div
            onClick={onClick}
            className="group relative w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all cursor-pointer rounded-xl overflow-hidden"
        >
            {/* Top Decorative edge */}
            <div className="h-4 w-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-100 to-transparent dark:from-slate-800 border-b border-dashed border-slate-300 dark:border-slate-600"></div>

            <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{bill.bill_number}</h4>
                        <p className="text-sm text-slate-500">
                            Issued: {new Date(bill.bill_date).toLocaleDateString('en-GB')}
                        </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${getStatusColor(bill.status)}`}>
                        {bill.status}
                    </span>
                </div>

                <div className="space-y-3 mb-6 border-b border-dashed border-slate-200 dark:border-slate-700 pb-6">
                    <div className="flex justify-between text-base">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="text-slate-900 dark:text-white font-mono">₹{bill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                        <span className="text-slate-500">Tax (GST)</span>
                        <span className="text-slate-900 dark:text-white font-mono">₹{(bill.cgst_total + bill.sgst_total + bill.igst_total).toFixed(2)}</span>
                    </div>
                    {bill.discount_amount > 0 && (
                        <div className="flex justify-between text-base text-red-500">
                            <span>Discount</span>
                            <span className="font-mono">- ₹{bill.discount_amount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">Original Total</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">₹{bill.grand_total.toFixed(2)}</span>
                    </div>

                    {totalRefunded > 0 && (
                        <div className="flex justify-between text-base text-red-500 font-medium">
                            <span>Refunded Amount</span>
                            <span className="font-mono">- ₹{totalRefunded.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* Added Payment Details */}
                <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-500/10 p-3 rounded-xl border border-orange-100 dark:border-orange-500/20">
                    <div>
                        <span className="block text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Balance Due</span>
                        <div className="flex items-center gap-2 text-sm text-orange-700/70 dark:text-orange-300/70">
                            <CreditCard className="h-4 w-4" />
                            <span className="capitalize">{bill.payment_method || 'Unpaid'}</span>
                        </div>
                    </div>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-500 font-mono">
                        ₹{bill.amount_due.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Expand Overlay on Hover */}
            <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-indigo-600 text-white px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    <Maximize2 className="h-4 w-4" /> View Full Invoice
                </div>
            </div>
        </div>
    )
}
