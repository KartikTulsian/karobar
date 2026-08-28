// src/components/purchases/PurchaseReturnsTable.tsx
"use client";

;
import Table from '../common/Table';
import { PurchaseReturnWithDetails } from '@/types/purchases';
import { Edit, FileText, Trash2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useNavigation } from '@/hooks/useNavigation';

interface PurchaseReturnsTableProps {
    data: PurchaseReturnWithDetails[];
    onEdit?: (returnItem: PurchaseReturnWithDetails) => void;
    onDelete?: (returnItem: PurchaseReturnWithDetails) => void;
}

export default function PurchaseReturnsTable({ data, onEdit, onDelete }: PurchaseReturnsTableProps) {

    const { currentRole } = useNavigation();

    const columns = [
        { header: "Date", accessor: "created_at", sortable: true },
        { header: "Original PO", accessor: "po_number", sortable: true },
        { header: "Supplier", accessor: "supplier", sortable: true },
        { header: "Reason", accessor: "reason", className: "hidden md:table-cell", sortable: true },
        { header: "Refund Method", accessor: "refund_method", sortable: true },
        { header: "Refund Amount", accessor: "refund_amount", sortable: true },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                },
            ]
            : [])
    ];

    const renderRow = (returnItem: PurchaseReturnWithDetails) => (
        <tr 
            key={returnItem.id}
            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50"
        >
            <td className="px-5 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {new Date(returnItem.created_at).toLocaleDateString('en-GB')}
            </td>
            
            <td className="px-5 py-4">
                <Link 
                    href={`/purchases/orders/${returnItem.original_po_id}`}
                    className="flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-800 transition-colors w-fit"
                >
                    <FileText className="h-4 w-4" />
                    {returnItem.purchase_orders?.po_number || 'N/A'}
                </Link>
            </td>
            
            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                {returnItem.purchase_orders?.suppliers?.name || 'Unknown'}
            </td>

            <td className="px-5 py-4 hidden md:table-cell text-slate-600 dark:text-slate-400 max-w-xs truncate">
                {returnItem.reason || <span className="text-slate-400 italic">No reason provided</span>}
            </td>

            <td className="px-5 py-4">
                <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 capitalize dark:bg-slate-800 dark:text-slate-300 w-fit">
                        <Undo2 className="h-3 w-3" />
                        {returnItem.refund_method?.replace('_', ' ') || 'Pending'}
                    </span>
                    {/* Visual indicator for Credit Notes */}
                    {returnItem.refund_method === 'credit_note' && (
                        <span className="text-xs text-indigo-600 font-medium">Store Credit</span>
                    )}
                </div>
            </td>

            <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                ₹{returnItem.refund_amount.toFixed(2)}
            </td>

            {currentRole === "owner" && (
                <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(returnItem); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                title="Edit Return"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(returnItem); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                                title="Delete Return"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </td>
            )}
        </tr>
    );

    return <Table columns={columns} renderRow={renderRow} data={data} />;
}