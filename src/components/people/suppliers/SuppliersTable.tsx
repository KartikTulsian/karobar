"use client";

import Table from '@/components/common/Table';
import { useNavigation } from '@/hooks/useNavigation';
import { Supplier } from '@/types/people';
import { Building2, Edit2, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SuppliersTableProp {
    data: Supplier[];
    onEdit?: (supplier: Supplier) => void;
    onDelete?: (supplier: Supplier) => void;
}

export default function SuppliersTable({ data, onEdit, onDelete }: SuppliersTableProp) {

    const router = useRouter();

    const { currentRole } = useNavigation();

    const columns = [
        { header: "Supplier Name", accessor: "name", sortable: true },
        { header: "Contact Info", accessor: "phone", sortable: true },
        { header: "Location", accessor: "city", sortable: true, className: "hidden lg:table-cell" },
        { header: "Payment Terms", accessor: "payment_terms", sortable: true, className: "hidden md:table-cell" },
        { header: "Total Purchases", accessor: "total_purchases", sortable: true, className: "hidden lg:table-cell" },
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

    const renderRow = (supplier: Supplier) => (
        <tr
            key={supplier.id}
            onClick={() => router.push(`/people/suppliers/${supplier.id}`)}
            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer"
        >
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        {supplier.company_name ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{supplier.name}</p>
                        {supplier.company_name && <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{supplier.company_name}</p>}
                        {supplier.gstin && <p className="text-[10px] text-slate-400 font-mono mt-0.5">GST: {supplier.gstin}</p>}
                    </div>
                </div>
            </td>

            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                {supplier.phone ? (
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                        {supplier.country_code || '+91'} {supplier.phone}
                    </p>
                ) : (
                    <p className="italic text-slate-400">No phone</p>
                )}
                {supplier.email && <p className="text-xs mt-0.5 text-slate-400">{supplier.email}</p>}
            </td>

            <td className="px-5 py-4 hidden lg:table-cell text-sm text-slate-600 dark:text-slate-400">
                {supplier.city ? (
                    <p>{supplier.city}{supplier.state_code ? `, ${supplier.state_code}` : ''}</p>
                ) : (
                    <span className="italic text-slate-400">-</span>
                )}
            </td>

            <td className="px-5 py-4 hidden md:table-cell">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300">
                    {supplier.payment_terms || 'None Setup'}
                </span>
            </td>

            <td className="px-5 py-4 hidden lg:table-cell font-medium text-slate-900 dark:text-white">
                ₹{(supplier.total_purchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>

            <td className="px-5 py-4">
                {(supplier.outstanding_due || 0) > 0 ? (
                    <span className="font-bold text-red-600 dark:text-red-400">
                        ₹{(supplier.outstanding_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                ) : (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">₹0.00</span>
                )}
            </td>

            <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(supplier);
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
                                onDelete(supplier);
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