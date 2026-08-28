import { SalesReturnWithDetails } from '@/types/billing';
import Table from '../common/Table';
import { FileText, CornerUpLeft, Edit, Trash2 } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import Link from 'next/link';

interface ReturnsTableProps {
    data: SalesReturnWithDetails[];
    onEdit?: (returnItem: SalesReturnWithDetails) => void;
    onDelete?: (returnItem: SalesReturnWithDetails) => void;
}

export default function ReturnsTable({ data, onEdit, onDelete }: ReturnsTableProps) {

    const { currentRole } = useNavigation();

    const columns = [
        { header: "Date", accessor: "created_at", sortable: true },
        { header: "Original Bill", accessor: "bill_number", sortable: true },
        { header: "Customer", accessor: "customer", sortable: true },
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

    const renderRow = (returnItem: SalesReturnWithDetails) => (
        <tr
            key={returnItem.id}
            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20"
        >
            <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                {new Date(returnItem.created_at).toLocaleDateString('en-GB')}
            </td>

            <td className="px-5 py-4">
                {returnItem.original_bill_id ? (
                    <Link
                        href={`/billing/bills/${returnItem.original_bill_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex w-fit items-center gap-2 font-medium text-indigo-600 transition-colors hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        <FileText className="h-4 w-4" />
                        {returnItem.bills?.bill_number || 'N/A'}
                    </Link>
                ) : (
                    <div className="flex items-center gap-2 font-medium text-slate-500">
                        <FileText className="h-4 w-4" />
                        N/A
                    </div>
                )}
            </td>

            <td className="px-5 py-4">
                <div className="font-medium text-slate-900 dark:text-white">
                    {returnItem.bills?.customers?.name || 'Unknown'}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                    {returnItem.bills?.customers?.type || 'N/A'}
                </div>
            </td>

            <td className="px-5 py-4 hidden md:table-cell text-slate-600 dark:text-slate-400 max-w-xs truncate">
                {returnItem.reason || <span className="text-slate-400 italic">No reason provided</span>}
            </td>

            <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 capitalize dark:bg-slate-800 dark:text-slate-300">
                    <CornerUpLeft className="h-3 w-3" />
                    {returnItem.refund_method.replace('_', ' ')}
                </span>

                {/* Only show this if a credit note actually exists */}
                {returnItem.credit_note_bill_id && (
                    <span className="text-xs text-indigo-600 font-medium">
                        Credit Note ID generated
                    </span>
                )}
            </td>

            <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                ₹{returnItem.refund_amount.toFixed(2)}
            </td>

            {currentRole === "owner" && (
                <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(returnItem); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(returnItem); }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
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
