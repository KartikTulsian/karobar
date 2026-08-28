"use client";

import { useNavigation } from '@/hooks/useNavigation';
import { Brand, Category } from '@/types/inventory';
import { Edit, ImageIcon, Trash2 } from 'lucide-react';
import Table from '../common/Table';
import Image from 'next/image';

interface CategoriesBrandsTableProps {
    activeTab: 'categories' | 'brands';
    data: Category[] | Brand[];
    onEdit: (item: Category | Brand) => void;
    onDelete: (item: Category | Brand) => void;
}

export default function CategoriesBrandsTable({ activeTab, data, onEdit, onDelete }: CategoriesBrandsTableProps) {

    const { currentRole } = useNavigation();

    if (activeTab === 'categories') {
        const categoryColumns = [
            { header: "Category", accessor: "name" },
            { header: "Category Slug", accessor: "slug", className: "hidden sm:table-cell" },
            { header: "Created On", accessor: "created_at", className: "hidden md:table-cell" },
            { header: "Status", accessor: "status", className: "text-center" },
            ...(currentRole === "owner" ? [{ header: "Actions", accessor: "actions", className: "text-center" }] : [])
        ];


        const renderCategoriesRow = (item: Category) => (
            <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                <td className="px-5 py-4 hidden sm:table-cell font-mono text-xs text-slate-500">{item.slug}</td>
                <td className="px-5 py-4 hidden md:table-cell text-sm text-slate-500">
                    {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">
                        Active
                    </span>
                </td>
                {currentRole === "owner" && (
                    <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => onEdit(item)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onDelete(item)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        );

        const categoryData = data as Category[];
        return <Table columns={categoryColumns} renderRow={renderCategoriesRow} data={categoryData} />
    }

    if (activeTab === 'brands') {
        const brandColumns = [
            { header: "Brand", accessor: "name" },
            { header: "Created Date", accessor: "created_at", className: "hidden sm:table-cell" },
            { header: "Status", accessor: "status", className: "text-center" },
            ...(currentRole === "owner" ? [{ header: "Actions", accessor: "actions", className: "text-center" }] : [])
        ];

        const renderBrandRow = (item: Brand) => (
            <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="px-5 py-4 flex items-center gap-3">
                    {item.logo_url ? (
                        <Image src={item.logo_url} alt={item.name} className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"><ImageIcon className="h-4 w-4 text-slate-400" /></div>
                    )}
                    <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-sm text-slate-500">
                    {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">
                        Active
                    </span>
                </td>
                {currentRole === "owner" && (
                    <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => onEdit(item)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onDelete(item)}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        );

        const brandData = data as Brand[];
        return <Table columns={brandColumns} renderRow={renderBrandRow} data={brandData} />
    }

    return null;
}
