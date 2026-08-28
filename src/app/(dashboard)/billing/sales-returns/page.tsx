"use client";

import ReturnsTable from '@/components/billing/ReturnsTable';
import SalesReturnForm from '@/components/billing/SalesReturnForm';
import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import ActionModal from '@/components/ui/ActionModal';
import { useCreateSalesReturn, useDeleteSalesReturn, useSalesReturns, useUpdateSalesReturn } from '@/hooks/useBilling';
import { SalesReturnFormData } from '@/lib/validations/salesReturnSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { SalesReturnWithDetails } from '@/types/billing';
import { Download, Search, Loader2, Undo2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify';

export default function SalesReturnsPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const { data: returns = [], isLoading, isError } = useSalesReturns(tenantId);
    
    // Mutations
    const { mutateAsync: createReturn } = useCreateSalesReturn(tenantId);
    const { mutateAsync: updateReturn } = useUpdateSalesReturn(tenantId);
    const { mutateAsync: deleteReturn, isPending: isDeleting } = useDeleteSalesReturn(tenantId);

    const [searchQuery, setSearchQuery] = useState('');

    // Modal State Management (Matching AllItemsPage pattern)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedReturn, setSelectedReturn] = useState<SalesReturnWithDetails | null>(null);

    // --- HANDLERS ---
    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedReturn(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (returnItem: SalesReturnWithDetails) => {
        setModalType("update");
        setSelectedReturn(returnItem);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (returnItem: SalesReturnWithDetails) => {
        setModalType("delete");
        setSelectedReturn(returnItem);
        setIsModalOpen(true);
    };

    // --- SUBMIT ACTIONS ---
    const handleCreateSubmit = async (data: SalesReturnFormData) => {
        try {
            await createReturn(data);
            toast.success("Sales return processed successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to process return.");
        }
    };

    const handleUpdateSubmit = async (data: SalesReturnFormData) => {
        if (!selectedReturn?.id) return;
        try {
            await updateReturn({ returnId: selectedReturn.id, data });
            toast.success("Sales return updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update return.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedReturn?.id) return;
        try {
            await deleteReturn(selectedReturn.id);
            toast.success("Return record deleted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete record.");
        }
    };

    const filteredReturns = useMemo(() => {
        let result = returns;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                ret =>
                    (ret.bills?.bill_number.toLowerCase() || "").includes(query) ||
                    (ret.bills?.customers?.name.toLowerCase() || "").includes(query)
            );
        }

        return result;
    }, [returns, searchQuery]);

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>
            {/* Page Header Area */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Returns</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage and view refunded invoices and credit notes.</p>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </button>
                    <button 
                        onClick={handleOpenCreate}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-semibold text-white shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Return
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
                            placeholder="Search Original Bill or Customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50"
                        />
                    </div>
                </div>

                {/* Table Rendering */}
                {isLoading ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <span className="text-sm font-medium text-slate-500">Loading returns...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-red-500">
                        <span className="text-sm font-medium">Failed to load returns data.</span>
                    </div>
                ) : filteredReturns.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <Undo2 className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No sales returns found.</span>
                    </div>
                ) : (
                    <ReturnsTable 
                        data={filteredReturns} 
                        onEdit={handleOpenUpdate}
                        onDelete={handleOpenDelete}
                    />
                )}
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Process Sales Return" : modalType === "update" ? "Edit Return Record" : "Delete Return Record"}
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={`Refund for ${selectedReturn?.bills?.bill_number || "Bill"}`}
                        itemType='Sales Return'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <SalesReturnForm 
                        tenantId={tenantId}
                        isModal={true}
                        defaultValues={selectedReturn}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
    );
}
