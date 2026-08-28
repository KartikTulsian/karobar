"use client";

import { PurchaseOrderStatus, PurchaseOrderWithSupplier } from '@/types/purchases';
import { Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Table from '../common/Table';
import { useNavigation } from '@/hooks/useNavigation';

interface PurchaseOrdersTableProps {
    data: PurchaseOrderWithSupplier[];
    // onEdit: (po: PurchaseOrderWithSupplier) => void;
    // onDelete: (po: PurchaseOrderWithSupplier) => void;
}

export default function PurchaseOrdersTable({ data }: PurchaseOrdersTableProps) {

    const { currentRole } = useNavigation();
    const router = useRouter();

    const columns = [
        { header: "Date", accessor: "order_date", sortable: true },
        { header: "Supplier Name", accessor: "supplier", sortable: true },
        { header: "Reference", accessor: "po_number", sortable: true },
        { header: "Status", accessor: "status", sortable: true },
        { header: "Total", accessor: "total_amount", sortable: true },
        { header: "Paid", accessor: "amount_paid", sortable: true },
        { header: "Due", accessor: "amount_due" },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                },
            ]
            : [])
    ];

    const getStatusStyles = (status: PurchaseOrderStatus) => {
        const styles: Record<PurchaseOrderStatus, string> = {
            draft: 'bg-slate-100 text-slate-700',
            sent: 'bg-blue-50 text-blue-700 ring-blue-600/20', // Represents Pending
            partial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
            received: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
            cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return styles[status] || styles.draft;
    };

    const renderRow = (po: PurchaseOrderWithSupplier) => (
        <tr
            key={po.id}
            onClick={() => router.push(`/purchases/orders/${po.id}`)}
            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer"
        >
            <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                {new Date(po.order_date).toLocaleDateString('en-GB')}
            </td>

            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                {po.suppliers?.name || 'Unknown Supplier'}
            </td>

            <td className="px-5 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                {po.po_number}
            </td>

            <td className="px-5 py-4">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${getStatusStyles(po.status)}`}>
                    {po.status === 'sent' ? 'pending' : po.status}
                </span>
            </td>

            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                ₹{po.total_amount.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-emerald-600 font-medium">
                ₹{po.amount_paid.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-red-500 font-medium">
                ₹{po.amount_due.toFixed(2)}
            </td>

            {currentRole === "owner" && (
                <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                            <Printer className="h-4 w-4" />
                        </button>
                        {/* <button
                            onClick={() => onEdit(po)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onDelete(po)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button> */}
                    </div>
                </td>
            )}
        </tr>
    );

    return <Table columns={columns} renderRow={renderRow} data={data} />
}
