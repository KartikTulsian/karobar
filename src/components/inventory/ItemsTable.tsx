"use client";

import { useNavigation } from '@/hooks/useNavigation';
import { InventoryItem } from '@/types/inventory'
import { AlertCircle, Edit, ListPlus, Trash2 } from 'lucide-react';
import Table from '../common/Table';
import { useRouter } from 'next/navigation';
import { formatGuide, getLatestPricing } from '@/lib/helpers/inventoryPricing';

interface ItemsTableProps {
    data: InventoryItem[];
    onEdit?: (item: InventoryItem) => void;
    onDelete?: (item: InventoryItem) => void;
    onAddToPurchase?: (item: InventoryItem) => void;
}

export default function ItemsTable({ data, onEdit, onDelete, onAddToPurchase }: ItemsTableProps) {
    const { currentRole } = useNavigation();
    const router = useRouter();
    const canSeeCost = currentRole === "owner" || currentRole === "manager";

    const columns = [
        {
            header: "SKU",
            accessor: "sku",
            sortable: true,
        },
        {
            header: "Item Name",
            accessor: "name",
            sortable: true,
        },
        {
            header: "Category",
            accessor: "category_name",
            className: "hidden md:table-cell",
            sortable: true,
        },
        {
            header: "Brand",
            accessor: "brand_name",
            className: "hidden lg:table-cell",
            sortable: true,
        },
        ...(canSeeCost
            ? [
                {
                    header: "Cost Price",
                    accessor: "latest_buy_price",
                    sortable: true,
                },
            ]
            : []),
        {
            header: "Sell Price",
            accessor: "latest_sell_price",
            sortable: true,
        },
        {
            header: "Stock Qty",
            accessor: "total_stock_qty",
            sortable: true,
        },
        {
            header: "Status",
            accessor: "unit",
            sortable: true,
        },
        ...(currentRole === "owner"
            ? [
                {
                    header: "Actions",
                    accessor: "action",
                },
            ]
            : [])
    ];

    const renderRow = (item: InventoryItem) => {
        // Cost / sell price / price guide according to the latest batch
        const latest = getLatestPricing(item);
        const guideText = formatGuide(latest.guide);
        return (
            <tr
                key={item.id}
                onClick={() => router.push(`/inventory/items/${item.id}`)}
                className="border-b border-slate-200 text-sm even:bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:even:bg-slate-800/50 dark:hover:bg-slate-800/80 transition-colors"
            >
                <td className="px-5 py-4 font-mono text-xs">{item.sku || '-'}</td>
                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{item.name}</td>

                <td className="px-5 py-4 hidden md:table-cell">{item.category_name || '-'}</td>
                <td className="px-5 py-4 hidden lg:table-cell">{item.brand_name || '-'}</td>

                {canSeeCost && (
                    <td className="px-5 py-4 text-right font-medium text-slate-600 dark:text-slate-300">
                        {latest.hasBatch ? `₹${(latest.cost ?? 0).toFixed(2)}` : '-'}
                    </td>
                )}

                <td className="px-5 py-4 text-right font-medium">
                    ₹{latest.sell.toFixed(2)}
                    {guideText && (
                        <div className="mt-0.5 text-[10px] font-normal text-slate-400" title="Price guide (reminder only)">
                            {guideText}
                        </div>
                    )}
                </td>

                <td className="px-5 py-4 text-center">
                    <span className="font-medium text-slate-900 dark:text-white">{item.total_stock_qty}</span>
                    <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                </td>

                <td className="px-5 py-4 text-center">
                    {item.total_stock_qty == 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-600/10 dark:bg-red-500/10 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" /> Out Of Stock
                        </span>
                    ) : item.total_stock_qty <= item.low_stock_threshold ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-orange-500 ring-1 ring-inset ring-orange-600/10 dark:bg-orange-500/10 dark:text-orange-400">
                            <AlertCircle className="h-3 w-3" /> Low Stock
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400">
                            In Stock
                        </span>
                    )}
                </td>

                {currentRole === "owner" && (
                    <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                            {onAddToPurchase && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddToPurchase(item);
                                    }}
                                    title="Add to Purchase List"
                                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors"
                                >
                                    <ListPlus className="h-4 w-4" />
                                </button>
                            )}

                            {onEdit && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(item);
                                    }}
                                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(item);
                                    }}
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
    }

    return (
        <Table columns={columns} renderRow={renderRow} data={data} />
    )
}
