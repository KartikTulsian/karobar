import { PaymentBatchSummary } from '@/types/finance';
import { SupplierPOSummary } from '@/types/people';
import { ChevronDown, ChevronUp, FileText, Receipt } from 'lucide-react';
import React, { useState } from 'react'

interface SupplierOrdersTableProps {
    orders: SupplierPOSummary[];
    payments: PaymentBatchSummary[];
    activeOrderId: string | null;
    onRowClick: (orderId: string) => void;
}

export default function SupplierOrdersTable({ orders, payments, activeOrderId, onRowClick }: SupplierOrdersTableProps) {

    const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

    const getStatusStyles = (status: string) => {
        const styles: Record<string, string> = {
            draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            sent: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
            received: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
            partial: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
            cancelled: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
        };
        return styles[status.toLowerCase()] || 'bg-slate-100 text-slate-700';
    };

    const getPaymentStatusStyles = (status: string) => {
        const styles: Record<string, string> = {
            draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-slate-600/20',
            sanctioned: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
            cancelled: 'bg-stone-100 text-stone-700 ring-stone-600/20 dark:bg-stone-500/10 dark:text-stone-400',
        };
        return styles[status.toLowerCase()] || 'bg-slate-100 text-slate-700 ring-slate-600/20';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* LEFT COLUMN: PURCHASE ORDERS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        Purchase Orders
                    </h3>
                </div>
                
                {/* Added overflow-x-auto to prevent clipping */}
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">PO No</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                <th className="px-4 py-3 font-semibold text-right">Due</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {orders.map((order) => {
                                const isActive = activeOrderId === order.id;
                                return (
                                    <tr 
                                        key={order.id}
                                        onClick={() => onRowClick(order.id)}
                                        className={`cursor-pointer transition-colors ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'}`}
                                    >
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                            {new Date(order.order_date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className={`px-4 py-3 font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                                            {order.po_number}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusStyles(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-right text-slate-900 dark:text-white">
                                            ₹{order.total_amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-right text-red-500">
                                            ₹{order.amount_due.toFixed(2)}
                                        </td>
                                    </tr>
                                )
                            })}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-slate-400">
                                        No purchase orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT COLUMN: PAYMENT HISTORY */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 shrink-0">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-emerald-500" />
                        Payment History
                    </h3>
                </div>

                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Receipt Id</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                <th className="px-4 py-3 font-semibold text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {payments.map((payment) => {
                                const isExpanded = expandedReceipt === payment.receipt_batch_id;
                                const isCancelled = payment.status === 'cancelled';

                                return (
                                    <React.Fragment key={payment.receipt_batch_id}>
                                        <tr 
                                            onClick={() => setExpandedReceipt(isExpanded ? null : payment.receipt_batch_id)}
                                            className={`cursor-pointer transition-colors ${isExpanded ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'}`}
                                        >
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                {new Date(payment.paid_at).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {payment.receipt_batch_id.length > 20 ? `RCPT-${payment.receipt_batch_id.slice(0,8).toUpperCase()}` : payment.receipt_batch_id}
                                                <span className="block text-[10px] text-slate-400 font-sans uppercase mt-1 tracking-wider">{payment.method}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ring-1 ring-inset ${getPaymentStatusStyles(payment.status)}`}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            {/* Visually strike-out cancelled payment amounts */}
                                            <td className={`px-4 py-3 font-bold text-right text-sm ${isCancelled ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                ₹{payment.total_amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-400">
                                                {isExpanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                                            </td>
                                        </tr>

                                        {/* EXPANDED ALLOCATIONS SUB-TABLE */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                                                <td colSpan={5} className="p-0 border-b-2 border-emerald-100 dark:border-emerald-900/30">
                                                    <div className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                                                                Bank/Cash: <span className={`${isCancelled ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>₹{(payment.total_amount || 0).toFixed(2)}</span>
                                                            </span>
                                                            {payment.advance_applied > 0 && (
                                                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                                                    Wallet Used: <span className={`${isCancelled ? 'text-slate-400 line-through' : 'text-indigo-600'}`}>₹{payment.advance_applied.toFixed(2)}</span>
                                                                </span>
                                                            )}
                                                            {payment.note && (
                                                                <span className="font-medium text-slate-500 italic w-full mt-1">
                                                                    Note: &quot;{payment.note}&quot;
                                                                </span>
                                                            )}
                                                        </div>
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                                <tr>
                                                                    <th className="py-2 font-medium">Order No.</th>
                                                                    <th className="py-2 font-medium text-right">Discount</th>
                                                                    <th className="py-2 font-medium text-right">Paid</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                {payment.allocations.map((alloc, i) => (
                                                                    <tr key={i}>
                                                                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{alloc.document_number}</td>
                                                                        <td className={`py-2.5 text-right ${isCancelled ? 'text-slate-400 line-through' : 'text-orange-500'}`}>{alloc.discount > 0 ? `₹${alloc.discount.toFixed(2)}` : '-'}</td>
                                                                        <td className={`py-2.5 text-right font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>₹{alloc.amount.toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-slate-400">
                                        No payments recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}
