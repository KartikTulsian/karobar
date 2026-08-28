"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAdjustStock, useItem, useItemStockMovements, useUpdateItem } from '@/hooks/useInventory';
import { ArrowLeft, Box, CheckCircle2, Edit, Loader2, PackageOpen, Printer, TrendingDown, History, Scale } from 'lucide-react';
import DetailsTable from '@/components/common/DetailsTable';
import ImageCarousel from '@/components/common/ImageCarousel';
import { useNavigation } from '@/hooks/useNavigation';
import StockHistoryTable from '@/components/inventory/StockHistoryTable';
import { useState } from 'react';
import { ItemFormData } from '@/lib/validations/itemSchema';
import { StockAdjustmentFormData } from '@/lib/validations/stockAdjustmentSchema';
import { toast } from 'react-toastify';
import ActionModal from '@/components/ui/ActionModal';
import ItemForm from '@/components/inventory/ItemForm';
import StockAdjustmentForm from '@/components/inventory/StockAdjustmentForm';
import { useTenantStore } from '@/store/useTenantStore';

export default function ItemDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;
  const activeTenant = useTenantStore((state) => state.activeTenant);
  const tenantId = activeTenant?.tenantId || "";

  const { currentRole } = useNavigation();

  // Fetch Item Details
  const { data: item, isLoading, isError } = useItem(tenantId, itemId);
  
  // Fetch Specific Ledger History for this Item
  const { data: movements = [] } = useItemStockMovements(tenantId, itemId);

  const { mutateAsync: updateItem } = useUpdateItem(tenantId);
  const { mutateAsync: adjustStock, isPending: isAdjusting } = useAdjustStock(tenantId);

  const handleUpdateSubmit = async (data: ItemFormData) => {
    try {
      await updateItem({ itemId, data });
      toast.success("Item updated successfully!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update item.");
    }
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"update" | "adjust">("update");

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (isError || !item) return <div className="p-8 text-red-500">Error loading item details.</div>;

  const activeBatches = item.batches?.filter(batch => batch.stock_qty > 0) || [];
  const depletedBatchesCount = (item.batches?.length || 0) - activeBatches.length;

  // Map the raw data into the format our generic DetailsTable expects
  const tableData = [
    { label: "Product Name", value: item.name },
    { label: "Category", value: item.category_name },
    { label: "Brand", value: item.brand_name },
    { label: "SKU", value: item.sku || 'N/A', valueClassName: "font-mono text-sm" },
    { label: "HSN Code", value: item.hsn_code || 'N/A', valueClassName: "font-mono text-sm" },
    { label: "Unit Type", value: item.unit },
    {
      label: "Total Current Stock",
      value: (
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${item.total_stock_qty > item.low_stock_threshold
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400'
            : item.total_stock_qty > 0
              ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400'
              : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400'
          }`}>
          {item.total_stock_qty > item.low_stock_threshold ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {item.total_stock_qty} {item.unit}
        </span>
      )
    },
    { label: "Low Stock Threshold", value: item.low_stock_threshold },
    { label: "Default Sell Price (MRP)", value: `₹${item.default_sell_price.toFixed(2)}`, valueClassName: "font-bold text-slate-900 dark:text-white" },
    { label: "GST Rate", value: item.gst_rate ? `${item.gst_rate}%` : '0%' },
    { label: "Status", value: item.is_active ? 'Active' : 'Inactive', valueClassName: item.is_active ? "text-emerald-600 font-medium" : "text-slate-400 font-medium" },
    { label: "Description", value: item.description || 'No description provided.' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-2 w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{item.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Master Catalog & Batch Details</p>
        </div>

        <div className="flex items-center gap-3">
          {currentRole === "owner" && (
              <>
                  <button 
                    onClick={() => { setModalType("update"); setIsModalOpen(true); }} 
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-blue-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Item
                  </button>
                  <button 
                    onClick={() => { setModalType("adjust"); setIsModalOpen(true); }} 
                    className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                  >
                    <Scale className="mr-2 h-4 w-4" /> Adjust Stock
                  </button>
              </>
          )}
          <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Printer className="mr-2 h-4 w-4" /> Print Labels
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Left Column: Data & Batches */}
        <div className="flex flex-col gap-8 lg:col-span-2">

          <DetailsTable title="Catalog Information" data={tableData} />

          {/* NEW: Physical Stock Batches Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Box className="h-5 w-5 text-indigo-500" /> Active Physical Stock (Batches)
              </h3>
              {depletedBatchesCount > 0 && (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  {depletedBatchesCount} depleted batch{depletedBatchesCount !== 1 ? 'es' : ''} hidden
                </span>
              )}
            </div>

            {activeBatches.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                    <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="px-4 py-3">Received On</th>
                      <th className="px-4 py-3">Batch / PO Ref</th>
                      <th className="px-4 py-3 text-right">Cost Price</th>
                      <th className="px-4 py-3 text-right">Sell Price</th>
                      <th className="px-4 py-3 text-right">Qty Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {activeBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                          {new Date(batch.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {batch.batch_number || 'OPENING-STOCK'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-amber-600 dark:text-amber-500">
                          ₹{batch.buy_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-500">
                          ₹{batch.sell_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                            {batch.stock_qty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                <PackageOpen className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No active stock available.</p>
                <p className="text-xs text-slate-400 mt-1">Create a Purchase Order or Manual Adjustment to add stock.</p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-500" /> Stock Movement History
              </h3>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {movements.length > 0 ? (
                    <StockHistoryTable data={movements} showItemName={false} />
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No movements recorded yet.</p>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Right Column: Images & Barcode */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Barcode Widget */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-16 w-48 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/e9/UPC-A-036000291452.svg')] bg-contain bg-center bg-no-repeat opacity-80 dark:invert"></div>
            <p className="mt-3 text-sm tracking-widest text-slate-500 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
              {item.barcode || 'NO-BARCODE'}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ImageCarousel images={item.images} altText={item.name} />
          </div>
        </div>
      </div>
      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === "update" ? "Edit Product" : "Manual Stock Adjustment"}
      >
        {modalType === "update" ? (
          <ItemForm
            type="update"
            tenantId={tenantId}
            isModal={true}
            defaultValues={{ ...item, images: item.images || [] } as unknown as ItemFormData}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleUpdateSubmit}
          />
        ) : (
          <StockAdjustmentForm
            item={item}
            isSubmitting={isAdjusting}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleAdjustSubmit}
          />
        )}
      </ActionModal>
    </div>
  );
}