"use client";

import Table from '@/components/common/Table';
import { useNavigation } from '@/hooks/useNavigation';
import { Customer } from '@/types/people';
import { Building2, Edit2, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CustomerTableProps {
    data: Customer[];
    onEdit?: (customer: Customer) => void;
    onDelete?: (customer: Customer) => void; 
}

export default function CustomersTable({ data, onEdit, onDelete }: CustomerTableProps) {

    const router = useRouter();

    const { currentRole } = useNavigation();

    const columns = [
        { header: "Customer Name", accessor: "name", sortable: true },
        { header: "Contact Info", accessor: "phone", sortable: true },
        { header: "Location", accessor: "city", sortable: true, className: "hidden lg:table-cell" },
        { header: "Type", accessor: "type", sortable: true },
        { header: "Total Purchases", accessor: "total_purchases", sortable: true, className: "hidden md:table-cell" },
        { header: "Due Amount", accessor: "outstanding_due", sortable: true },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                    className: "text-right"
                },
            ]
            : [])
    ];

    const renderRow = (customer: Customer) => (
        <tr 
            key={customer.id}
            onClick={() => router.push(`/people/customers/${customer.id}`)}
            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer"
        >
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        customer.type === 'registered' 
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                        {customer.company_name ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                        {customer.company_name && <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{customer.company_name}</p>}
                        {customer.gstin && <p className="text-[10px] text-slate-400 font-mono mt-0.5">GST: {customer.gstin}</p>}
                    </div>
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                {customer.phone ? (
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                        {customer.country_code || '+91'} {customer.phone}
                    </p>
                ) : (
                    <p className="italic text-slate-400">No phone</p>
                )}
                {customer.email && <p className="text-xs mt-0.5 text-slate-400">{customer.email}</p>}
            </td>

            <td className="px-5 py-4 hidden lg:table-cell text-sm text-slate-600 dark:text-slate-400">
                {customer.city ? (
                    <p>{customer.city}{customer.state_code ? `, ${customer.state_code}` : ''}</p>
                ) : (
                    <span className="italic text-slate-400">-</span>
                )}
            </td>

            <td className="px-5 py-4">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
                    customer.type === 'registered' 
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                    {customer.type}
                </span>
            </td>

            <td className="px-5 py-4 font-medium text-slate-900 dark:text-white hidden md:table-cell">
                ₹{customer.total_purchases.toLocaleString('en-IN')}
                <p className="text-xs text-slate-400 mt-0.5 font-normal">{customer.visit_count} visits</p>
            </td>

            <td className="px-5 py-4">
                {customer.outstanding_due > 0 ? (
                    <span className="font-bold text-red-600">₹{customer.outstanding_due.toFixed(2)}</span>
                ) : (
                    <span className="font-medium text-slate-400">₹0.00</span>
                )}
            </td>

            <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(customer);
                            }}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(customer);
                            }}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );

  return <Table columns={columns} renderRow={renderRow} data={data} />;
}
