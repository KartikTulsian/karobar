"use client";

import DeleteConfirmForm from '@/components/common/DeleteConfirmForm';
import PaymentForm from '@/components/finance/payments/PaymentForm';
import BillCarousel from '@/components/people/customers/BillCarousel';
import CustomerBillsTable from '@/components/people/customers/CustomerBillsTable';
import CustomerDetailsCard from '@/components/people/customers/CustomerDetailsCard';
import CustomerForm from '@/components/people/customers/CustomerForm';
import WalletLedger from '@/components/people/customers/WalletLedger';
import ActionModal from '@/components/ui/ActionModal';
import { useCustomerPayments, useRecordPaymentBatch, useUnpaidDocuments } from '@/hooks/useFinance';
import { useNavigation } from '@/hooks/useNavigation';
import { useCustomerProfile, useDeleteCustomer, useUpdateCustomer } from '@/hooks/usePeople';
import { CustomerFormData } from '@/lib/validations/customerSchema';
import { PaymentFormData } from '@/lib/validations/paymentSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { CustomerProfileData } from '@/types/people';
import { ArrowLeft, CreditCard, Download, Edit, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify';

const mapToFormData = (customer: CustomerProfileData | undefined): Partial<CustomerFormData> | undefined => {
    if (!customer) return undefined;
    return {
        id: customer.id,
        name: customer.name,
        company_name: customer.company_name || "",
        country_code: customer.country_code || "",
        phone: customer.phone || "",
        email: customer.email || "",
        type: customer.type,
        gstin: customer.gstin || "",
        address: customer.address || "",
        city: customer.city || "",
        state_code: customer.state_code || "",
        pincode: customer.pincode || "",
        country: customer.country || "",
        credit_limit: customer.credit_limit || 0,
        notes: customer.notes || "",
    };
};

export default function IndividualCustomerPage() {

    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;
    const { currentRole } = useNavigation();

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const { data: customer, isLoading, isError } = useCustomerProfile(tenantId, customerId);
    const { data: customerPayments = [] } = useCustomerPayments(tenantId, customerId);
    const { data: unpaidDocuments = [] } = useUnpaidDocuments(tenantId, "customer", customerId);

    const { mutateAsync: updateCustomer } = useUpdateCustomer(tenantId);
    const { mutateAsync: deleteCustomer, isPending: isDeleting } = useDeleteCustomer(tenantId);

    const { mutateAsync: recordPayment } = useRecordPaymentBatch();

    // This tracks which bill the user wants to view in the bottom carousel
    const [activeBillId, setActiveBillId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"update" | "delete" | "payment">("update");

    const [showProfit, setShowProfit] = useState(false);
    // const customerPayments = allPayments.filter(p => p.flow_type === 'in' && p.entity_id === customerId);

    useEffect(() => {
        if (customer && customer.bills && customer.bills.length > 0 && !activeBillId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveBillId(customer.bills[0].id);
        }
    }, [customer, activeBillId]);

    // Handler triggered when a row in the Bills Table is clicked
    const handleBillSelect = (billId: string) => {
        setActiveBillId(billId);
        const carouselElement = document.getElementById('bill-carousel-section');
        if (carouselElement) {
            carouselElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const handleUpdateSubmit = async (data: CustomerFormData) => {
        if (!customer?.id) return;
        try {
            await updateCustomer({ customerId: customer.id, data });
            toast.success("Customer updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update customer.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!customer?.id) return;
        try {
            await deleteCustomer(customer.id);
            toast.success("Customer deleted successfully!");
            setIsModalOpen(false);
            // Kick them back to the main list since this page no longer exists
            router.push('/people/customers');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete customer.");
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
        )
    }

    if (isError || !customer) {
        return <div className="p-8 text-center text-red-500 font-medium">Failed to load customer profile.</div>;
    }

    const isFlyingCustomer = customer.type === 'flying';

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-950'>
            {/* 1. Header & Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
                </button>

                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isFlyingCustomer ? "Walk-in History" : "Customer Profile"}
                    </h1>
                </div>

                {/* Only show Action buttons for registered customers */}
                {!isFlyingCustomer && (
                    <div className="flex items-center gap-3">
                        {currentRole === "owner" && (
                            <button
                                onClick={() => setShowProfit(!showProfit)}
                                className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                                    showProfit 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                                title={showProfit ? "Hide Margins" : "Analyze Margins"}
                            >
                                {showProfit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        )}
                        <button
                            onClick={() => { setModalType("payment"); setIsModalOpen(true); }}
                            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 shadow-sm"
                        >
                            <CreditCard className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Record Payment</span>
                        </button>
                        
                        <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Download className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Statement</span>
                        </button>
                        <button 
                            onClick={handleOpenUpdate}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                        >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </button>
                        <button 
                            onClick={handleOpenDelete}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 shadow-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                        >
                            <Trash2 className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
                        </button>
                    </div>
                )}

            </div>

            {/* Smart Rendering: Only show details card if registered */}
            {/* {!isFlyingCustomer && (
                <CustomerDetailsCard customer={customer} />
            )} */}

            <CustomerDetailsCard 
                customer={customer}
                payments={customerPayments} 
                showProfit={showProfit}
            />

            {/* Bills Table is always shown */}
            <CustomerBillsTable 
                bills={customer.bills || []} 
                payments={customerPayments}
                activeBillId={activeBillId} 
                onRowClick={handleBillSelect} 
                showProfit={showProfit}
            />

            {/* Bottom Section: Side-by-Side Grid Layout */}
            <div id="bill-carousel-section" className="mt-4 scroll-mt-24">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Left Side: Invoice Viewer */}
                    <div className="xl:col-span-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between h-8">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Invoice Viewer</h3>
                        </div>
                        
                        {customer.bills && customer.bills.length > 0 ? (
                            <div className="h-full">
                                <BillCarousel 
                                    customer={customer}
                                    activeBillId={activeBillId}
                                    onBillChange={(id) => setActiveBillId(id)}
                                    payments={customerPayments}
                                    showProfit={showProfit}
                                />
                            </div>
                        ) : (
                            <div className="h-full w-full min-h-[450px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                No invoices found for this customer.
                            </div>
                        )}
                    </div>

                    {/* Right Side: Wallet Ledger */}
                    <div className="xl:col-span-1 flex flex-col gap-2">
                        <div className="flex items-center justify-end h-8">
                        </div>
                        <div className="h-full">
                            <WalletLedger 
                                tenantId={tenantId} 
                                entityType="customer" 
                                entityId={customerId} 
                            />
                        </div>
                    </div>

                </div>
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "update" ? "Edit Customer" : modalType === "payment" ? "Record Payment" : ""}
            >
                {modalType === "payment" ? (
                    <PaymentForm
                        tenantId={tenantId}
                        type="create"
                        preselectedEntityType="customer"
                        preselectedEntityId={customer.id}
                        availableParties={[{ id: customer.id, name: customer.name }]}
                        unpaidDocuments={unpaidDocuments}
                        isModal={true}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handlePaymentSubmit}
                    />
                ) : modalType === "delete" ? (
                    <DeleteConfirmForm
                        itemName={customer.name}
                        itemType='Customer'
                        isDeleting={isDeleting}
                        onCancel={() => setIsModalOpen(false)}
                        onConfirm={handleDeleteSubmit}
                    />
                ) : (
                    <CustomerForm
                        type="update"
                        isModal={true}
                        defaultValues={mapToFormData(customer)}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
    );
}
