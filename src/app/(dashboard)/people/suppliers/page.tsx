"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import SupplierForm from '@/components/people/suppliers/SupplierForm';
import SuppliersTable from '@/components/people/suppliers/SuppliersTable';
import ActionModal from '@/components/ui/ActionModal';
import { useCreateSupplier, useDeleteSupplier, useSuppliers, useUpdateSupplier } from '@/hooks/usePeople';
import { SupplierFormData } from '@/lib/validations/supplierSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { Supplier } from '@/types/people';
import { Download, Plus, Search, Building2 } from 'lucide-react';
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify';

const mapToFormData = (supplier: Supplier | null): Partial<SupplierFormData> | undefined => {
    if (!supplier) return undefined;
    return {
        id: supplier.id,
        name: supplier.name,
        company_name: supplier.company_name || "", // Fallbacks in case the type isn't fully synced yet
        country_code: supplier.country_code || "+91",
        phone: supplier.phone || "",
        email: supplier.email || "",
        gstin: supplier.gstin || "",
        address: supplier.address || "",
        city: supplier.city || "",
        state_code: supplier.state_code || "",
        pincode: supplier.pincode || "",
        country: supplier.country || "India",
        payment_terms: supplier.payment_terms || "",
        notes: supplier.notes || "",
    };
}

export default function SuppliersPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');

    const { data: suppliers = [], isLoading, isError } = useSuppliers(tenantId);
    
    const { mutateAsync: createSupplier } = useCreateSupplier(tenantId);
    const { mutateAsync: updateSupplier } = useUpdateSupplier(tenantId);
    const { mutateAsync: deleteSupplier, isPending: isDeleting } = useDeleteSupplier(tenantId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const handleOpenCreate = () => {
        setModalType("create");
        setSelectedSupplier(null);
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (supplier: Supplier) => {
        setModalType("update");
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (supplier: Supplier) => {
        setModalType("delete");
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleCreateSubmit = async (data: SupplierFormData) => {
        try {
            const result = await createSupplier(data);
            
            // Check if the backend matched this new supplier to an existing Karobar user
            if (result && result.matchedUserId) {
                toast.success("Supplier saved! They are already on Karobar. A connection request will be sent.");
            } else {
                toast.success("Supplier added successfully!");
            }
            
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add supplier.");
        }
    };

    const handleUpdateSubmit = async (data: SupplierFormData) => {
        if (!selectedSupplier?.id) return;
        try {
            await updateSupplier({ supplierId: selectedSupplier.id, data });
            toast.success("Supplier updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update supplier.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedSupplier?.id) return;
        try {
            await deleteSupplier(selectedSupplier.id);
            toast.success("Supplier deleted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete supplier.");
        }
    };

    const filteredSuppliers = useMemo(() => {
        let result = suppliers;

        if (paymentFilter) {
            result = result.filter(s => s.payment_terms === paymentFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s => 
                s.name.toLowerCase().includes(query) ||
                (s.phone || "").toLowerCase().includes(query)
            );
        }

        return result;
    }, [searchQuery, paymentFilter, suppliers]);

  return (
    <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>
            
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Suppliers</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your vendors, wholesale directories, and outstanding payables.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </button>
                    <button 
                        onClick={handleOpenCreate}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Supplier
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                
                {/* Toolbar */}
                <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <select 
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                            <option value="">All Payment Terms</option>
                            <option value="Net 15">Net 15</option>
                            <option value="Net 30">Net 30</option>
                            <option value="Cash on Delivery">Cash on Delivery</option>
                        </select>
                    </div>
                </div>

                {/* Table Rendering */}
                {isLoading ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                        <span className="text-sm font-medium text-slate-500">Loading suppliers...</span>
                    </div>
                ) : isError ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-red-500">
                        <span className="text-sm font-medium">Failed to load data.</span>
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500">
                        <Building2 className="h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">No suppliers found.</span>
                    </div>
                ) : (
                    <SuppliersTable 
                        data={filteredSuppliers}
                        onEdit={handleOpenUpdate}
                        onDelete={handleOpenDelete}
                    />
                )}
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Add New Supplier" : modalType === "update" ? "Edit Supplier" : ""}
            >
                {modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={selectedSupplier?.name || "this supplier"}
                        itemType='Supplier'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <SupplierForm
                        type={modalType}
                        isModal={true}
                        defaultValues={modalType === "update" ? mapToFormData(selectedSupplier) : undefined}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
  );
}
