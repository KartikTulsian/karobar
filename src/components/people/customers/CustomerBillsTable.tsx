import { PaymentBatchSummary } from '@/types/finance';
import { DatabaseBill } from '@/types/people'
import { ChevronDown, ChevronUp, FileText, Receipt } from 'lucide-react';
import React, { useState } from 'react'

interface CustomerBillsTableProps {
    bills: DatabaseBill[];
    payments: PaymentBatchSummary[];
    activeBillId: string | null;
    onRowClick: (billId: string) => void;
    showProfit?: boolean;
}

export default function CustomerBillsTable({ bills, payments, activeBillId, onRowClick, showProfit = false }: CustomerBillsTableProps) {

    const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

    const getStatusStyles = (status: string) => {
        const styles: Record<string, string> = {
            draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            issued: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
            paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
            partial: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
            overdue: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
            cancelled: 'bg-stone-50 text-stone-700 ring-stone-600/20 dark:bg-stone-500/10 dark:text-stone-400'
        };
        return styles[status] || styles.draft;
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* LEFT COLUMN: INVOICES (DEBIT) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" /> Generated Invoices
                    </h3>
                </div>
                {/* Wrap in overflow-x-auto */}
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-xs uppercase text-slate-400 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Invoice No</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                <th className="px-4 py-3 font-semibold text-right">Due</th>
                                {showProfit && <th className="px-4 py-3 font-semibold text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10">Profit (₹)</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {bills.map(bill => {
                                const isActive = bill.id === activeBillId;
                                return (
                                    <tr
                                        key={bill.id}
                                        onClick={() => onRowClick(bill.id)}
                                        className={`cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20 border-l-4 border-l-transparent'}`}
                                    >
                                        <td className="px-4 py-4 text-slate-500">{new Date(bill.bill_date).toLocaleDateString('en-GB')}</td>
                                        <td className={`px-4 py-4 font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{bill.bill_number}</td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusStyles(bill.status)}`}>{bill.status}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">₹{bill.grand_total.toFixed(2)}</td>
                                        <td className="px-4 py-4 text-right font-bold text-orange-600 dark:text-orange-400">₹{bill.amount_due.toFixed(2)}</td>
                                        {showProfit && (
                                            <td className="px-4 py-4 text-right font-bold text-emerald-700 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-800/30">
                                                ₹{(bill.total_profit || 0).toFixed(2)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {bills.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">No invoices generated yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RIGHT COLUMN: PAYMENTS (CREDIT) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-600" /> Payment History
                    </h3>
                </div>
                {/* Wrap in overflow-x-auto */}
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-xs uppercase text-slate-400 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Receipt ID</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {payments.map(payment => {
                                const isExpanded = expandedReceipt === payment.receipt_batch_id;
                                const isCancelled = payment.status === 'cancelled';
                                
                                return (
                                    <React.Fragment key={payment.receipt_batch_id}>
                                        <tr
                                            onClick={() => setExpandedReceipt(isExpanded ? null : payment.receipt_batch_id)}
                                            className={`cursor-pointer transition-colors ${isExpanded ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20 border-l-4 border-l-transparent'}`}
                                        >
                                            <td className="px-4 py-4 text-slate-500 text-xs font-medium">{new Date(payment.paid_at).toLocaleDateString('en-GB')}</td>
                                            <td className="px-4 py-4 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                {payment.receipt_batch_id.length > 20 ? `RCPT-${payment.receipt_batch_id.slice(0, 8).toUpperCase()}` : payment.receipt_batch_id}
                                                <span className="block text-[10px] text-slate-400 font-sans uppercase mt-1 tracking-wider">{payment.method}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getPaymentStatusStyles(payment.status)}`}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            {/* Cancelled strikethrough applied */}
                                            <td className={`px-4 py-4 text-right font-bold text-sm ${isCancelled ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                ₹{payment.total_amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-400">
                                                {isExpanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                                            </td>
                                        </tr>
                                        {/* EXPANDABLE SUB-ROW FOR ALLOCATIONS */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                                                            Cash/Bank: <span className={`${isCancelled ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>₹{(payment.total_amount || 0).toFixed(2)}</span>
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
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="text-slate-400 uppercase tracking-wider">
                                                            <tr>
                                                                <th className="pb-2 font-semibold">Settled Document</th>
                                                                <th className="pb-2 font-semibold text-right">Write-off</th>
                                                                <th className="pb-2 font-semibold text-right">Applied</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                                            {payment.allocations.map((alloc, i) => (
                                                                <tr key={i}>
                                                                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{alloc.document_number}</td>
                                                                    <td className={`py-2.5 text-right ${isCancelled ? 'text-slate-400 line-through' : 'text-orange-500'}`}>{alloc.discount > 0 ? `₹${alloc.discount.toFixed(2)}` : '-'}</td>
                                                                    <td className={`py-2.5 text-right font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>₹{alloc.amount.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                            {payments.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400">No payments recorded yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}
