"use client";

import Table from '@/components/common/Table';
import { useNavigation } from '@/hooks/useNavigation';
import { PaymentBatchSummary } from '@/types/finance';
import { ChevronDown, ChevronUp, Pencil, Receipt, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'

interface PaymentsTableProps {
    data: PaymentBatchSummary[];
    onEdit: (batch: PaymentBatchSummary) => void;
    onDelete: (batch: PaymentBatchSummary) => void;
}

export default function PaymentsTable({ data, onEdit, onDelete }: PaymentsTableProps) {

    const router = useRouter();
    const { currentRole } = useNavigation();
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const formatCurrency = (val: number) => val.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const formatBatchId = (id: string) => id.length > 20 ? `RCPT-${id.slice(0, 16).toUpperCase()}` : id;

    const columns = [
        { header: "Date", accessor: "paid_at", className: "w-24" },
        { header: "Type", accessor: "flow_type", className: "w-20" },
        { header: "Receipt ID", accessor: "receipt_batch_id" },
        { header: "Party", accessor: "entity_name" },
        { header: "Mode", accessor: "method" },
        { header: "Status", accessor: "status" },
        { header: "Amount", accessor: "total_amount", className: "text-right font-bold" },
        { header: "Details", accessor: "expand", className: "w-10" },
        ...(currentRole === "owner"
            ? [
                { header: "Actions", accessor: "action", className: "text-right" }
            ]
            : []
        )
    ];

    const renderRow = (entry: PaymentBatchSummary) => {
        const isExpanded = expandedRow === entry.receipt_batch_id;

        return (
            <React.Fragment key={entry.receipt_batch_id}>
                {/* Main Row */}
                <tr className="border-b border-slate-200 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 dark:border-slate-800">
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        {new Date(entry.paid_at).toLocaleDateString('en-GB')}
                    </td>

                    <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${entry.flow_type === 'in' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20'}`}>
                            {entry.flow_type === 'in' ? 'Sale Receipt' : 'Purchase Pay'}
                        </span>
                    </td>

                    <td className="px-5 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                        {formatBatchId(entry.receipt_batch_id)}
                    </td>

                    <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                            {entry.entity_name}
                        </div>
                    </td>

                    <td className="px-5 py-4">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            {entry.method}
                        </span>
                    </td>

                    <td className="px-5 py-4">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            {entry.status}
                        </span>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(entry.total_amount)}
                    </td>

                    <td className="px-5 py-4 text-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : entry.receipt_batch_id); }}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
                        >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </td>

                    {currentRole === "owner" && (
                        <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => onEdit(entry)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors">
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => onDelete(entry)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                    )}
                </tr>

                {/* Professional Sub-Row */}
                {isExpanded && (
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={columns.length} className="px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Left Side: Bill Breakdown Table */}
                                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Settled Documents Breakdown</h4>

                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                            <tr>
                                                <th className="pb-3 font-medium">Document No.</th>
                                                <th className="pb-3 font-medium text-right">Total Settled</th>
                                                <th className="pb-3 font-medium text-right">Kasar (Write-off)</th>
                                                <th className="pb-3 font-medium text-right">Cash Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {entry.allocations.map((alloc, i) => (
                                                <tr key={`${entry.receipt_batch_id}-${i}`}>
                                                    <td
                                                        className="py-3 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-2"
                                                        onClick={() => {
                                                            const path = entry.flow_type === 'in' ? '/billing/bills/' : '/purchases/orders/';
                                                            router.push(`${path}${alloc.document_id}`);
                                                        }}
                                                    >
                                                        <Receipt size={14} className="text-slate-400 dark:text-slate-500" />
                                                        {alloc.document_number}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                                                        ₹{(alloc.amount + alloc.discount).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 text-right text-orange-500 font-medium">
                                                        {alloc.discount !== 0 ? `₹${alloc.discount.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                                                        ₹{alloc.amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right Side: Metadata */}
                                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Transaction Details</h4>
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <span className="text-slate-500 dark:text-slate-400">Reference:</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{entry.reference_no || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <span className="text-slate-500 dark:text-slate-400">Payment Mode:</span>
                                            <span className="font-medium uppercase text-slate-900 dark:text-white">{entry.method}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2">
                                            <span className="text-slate-500 dark:text-slate-400">Documents Settled:</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{entry.bill_count}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </td>
                    </tr>
                )}
            </React.Fragment>
        );
    }

    // return <Table columns={columns} data={data} renderRow={renderRow} />;

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table columns={columns} renderRow={renderRow} data={data} />
        </div>
    );
    // return (
    //     <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    //         <table className="w-full">
    //             <thead className="bg-slate-50">
    //                 <tr>
    //                     {columns.map((c, i) => <th key={i} className={`px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase ${c.className}`}>{c.header}</th>)}
    //                 </tr>
    //             </thead>
    //             <tbody className="divide-y divide-slate-100">{data.map(renderRow)}</tbody>
    //         </table>
    //     </div>
    // )
}
