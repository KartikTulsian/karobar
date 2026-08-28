"use client";

import StockAdjustmentForm from "@/components/inventory/StockAdjustmentForm";
import StockHistoryTable from "@/components/inventory/StockHistoryTable";
import ActionModal from "@/components/ui/ActionModal";
import { useAdjustStock, useAllStockMovements, useInventory } from "@/hooks/useInventory";
import { StockAdjustmentFormData } from "@/lib/validations/stockAdjustmentSchema";
import { useTenantStore } from "@/store/useTenantStore";
import { InventoryItem } from "@/types/inventory";
import { ArrowDownToLine, Loader2, Scale, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

export default function StockLedgerPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const router = useRouter();

    const { data: items = [] } = useInventory(tenantId);
    const { mutateAsync: adjustStock, isPending: isAdjusting } = useAdjustStock(tenantId);

    const { data: movements = [], isLoading, isError } = useAllStockMovements(tenantId);
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItemToAdjust, setSelectedItemToAdjust] = useState<InventoryItem | null>(null);
    const [itemSearch, setItemSearch] = useState("");

    const handleAdjustStockClick = () => {
        setSelectedItemToAdjust(null);
        setItemSearch("");
        setIsModalOpen(true);
    };

    const handleAdjustSubmit = async (data: StockAdjustmentFormData) => {
        try {
            await adjustStock(data);
            toast.success("Stock adjusted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to adjust stock.");
        }
    };

    // Simple frontend filter for items or notes
    const filteredMovements = movements.filter(m => 
        m.items?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reference_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock Ledger</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        A complete, immutable audit trail of all inventory movements.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm">
                        <ArrowDownToLine className="h-4 w-4" />
                        Export CSV
                    </button>
                    <button 
                        onClick={handleAdjustStockClick}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                    >
                        <Scale className="h-4 w-4" />
                        Adjust Stock
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by item name, reference, or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900 dark:text-white"
                    />
                </div>
                {/* Future Feature: Add Date Range Picker here */}
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                        <p className="text-sm font-medium">Loading ledger...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-500">
                        <p className="font-semibold mb-1">Failed to load ledger.</p>
                        <p className="text-sm text-red-400">Please check your database connection.</p>
                    </div>
                ) : filteredMovements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <p className="font-semibold mb-1">No movements found.</p>
                        <p className="text-sm">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    <StockHistoryTable data={filteredMovements} showItemName={true} />
                )}
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedItemToAdjust ? "Manual Stock Adjustment" : "Select Item to Adjust"}
            >
                {!selectedItemToAdjust ? (
                    // STEP 1: Select the Item
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search catalog by name..."
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 bg-white text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 shadow-inner">
                            {items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => setSelectedItemToAdjust(item)}
                                    className="cursor-pointer p-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors last:border-0"
                                >
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{item.name}</p>
                                    <p className="text-xs text-slate-500">Current Stock: {item.total_stock_qty} {item.unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    // STEP 2: Render the actual form with the selected item passed into it
                    <StockAdjustmentForm
                        item={selectedItemToAdjust}
                        isSubmitting={isAdjusting}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleAdjustSubmit}
                    />
                )}
            </ActionModal>
        </div>
    );
}