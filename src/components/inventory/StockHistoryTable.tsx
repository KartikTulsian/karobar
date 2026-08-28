"use client";

import { StockMovementWithDetails, MovementType, MovementReferenceType } from '@/types/inventory';
import Table from '../common/Table';
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { JSX } from 'react';

interface StockHistoryTableProps {
    data: StockMovementWithDetails[];
    showItemName?: boolean; // True for Global Ledger, False for specific Item Details page
}

export default function StockHistoryTable({ data, showItemName = true }: StockHistoryTableProps) {

    const columns = [
        { header: "Date", accessor: "created_at", sortable: true },
        ...(showItemName ? [{ header: "Item", accessor: "item_name", sortable: true }] : []),
        { header: "Movement Type", accessor: "type", sortable: true },
        { header: "Qty Change", accessor: "qty_change", sortable: true },
        { header: "Balance", accessor: "qty_after", sortable: false },
        { header: "Reference / Note", accessor: "reference", sortable: false, className: "hidden md:table-cell" },
        { header: "Recorded By", accessor: "user", sortable: false, className: "hidden sm:table-cell" },
    ];

    const formatMovementType = (type: MovementType) => {
        const formats: Record<MovementType, { label: string, color: string, icon: JSX.Element }> = {
            purchase: { label: "Purchase", color: "text-blue-700 bg-blue-50 ring-blue-600/20", icon: <ArrowDownRight className="h-3 w-3 mr-1" /> },
            sale: { label: "Sale", color: "text-amber-700 bg-amber-50 ring-amber-600/20", icon: <ArrowUpRight className="h-3 w-3 mr-1" /> },
            return_in: { label: "Return In", color: "text-emerald-700 bg-emerald-50 ring-emerald-600/20", icon: <ArrowDownRight className="h-3 w-3 mr-1" /> },
            return_out: { label: "Return Out", color: "text-orange-700 bg-orange-50 ring-orange-600/20", icon: <ArrowUpRight className="h-3 w-3 mr-1" /> },
            adjustment: { label: "Adjustment", color: "text-slate-700 bg-slate-100 ring-slate-500/20", icon: <Scale className="h-3 w-3 mr-1" /> }
        };
        return formats[type];
    };

    const formatReference = (type: MovementReferenceType | null) => {
        if (!type) return "N/A";
        const labels: Record<MovementReferenceType, string> = {
            bill: "Sales Invoice",
            purchase_order: "Purchase Order",
            sales_return: "Sales Return",
            purchase_return: "Purchase Return",
            manual_adjustment: "Manual Audit",
            opening_stock: "Opening Stock"
        };
        return labels[type] || type;
    };

    const renderRow = (movement: StockMovementWithDetails) => {
        const typeFormat = formatMovementType(movement.type);
        const isPositive = movement.qty_change > 0;
        const isZero = movement.qty_change === 0;

        return (
            <tr
                key={movement.id}
                className="border-b border-slate-200 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20 dark:border-slate-700"
            >
                <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    <div className="font-medium text-slate-900 dark:text-slate-200">
                        {new Date(movement.created_at).toLocaleDateString('en-GB')}
                    </div>
                    <div className="text-xs">
                        {new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </td>

                {showItemName && (
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                        {movement.items?.name || 'Unknown Item'}
                    </td>
                )}

                <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${typeFormat.color} dark:bg-opacity-10 dark:ring-opacity-20`}>
                        {typeFormat.icon}
                        {typeFormat.label}
                    </span>
                </td>

                <td className="px-5 py-4">
                    <div className={`font-black text-base flex items-center gap-1 ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 
                        isZero ? 'text-slate-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                        {isPositive ? '+' : ''}{movement.qty_change}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                        Was: {movement.qty_before}
                    </div>
                </td>

                <td className="px-5 py-4 font-black text-slate-900 dark:text-white text-base">
                    {movement.qty_after}
                </td>

                <td className="px-5 py-4 hidden md:table-cell">
                    <div className="font-medium text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider mb-0.5">
                        {formatReference(movement.reference_type)}
                    </div>
                    {movement.note && (
                        <div className="text-xs text-slate-500 max-w-[200px] truncate" title={movement.note}>
                            {movement.note}
                        </div>
                    )}
                </td>

                <td className="px-5 py-4 hidden sm:table-cell text-slate-600 dark:text-slate-400 text-xs font-medium">
                    {movement.users?.full_name || 'System / Auto'}
                </td>
            </tr>
        );
    };

    return <Table columns={columns} renderRow={renderRow} data={data} />;
}