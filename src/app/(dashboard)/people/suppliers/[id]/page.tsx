"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import PaymentForm from '@/components/finance/payments/PaymentForm';
import WalletLedger from '@/components/people/customers/WalletLedger';
import SupplierForm from '@/components/people/suppliers/SupplierForm';
import SupplierOrdersTable from '@/components/people/suppliers/SupplierOrdersTable';
import SupplierPOCarousel from '@/components/people/suppliers/SupplierPOCarousel';
import SuppliersDetailsCard from '@/components/people/suppliers/SuppliersDetailsCard';
import ActionModal from '@/components/ui/ActionModal';
import { useRecordPaymentBatch, useSupplierPayments, useUnpaidDocuments } from '@/hooks/useFinance';
import { useDeleteSupplier, useSupplierProfile, useUpdateSupplier } from '@/hooks/usePeople';
import { PaymentFormData } from '@/lib/validations/paymentSchema';
import { SupplierFormData } from '@/lib/validations/supplierSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { SupplierProfileData } from '@/types/people';
import { ArrowLeft, CreditCard, Download, Edit, Loader2, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify';

const mapToFormData = (supplier: SupplierProfileData | undefined): Partial<SupplierFormData> | undefined => {
    if (!supplier) return undefined;
    return {
        id: supplier.id,
        name: supplier.name,
        company_name: supplier.company_name || "", 
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
};

export default function IndividualSupplierPage() {
    const params = useParams();
    const router = useRouter();
    const supplierId = params.id as string;

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const { data: supplier, isLoading, isError } = useSupplierProfile(tenantId, supplierId);

    const { data: supplierPayments = [] } = useSupplierPayments(tenantId, supplierId);
    const { data: unpaidDocuments = [] } = useUnpaidDocuments(tenantId, "supplier", supplierId);

    const { mutateAsync: updateSupplier } = useUpdateSupplier(tenantId);
    const { mutateAsync: deleteSupplier, isPending: isDeleting } = useDeleteSupplier(tenantId);
    const { mutateAsync: recordPayment } = useRecordPaymentBatch();
    
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"update" | "delete" | "payment">("update");

    useEffect(() => {
        if (supplier && supplier.purchase_orders.length > 0 && !activeOrderId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveOrderId(supplier.purchase_orders[0].id);
        }
    }, [supplier, activeOrderId]);

    const handleOrderSelect = (orderId: string) => {
        setActiveOrderId(orderId);
        const carouselElement = document.getElementById('po-carousel-section');
        if (carouselElement) {
            carouselElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleOpenUpdate = () => {
        setModalType("update");
        setIsModalOpen(true);
    };

    const handleOpenDelete = () => {
        setModalType("delete");
        setIsModalOpen(true);
    };

    const handleUpdateSubmit = async (data: SupplierFormData) => {
        if (!supplier?.id) return;
        try {
            await updateSupplier({ supplierId: supplier.id, data });
            toast.success("Supplier updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update supplier.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!supplier?.id) return;
        try {
            await deleteSupplier(supplier.id);
            toast.success("Supplier deleted successfully!");
            setIsModalOpen(false);
            // Kick them back to the main list since this page no longer exists
            router.push('/people/suppliers');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete supplier.");
        }
    };

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        try {
            await recordPayment({ tenantId: tenantId, data });
            toast.success("Payment recorded successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to record payment.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (isError || !supplier) {
        return <div className="p-8 text-center text-red-500 font-medium">Failed to load vendor profile.</div>;
    }
    
  return (
    <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-950'>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button 
                    onClick={() => router.back()}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-fit p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Suppliers
                </button>
                
                <div className="flex items-center gap-3">

                    <button
                        onClick={() => { setModalType("payment"); setIsModalOpen(true); }}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 shadow-sm"
                    >
                        <CreditCard className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Record Payment</span>
                    </button>
                    
                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="mr-2 h-4 w-4" /> Statement
                    </button>
                    <button 
                        onClick={handleOpenUpdate}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </button>
                    <button 
                        onClick={handleOpenDelete}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                        <Trash2 className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
                    </button>
                </div>
            </div>

            {/* Profile Card */}
            <SuppliersDetailsCard 
                supplier={supplier} 
                payments={supplierPayments}
            />

            {/* Purchases Table */}
            <SupplierOrdersTable 
                orders={supplier.purchase_orders || []} 
                payments={supplierPayments}
                activeOrderId={activeOrderId} 
                onRowClick={handleOrderSelect} 
            />

            {/* Bottom Section: Side-by-Side Grid Layout */}
            <div id="po-carousel-section" className="mt-4 scroll-mt-24">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Left Side: Purchase Order Viewer */}
                    <div className="xl:col-span-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between h-8">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Purchase Order Viewer</h3>
                        </div>
                        
                        {supplier.purchase_orders && supplier.purchase_orders.length > 0 ? (
                            <div className="h-full">
                                <SupplierPOCarousel 
                                    supplier={supplier}
                                    activeOrderId={activeOrderId}
                                    onOrderChange={handleOrderSelect}
                                />
                            </div>
                        ) : (
                            <div className="h-full w-full min-h-[450px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                No purchase orders found for this vendor.
                            </div>
                        )}
                    </div>

                    {/* Right Side: Wallet Ledger */}
                    <div className="xl:col-span-1 flex flex-col gap-2">
                        {/* Invisible spacer matching the exact 'h-8' height of the left title */}
                        <div className="flex items-center justify-end h-8"></div>
                        <div className="h-full">
                            <WalletLedger 
                                tenantId={tenantId} 
                                entityType="supplier" 
                                entityId={supplierId} 
                            />
                        </div>
                    </div>

                </div>
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "update" ? "Edit Supplier" : modalType === "payment" ? "Record Payment" : ""}
            >
                {modalType === "payment" ? (
                    <PaymentForm
                        tenantId={tenantId}
                        type="create"
                        preselectedEntityType="supplier"
                        preselectedEntityId={supplier.id}
                        availableParties={[{ id: supplier.id, name: supplier.name }]}
                        unpaidDocuments={unpaidDocuments}
                        isModal={true}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handlePaymentSubmit}
                    />
                ) : modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={supplier.name}
                        itemType='Supplier'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <SupplierForm
                        type="update"
                        isModal={true}
                        defaultValues={mapToFormData(supplier)}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
  )
}
