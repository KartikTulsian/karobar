"use client";

import ItemsTable from '@/components/inventory/ItemsTable';
import ToPurchaseForm from '@/components/purchases/ToPurchaseForm';
import ActionModal from '@/components/ui/ActionModal';
import { useLowStockInventory } from '@/hooks/useInventory';
import { useAddToPurchaseList } from '@/hooks/usePurchases';
import { ToPurchaseFormData } from '@/lib/validations/toPurchaseSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { InventoryItem } from '@/types/inventory';
import { BellRing, Loader2, PackageX } from 'lucide-react';
import { useState } from 'react'
import { toast } from 'react-toastify';

export default function LowStockPage() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const { lowStockItems, outOfStockItems, isLoading, isError } = useLowStockInventory(tenantId);
    const { mutateAsync: addToPurchaseList } = useAddToPurchaseList(tenantId);

    const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');

    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const handleOpenPurchaseModal = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsPurchaseModalOpen(true);
    };

    const handlePurchaseSubmit = async (data: ToPurchaseFormData) => {
        try {
            await addToPurchaseList(data);
            toast.success("Successfully added to To Purchase list!");
            setIsPurchaseModalOpen(false);
        } catch (error) {
            toast.error("Failed to add to purchase list.");
        }
    };

  return (
    <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>
        {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Low Stocks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your low stocks and out-of-stock items.</p>
        </div>
        
        {/* Quick Action Button for Managers */}
        <button className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
          <BellRing className="mr-2 h-4 w-4" /> Notify Suppliers
        </button>
      </div>

      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* Tabs Navigation Header */}
        <div className="flex border-b border-slate-200 px-5 pt-4 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('low')}
            className={`mr-6 flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'low' 
                ? 'border-orange-500 text-orange-600 dark:text-orange-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Low Stocks
            <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {lowStockItems.length}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('out')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'out' 
                ? 'border-red-500 text-red-600 dark:text-red-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Out of Stocks
            <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {outOfStockItems.length}
            </span>
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
               <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
               <span className="text-sm font-medium text-slate-500">Checking inventory levels...</span>
            </div>
          ) : isError ? (
            <div className="flex h-48 items-center justify-center">
               <span className="text-sm font-medium text-red-500">Failed to load stock data.</span>
            </div>
          ) : (
            <>
              {/* Conditional Rendering based on the Active Tab */}
              {activeTab === 'low' && (
                lowStockItems.length > 0 
                  ? <ItemsTable data={lowStockItems} onAddToPurchase={handleOpenPurchaseModal} /> 
                  : <EmptyState message="All your stock levels are healthy!" />
              )}

              {activeTab === 'out' && (
                outOfStockItems.length > 0 
                  ? <ItemsTable data={outOfStockItems} onAddToPurchase={handleOpenPurchaseModal} /> 
                  : <EmptyState message="No items are currently out of stock." />
              )}
            </>
          )}
        </div>

      </div>

      <ActionModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Add to Purchase List"
      >
        {selectedItem && (
            <ToPurchaseForm 
                key={selectedItem.id}
                tenantId={tenantId}
                type="update" // Uses the clean modal layout
                defaultValues={{
                    item_id: selectedItem.id,
                    item_name: selectedItem.name,
                    qty_needed: selectedItem.low_stock_threshold > 0 ? selectedItem.low_stock_threshold * 2 : 10,
                    supplier_id: "", 
                }}
                onSubmit={handlePurchaseSubmit}
                onCancel={() => setIsPurchaseModalOpen(false)}
            />
        )}
      </ActionModal>
      
    </div>
  )
}

// A simple reusable empty state component for when lists are empty
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
      <PackageX className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}