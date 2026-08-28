import { ToPurchaseItem } from '@/types/purchases';
import { Edit2, Package, Trash2 } from 'lucide-react';
import { useState } from 'react'

interface SupplierPurchaseCardProps {
    supplierName: string;
    items: ToPurchaseItem[];
    onLogPurchase: (supplierName: string, selectedItemIds: string[]) => void;
    onEdit: (item: ToPurchaseItem) => void;
    onDelete: (item: ToPurchaseItem) => void;
}

export default function SupplierPurchaseCard({ supplierName, items, onLogPurchase, onEdit, onDelete }: SupplierPurchaseCardProps) {

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const isAllSelected = items.length > 0 && selectedIds.length === items.length;

    // Handle the "Select All" checkbox in the header
    const handleToggleAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(item => item.id)); // select all
        }
    };

    // Handle individual item checkboxes
    const handleToggleItem = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(itemId => itemId !== id)
                : [...prev, id]
        );
    };

    const handleLogClick = () => {
        if (selectedIds.length === 0) return;
        onLogPurchase(supplierName, selectedIds);
        setSelectedIds([]); // Clear selection after logging
    }

    return (
        <div className="flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
            {/* Card Header */}
            <div className="bg-amber-50 dark:bg-slate-700/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Package className="h-4 w-4 text-amber-600" />
                        {supplierName}
                    </h3>
                </div>
                <span className="text-xs font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded-full text-slate-500 shadow-sm">
                    {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${items.length} items`}
                </span>
            </div>

            {/* Card Body (Item List) */}
            <div className="flex-1 p-2 flex flex-col gap-2">
                {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);

                    // const dateAdded = new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                    return (
                        <div key={item.id} className="p-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative">
                            <div className="flex items-start gap-3 pr-16"> {/* Added pr-16 to make room for buttons */}
                                <div className="pt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleItem(item.id)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.item_name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Qty: <span className="text-slate-700 dark:text-slate-300">{item.qty_needed}</span></p>
                                    {item.notes && <p className="text-xs text-slate-400 mt-1 italic leading-tight line-clamp-2">&quot;{item.notes}&quot;</p>}
                                </div>
                            </div>

                            {/* EDIT & DELETE BUTTONS */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-slate-800 p-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Card Footer (Action) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 mt-auto">
                <button
                    onClick={handleLogClick}
                    disabled={selectedIds.length === 0 || supplierName === 'Unassigned / Unknown'}
                    className={`w-full py-2 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors ${
                        (selectedIds.length > 0 && supplierName !== 'Unassigned / Unknown') 
                            ? 'text-indigo-600 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer' 
                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    }`}
                >
                    {supplierName === 'Unassigned / Unknown' ? 'Assign Supplier First' : `Create PO (${selectedIds.length})`}
                </button>
            </div>
        </div>
    );
}
