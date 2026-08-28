"use client";

import { BillStatus, BillWithCustomer } from '@/types/billing';
import { Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Table from '../common/Table';
import { useNavigation } from '@/hooks/useNavigation';

interface BillsTableProps {
    data: BillWithCustomer[];
    // onEdit: (bill: BillWithCustomer) => void;
    // onDelete: (bill: BillWithCustomer) => void;
}

export default function BillsTable({ data }: BillsTableProps) {

    const { currentRole } = useNavigation();
    const router = useRouter();

    const columns = [
        { header: "Invoice No", accessor: "bill_number", sortable: true, },
        { header: "Customer", accessor: "customer", sortable: true, },
        { header: "Date", accessor: "bill_date", className: "hidden md:table-cell", sortable: true, },
        { header: "Amount", accessor: "subtotal", sortable: true, },
        { header: "Paid", accessor: "amount_paid", className: "hidden sm:table-cell", sortable: true },
        { header: "Amount Due", accessor: "amount_due", sortable: true },
        { header: "Status", accessor: "status", sortable: true },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                },
            ]
            : [])
    ];

    const getStatusStyles = (status: BillStatus) => {
        const styles: Record<BillStatus, string> = {
            draft: 'bg-slate-100 text-slate-700',
            issued: 'bg-blue-50 text-blue-700 ring-blue-600/20',
            paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
            partial: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
            overdue: 'bg-red-50 text-red-700 ring-red-600/20',
            cancelled: 'bg-stone-100 text-stone-700'
        };
        return styles[status] || styles.draft;
    };

    const renderRow = (bill: BillWithCustomer) => (
        <tr
            key={bill.id}
            onClick={() => router.push(`/billing/bills/${bill.id}`)}
            className="border-b border-slate-200 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer"
        >
            <td className="px-5 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                {bill.bill_number || "Draft"}
            </td>

            <td className="px-5 py-4">
                <div className="font-medium text-slate-900 dark:text-white">
                    {bill.customers?.name || 'Unknown'}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                    {bill.customers?.type} {bill.customers?.phone && `• ${bill.customers.phone}` || 'No Phone'}
                </div>
            </td>

            <td className="px-5 py-4 hidden md:table-cell text-slate-600 dark:text-slate-400">
                <div>{new Date(bill.bill_date).toLocaleDateString('en-GB')}</div>
                <div className="text-xs">{new Date(bill.bill_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </td>

            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                ₹{bill.subtotal.toFixed(2)}
            </td>

            <td className="px-5 py-4 hidden sm:table-cell text-emerald-600 font-medium">
                ₹{bill.amount_paid.toFixed(2)}
            </td>

            <td className="px-5 py-4 text-red-500 font-medium">
                ₹{bill.amount_due.toFixed(2)}
            </td>

            <td className="px-5 py-4">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${getStatusStyles(bill.status)}`}>
                    {bill.status}
                </span>
            </td>

            {currentRole === "owner" && (
                <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                            <Printer className="h-4 w-4" />
                        </button>
                        {/* <button
                            onClick={() => onEdit(bill)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onDelete(bill)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button> */}
                    </div>
                </td>
            )}
        </tr>
    );

    return <Table columns={columns} renderRow={renderRow} data={data} />;
}
