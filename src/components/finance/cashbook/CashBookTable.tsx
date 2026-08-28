"use client";

import Table from '@/components/common/Table';
import { useNavigation } from '@/hooks/useNavigation';
import { CashEntry } from '@/types/finance';
import { ArrowDownRight, ArrowUpRight, Edit, Trash2 } from 'lucide-react';

interface CashBookTableProps {
    data: CashEntry[];
    onEdit?: (entry: CashEntry) => void;
    onDelete?: (entry: CashEntry) => void;
}
export default function CashBookTable({ data, onEdit, onDelete }: CashBookTableProps) {

    const { currentRole } = useNavigation();

    const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    // UI Helpers for segregated badges
    const getMethodBadge = (method: string) => {
        switch (method) {
            case 'cash': return <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">Cash</span>;
            case 'upi': return <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800 border border-indigo-200">UPI</span>;
            case 'bank_transfer': return <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 border border-blue-200">Bank</span>;
            case 'cheque': return <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">Cheque</span>;
            case 'card': return <span className="rounded bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-800 border border-pink-200">Card</span>;
            default: return <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 border border-slate-200">{method}</span>;
        }
    };

    const getSourceLabel = (refType: string) => {
        switch (refType) {
            case 'manual': return "Manual Adjust";
            case 'single_sale': 
            case 'multi_sale': return "Sales Receipt";
            case 'single_purchase':
            case 'multi_purchase': return "Purchase Payment";
            case 'expense': return "Expense";
            case 'advance_receipt': return "Customer Adv";
            case 'advance_payment': return "Supplier Adv";
            case 'sales_return': return "Sales Refund";
            case 'purchase_return': return "Purchase Refund";
            default: return "System Entry";
        }
    };

    const columns = [
        { header: "Date & Time", accessor: "entry_date" },
        { header: "Description", accessor: "description" },
        { header: "Source", accessor: "reference_type", className: "hidden sm:table-cell" },
        { header: "In (₹)", accessor: "in", className: "text-right text-emerald-600" },
        { header: "Out (₹)", accessor: "out", className: "text-right text-red-600" },
        { header: "Balance", accessor: "balance_after", className: "text-right font-bold bg-slate-50 dark:bg-slate-800/50" },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                    className: "text-center"
                },
            ]
            : [])
    ];

    const renderRow = (entry: CashEntry) => (
        <tr key={entry.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50">
            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {new Date(entry.entry_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </td>

            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${entry.type === 'in' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                        {entry.type === 'in' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{entry.description}</span>
                </div>
            </td>

            <td className="px-5 py-4 hidden sm:table-cell">
                <div className="flex flex-col gap-1.5 items-start">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {getSourceLabel(entry.reference_type)}
                    </span>
                    {getMethodBadge(entry.payment_method)}
                </div>
            </td>

            <td className="px-5 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                {entry.type === 'in' ? formatCurrency(entry.amount) : '-'}
            </td>

            <td className="px-5 py-4 text-right font-semibold text-red-600 dark:text-red-400">
                {entry.type === 'out' ? formatCurrency(entry.amount) : '-'}
            </td>

            <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/20">
                ₹{formatCurrency(entry.balance_after)}
            </td>

            {currentRole === "owner" && (
                <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                        {/* Only allow editing/deleting of MANUAL entries to protect ledger integrity */}
                        {entry.reference_type === 'manual' ? (
                            <>
                                {onEdit && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(entry); }}
                                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">Auto-Synced</span>
                        )}

                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(entry); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </td>
            )}
        </tr>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table columns={columns} renderRow={renderRow} data={data} />
        </div>
    )
}
