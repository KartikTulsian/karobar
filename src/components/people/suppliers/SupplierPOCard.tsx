import { SupplierPOSummary } from '@/types/people';
import { Maximize2 } from 'lucide-react';

interface SupplierPOCardProps {
    order: SupplierPOSummary;
    onClick: () => void;
}

export default function SupplierPOCard({ order, onClick }: SupplierPOCardProps) {

    const totalRefunded = order.purchase_returns?.reduce((sum, ret) => sum + ret.refund_amount, 0) || 0;

    const getStatusColor = (status: string) => {
        if (status === 'received') return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
        if (status === 'partial') return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10';
        if (status === 'draft') return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
        return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'; // sent
    };

    return (
        <div onClick={onClick} className="group relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all cursor-pointer rounded-xl overflow-hidden">
            <div className="h-4 w-full bg-indigo-600 dark:bg-indigo-500"></div> {/* POs get a solid bar, not a receipt edge */}
            
            <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{order.po_number}</h4>
                        <p className="text-sm text-slate-500">Order Date: {new Date(order.order_date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>{order.status}</span>
                </div>

                <div className="space-y-3 mb-6 border-b border-dashed border-slate-200 dark:border-slate-700 pb-6">
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">Original Total</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">₹{order.total_amount.toFixed(2)}</span>
                    </div>

                    {totalRefunded > 0 && (
                        <div className="flex justify-between text-base text-orange-500 font-medium">
                            <span>Refunded Amount</span>
                            <span className="font-mono">- ₹{totalRefunded.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-100 dark:border-red-500/20">
                    <div>
                        <span className="block text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Balance Due</span>
                        <div className="text-sm font-medium text-red-700/70 dark:text-red-300/70">
                            Paid: ₹{order.amount_paid.toFixed(2)}
                        </div>
                    </div>
                    <span className="text-3xl font-black text-red-600 dark:text-red-500 font-mono">
                        ₹{order.amount_due.toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-indigo-600 text-white px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                    <Maximize2 className="h-4 w-4" /> View Purchase Order
                </div>
            </div>
        </div>
    );
}