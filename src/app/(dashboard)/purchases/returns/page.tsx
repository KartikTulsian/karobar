// src/app/purchases/returns/page.tsx
"use client";

import { useMemo, useState } from 'react';
import { Download, Search, Undo2, Plus } from 'lucide-react';
import PurchaseReturnsTable from '@/components/purchases/PurchaseReturnsTable';
import { useCreatePurchaseReturn, useDeletePurchaseReturn, usePurchaseReturns, useUpdatePurchaseReturn } from '@/hooks/usePurchases';
import { PurchaseReturnWithDetails } from '@/types/purchases';
import ActionModal from '@/components/ui/ActionModal';
import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import PurchaseReturnForm from '@/components/purchases/PurchaseReturnForm';
import { toast } from 'react-toastify';
import { PurchaseReturnFormData } from '@/lib/validations/purchaseReturnSchema';
import { useTenantStore } from '@/store/useTenantStore';

export default function PurchaseReturnsPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedReturn, setSelectedReturn] = useState<PurchaseReturnWithDetails | null>(null);

    const { data: returns = [], isLoading, isError } = usePurchaseReturns(tenantId);
    const { mutateAsync: createReturn } = useCreatePurchaseReturn(tenantId);
    const { mutateAsync: updateReturn } = useUpdatePurchaseReturn(tenantId);
    const { mutateAsync: deleteReturn, isPending: isDeleting } = useDeletePurchaseReturn(tenantId);

    // Filter logic for searching by Supplier Name or PO Number
    const filteredReturns = useMemo(() => {
        if (!searchQuery) return returns;

        const query = searchQuery.toLowerCase();
        return returns.filter(
            ret =>
                (ret.purchase_orders?.po_number.toLowerCase() || "").includes(query) ||
                (ret.purchase_orders?.suppliers?.name.toLowerCase() || "").includes(query)
        );
    }, [returns, searchQuery]);

    const handleCreateSubmit = async (data: PurchaseReturnFormData) => {
        try {
            await createReturn(data);
            toast.success("Purchase Return processed successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to process return.");
        }
    };

    const handleUpdateSubmit = async (data: PurchaseReturnFormData) => {
        if (!selectedReturn?.id) return;
        try {
            await updateReturn({ returnId: selectedReturn.id, data });
            toast.success("Purchase Return updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update return.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedReturn?.id) return;
        try {
            await deleteReturn(selectedReturn.id);
            toast.success("Purchase Return deleted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete return.");
        }
    };

    const handleOpenCreate = () => {
        setSelectedReturn(null);
        setModalType("create");
        setIsModalOpen(true);
    };

    const handleOpenEdit = (ret: PurchaseReturnWithDetails) => {
        setSelectedReturn(ret);
        setModalType("update");
        setIsModalOpen(true);
    };

    const handleOpenDelete = (ret: PurchaseReturnWithDetails) => {
        setSelectedReturn(ret);
        setModalType("delete");
        setIsModalOpen(true);
    };

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>

            {/* Page Header Area */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase Returns</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Track items returned to suppliers and manage debit notes.</p>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-sm">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Log Return
                    </button>
                </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">

                {/* Toolbar */}
                <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
                    {/* Search Bar */}
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Supplier or PO Reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        />
                    </div>
                </div>

                {/* Table Rendering */}
                {isLoading ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                        <span className="text-sm font-medium text-slate-500">Loading returns...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-red-500">
                        <span className="text-sm font-medium">Failed to load returns data.</span>
                    </div>
                ) : filteredReturns.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <Undo2 className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No purchase returns found.</span>
                    </div>
                ) : (
                    <PurchaseReturnsTable
                        data={filteredReturns}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                    />
                )}
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    modalType === "create" ? "Process Purchase Return" :
                    modalType === "update" ? "Edit Purchase Return" :
                    "Delete Purchase Return"
                }
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={`Refund for ${selectedReturn?.purchase_orders?.po_number || "Purchase Order"}`}
                        itemType='Purchase Return'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <PurchaseReturnForm
                        key={selectedReturn ? selectedReturn.id : "new-return"} // Forces clean remount
                        tenantId={tenantId}
                        isModal={true}
                        defaultValues={selectedReturn}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                )}
            </ActionModal>
        </div>
    );
}