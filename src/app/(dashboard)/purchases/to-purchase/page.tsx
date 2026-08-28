"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import PurchaseOrderForm from '@/components/purchases/PurchaseOrderForm';
import SupplierPurchaseCard from '@/components/purchases/SupplierPurchaseCard';
import ToPurchaseForm from '@/components/purchases/ToPurchaseForm';
import ActionModal from '@/components/ui/ActionModal';
import { useInventory } from '@/hooks/useInventory';
import { useToPurchaseList, useRemoveFromPurchaseList, useAddToPurchaseList, useUpdatePurchaseList, useCreatePurchaseOrder } from '@/hooks/usePurchases';
import { PurchaseOrderFormData } from '@/lib/validations/purchaseOrderSchema';
import { ToPurchaseFormData } from '@/lib/validations/toPurchaseSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { ToPurchaseItem } from '@/types/purchases';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify';

export default function ToPurchasePage() {

    const router = useRouter();
    // Hardcoded for development - replace with actual auth context later
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    // Fetch live data from Supabase
    const { data: purchaseItems = [], isLoading, isError } = useToPurchaseList(tenantId);

    // Fetch live items from Supabase
    const { data: inventoryItems = [] } = useInventory(tenantId);

    // Bring in the delete mutation
    const { mutateAsync: addItem } = useAddToPurchaseList(tenantId);
    const { mutateAsync: updateItem } = useUpdatePurchaseList(tenantId);
    const { mutateAsync: removeItems, isPending: isDeleting } = useRemoveFromPurchaseList(tenantId);
    const { mutateAsync: createPO } = useCreatePurchaseOrder(tenantId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"update" | "delete" | "create_po">("update");

    const [selectedItem, setSelectedItem] = useState<ToPurchaseItem | null>(null);
    const [poDefaultValues, setPoDefaultValues] = useState<Partial<PurchaseOrderFormData>>({});
    const [convertingItemIds, setConvertingItemIds] = useState<string[]>([]);

    const handleCreateSubmit = async (data: ToPurchaseFormData) => {
        await addItem(data);
        toast.success("Added to purchase list");
    };

    const handleUpdateSubmit = async (data: ToPurchaseFormData) => {
        if (!selectedItem?.id) return;
        try {
            await updateItem({ id: selectedItem.id, data });
            toast.success("Item updated successfully");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update item");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedItem?.id) return;
        try {
            await removeItems([selectedItem.id]); // Pass as array because the API accepts string[]
            toast.success("Item removed from list");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete item");
        }
    };

    const handleOpenEdit = (item: ToPurchaseItem) => {
        setSelectedItem(item);
        setModalType("update");
        setIsModalOpen(true);
    };

    const handleOpenDelete = (item: ToPurchaseItem) => {
        setSelectedItem(item);
        setModalType("delete");
        setIsModalOpen(true);
    };

    const handleLogPurchase = (supplierName: string, loggedItemIds: string[]) => {
        // Future Integration: Convert to Draft PO
        console.log("Logging items:", loggedItemIds, "for", supplierName);

        // 1. Find the full item objects based on the IDs emitted by the card
        const selectedItems = purchaseItems.filter(item => loggedItemIds.includes(item.id));
        if (selectedItems.length === 0) return;

        // 2. Extract supplier ID (We know they all share the same supplier because of the grouping)
        const mappedSupplierId = selectedItems[0].supplier_id || "";

        const hasGstItems = selectedItems.some(item => {
            const masterItem = inventoryItems.find(inv => inv.id === item.item_id);
            return (masterItem?.gst_rate || 0) > 0;
        });

        // 3. Map the ToPurchase items into the exact shape the PO Form expects
        const prefillData: Partial<PurchaseOrderFormData> = {
            supplier_id: mappedSupplierId,
            status: "draft",
            is_gst_supply: hasGstItems,
            po_line_items: selectedItems.map((item, index) => {

                const masterItem = inventoryItems.find(inv => inv.id === item.item_id);
                
                const batches = masterItem?.batches || [];
                const sortedBatches = [...batches].sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                const latestBuyPrice = sortedBatches.length > 0 ? sortedBatches[0].buy_price : 0;

                // Format the unit correctly
                let rawUnit = masterItem?.unit || "Pcs";
                if (rawUnit.toLowerCase() === 'ltr' || rawUnit.toLowerCase() === 'l') rawUnit = "Litre";
                const formattedUnit = rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase();

                return {
                    item_id: item.item_id,
                    item_name: item.item_name,
                    hsn_code: masterItem?.hsn_code || "",
                    unit: formattedUnit,
                    qty_ordered: item.qty_needed, 
                    qty_received: 0,
                    unit_cost: latestBuyPrice,
                    batch_sell_price: masterItem?.default_sell_price || 0,
                    discount_pct: 0,
                    gst_rate: masterItem?.gst_rate || 0,
                    cgst: 0,
                    sgst: 0,
                    igst: 0,
                    line_total: 0,
                    sort_order: index,
                };
            })
        };

        // 4. Set states and open the PO Form modal
        setPoDefaultValues(prefillData);
        setConvertingItemIds(loggedItemIds);
        setModalType("create_po");
        setIsModalOpen(true);
    };

    const handleCreatePOSubmit = async (data: PurchaseOrderFormData) => {
        try {
            // 1. Create the actual PO in the database
            const newPO = await createPO(data);

            // 2. Cleanup: Delete the items from the Kanban board since they are now ordered
            if (convertingItemIds.length > 0) {
                await removeItems(convertingItemIds);
            }

            toast.success("Purchase Order created successfully!");
            setIsModalOpen(false);
            setConvertingItemIds([]);

            router.push(`/purchases/orders/${newPO.id}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create PO");
        }
    };

    // Group items by supplier for the Kanban board
    const groupedItems = useMemo(() => {
        const groups: Record<string, ToPurchaseItem[]> = {};

        purchaseItems.forEach(item => {
            const supName = item.suppliers?.name || 'Unassigned / Unknown';
            if (!groups[supName]) groups[supName] = [];
            groups[supName].push(item);
        });

        return groups;
    }, [purchaseItems]);

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">To Purchase List</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage items requested for restock and organize them by supplier.</p>
                </div>
            </div>

            {/* CREATE FORM AT THE TOP */}
            <ToPurchaseForm
                tenantId={tenantId}
                type="create"
                onSubmit={handleCreateSubmit}
            />

            {/* THE GRID / KANBAN BOARD */}
            {isLoading ? (
                <div className="flex py-12 flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium text-slate-500">Loading purchase list...</span>
                </div>
            ) : isError ? (
                <div className="flex py-12 flex-col items-center justify-center gap-3 text-red-500">
                    <span className="text-sm font-medium">Failed to load data.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start pb-10">
                    {Object.entries(groupedItems).map(([supplierName, items]) => (
                        <SupplierPurchaseCard
                            key={supplierName}
                            supplierName={supplierName}
                            items={items}
                            onLogPurchase={handleLogPurchase}
                            onEdit={handleOpenEdit}      // CONNECTED
                            onDelete={handleOpenDelete}  // CONNECTED
                        />
                    ))}

                    {Object.keys(groupedItems).length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            No items found in your purchase list.
                        </div>
                    )}
                </div>
            )}

            {/* UNIFIED ACTION MODAL */}
            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    modalType === "update" ? "Edit Purchase Item" :
                        modalType === "delete" ? "Remove Item" :
                            "Convert to Purchase Order"
                }
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedItem?.item_name || "this item"}
                        itemType='To Purchase List'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : modalType === "update" ? (
                    <ToPurchaseForm
                        key={selectedItem?.id} // Forces clean remount when changing items
                        tenantId={tenantId}
                        type="update"
                        defaultValues={{
                            ...selectedItem,
                            supplier_id: selectedItem?.supplier_id || "" // Maps null back to the "Unassigned" select option
                        }}
                        onSubmit={handleUpdateSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                ) : (
                    <PurchaseOrderForm
                        key={`po-${convertingItemIds.join('-')}`}
                        type="create"
                        tenantId={tenantId}
                        isModal={true}
                        defaultValues={poDefaultValues}
                        onSubmit={handleCreatePOSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
            </ActionModal>
        </div>
    );
}
