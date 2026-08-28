"use client";

import PaymentForm from '@/components/finance/payments/PaymentForm';
import PaymentsControlPanel from '@/components/finance/payments/PaymentsControlPanel';
import PaymentsTable from '@/components/finance/payments/PaymentsTable';
import ActionModal from '@/components/ui/ActionModal';
import { useDeletePaymentBatch, usePaymentBatches, useRecordPaymentBatch, useUnpaidDocuments, useUpdatePaymentBatch } from '@/hooks/useFinance';
import { useCustomers, useSuppliers } from '@/hooks/usePeople';
import { PaymentFormData } from '@/lib/validations/paymentSchema';
import { getLocalDateString, isSameLocalDate } from '@/lib/utils';
import { useTenantStore } from '@/store/useTenantStore';
import { PartyOption, PaymentBatchSummary } from '@/types/finance';
import { Customer, Supplier } from '@/types/people';
import { CreditCard, FileText, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react'
import { toast } from 'react-toastify';

const mapToFormData = (batch: PaymentBatchSummary | null): Partial<PaymentFormData> | undefined => {
    if (!batch) return undefined;
    return {
        entity_type: batch.flow_type === 'in' ? 'customer' : 'supplier',
        entity_id: batch.entity_id,
        total_amount: batch.total_amount,
        paid_at: getLocalDateString(batch.paid_at),
        method: batch.method,
        reference_no: batch.reference_no || "",
        status: batch.status || "sanctioned",
        allocations: [], // Form will auto-fetch unpaid documents to re-allocate
    };
};

export default function PaymentsPage() {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');
    const [paymentMode, setPaymentMode] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    const { data: paymentBatches = [], isLoading, isError } = usePaymentBatches(tenantId);
    const { data: customers = [] } = useCustomers(tenantId) as { data: Customer[] | undefined };
    const { data: suppliers = [] } = useSuppliers(tenantId) as { data: Supplier[] | undefined };

    const { mutateAsync: createPayment } = useRecordPaymentBatch();
    const { mutateAsync: updatePayment } = useUpdatePaymentBatch();
    const { mutateAsync: deletePayment, isPending: isDeleting } = useDeletePaymentBatch();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"create" | "update" | "delete">("create");
    const [selectedBatch, setSelectedBatch] = useState<PaymentBatchSummary | null>(null);

    const [activeEntityType, setActiveEntityType] = useState<"customer" | "supplier">("customer");
    const [activeEntityId, setActiveEntityId] = useState<string>("");

    const { data: unpaidDocuments = [] } = useUnpaidDocuments(tenantId, activeEntityType, activeEntityId);

    // 5. Transform People data for the dropdowns
    const availableParties: PartyOption[] = activeEntityType === 'customer'
        ? (customers || []).map((c) => ({ id: c.id, name: c.name }))
        : (suppliers || []).map((s) => ({ id: s.id, name: s.name }));

    const filteredData = paymentBatches.filter(payment => {
        const matchesSearch = payment.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              payment.receipt_batch_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = selectedTab === 'all' || payment.flow_type === selectedTab;
        const matchesMode = paymentMode === 'all' || payment.method === paymentMode;
        const matchesDate = dateFilter === '' || isSameLocalDate(payment.paid_at, dateFilter);
        
        return matchesSearch && matchesTab && matchesMode && matchesDate;
    });

    const handleRecordPayment = () => {
        setModalType("create");
        setSelectedBatch(null);
        setActiveEntityId(""); // Reset the dynamic fetcher
        setIsModalOpen(true);
    };

    const handleOpenUpdate = (batch: PaymentBatchSummary) => {
        setModalType("update");
        setSelectedBatch(batch);
        const entityType = batch.flow_type === 'in' ? 'customer' : 'supplier';
        setActiveEntityType(entityType);
        setActiveEntityId(batch.entity_id);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (batch: PaymentBatchSummary) => {
        setModalType("delete");
        setSelectedBatch(batch);
        setIsModalOpen(true);
    };

    // Callback so the Form can trigger document fetching when the user selects someone
    const handleEntityChange = (entityType: "customer" | "supplier", entityId: string) => {
        setActiveEntityType(entityType);
        setActiveEntityId(entityId);
    };

    // --- SUBMIT ACTIONS ---
    const handleCreateSubmit = async (data: PaymentFormData) => {
        try {
            await createPayment({ tenantId: tenantId, data });
            toast.success("Payment recorded successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to record payment.");
        }
    };

    const handleUpdateSubmit = async (data: PaymentFormData) => {
        if (!selectedBatch?.receipt_batch_id) return;
        try {
            await updatePayment({ tenantId: tenantId, batchId: selectedBatch.receipt_batch_id, data });
            toast.success("Payment updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update payment.");
        }
    };

    const handleDeleteSubmit = async () => {
        if (!selectedBatch?.receipt_batch_id) return;
        try {
            const entityType = selectedBatch.flow_type === 'in' ? 'customer' : 'supplier';
            await deletePayment({
                tenantId: tenantId,
                batchId: selectedBatch.receipt_batch_id,
                entityType: entityType,
                entityId: selectedBatch.entity_id
            });
            toast.success("Payment deleted successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete payment.");
        }
    };

    const today = new Date();
    const todayDateStr = getLocalDateString(today.toISOString());

    const totalCollectedToday = paymentBatches
        .filter(p => p.flow_type === 'in' && isSameLocalDate(p.paid_at, todayDateStr))
        .reduce((sum, p) => sum + Number(p.total_amount), 0);

    const isCancelled = selectedBatch?.status === 'cancelled';

    return (
        <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900'>

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments & Receipts</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage incoming and outgoing bill payments.</p>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-slate-700 px-5 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:text-emerald-400 dark:bg-slate-800 dark:border-emerald-300 dark:border-2">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-white">Total Collected Today</p>
                        <p className="text-2xl font-black text-indigo-700 dark:text-emerald-400">₹{totalCollectedToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            <PaymentsControlPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                paymentMode={paymentMode}
                setPaymentMode={setPaymentMode}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                onRecordPayment={handleRecordPayment}
            />

            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                    <span className="text-sm font-medium text-slate-500">Loading payments...</span>
                </div>
            ) : isError ? (
                <div className="flex h-64 items-center justify-center text-red-500 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    Failed to load payments data.
                </div>
            ) : filteredData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <span className="text-sm font-medium">No payments found.</span>
                </div>
            ) : (
                <PaymentsTable
                    data={filteredData}
                    onEdit={handleOpenUpdate}
                    onDelete={handleOpenDelete}
                />
            )}

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "create" ? "Record Payment" : modalType === "update" ? "Edit Payment" : ""}
            >
                {modalType === "delete" ? (

                    <div className="flex flex-col gap-6 p-2">
                        <div className={`flex items-start gap-4 p-4 rounded-xl border ${isCancelled ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                            {isCancelled ? <Trash2 className="h-6 w-6 text-red-600 mt-1 shrink-0" /> : <XCircle className="h-6 w-6 text-amber-600 mt-1 shrink-0" />}
                            <div>
                                <h3 className={`text-lg font-bold ${isCancelled ? 'text-red-900 dark:text-red-300' : 'text-amber-900 dark:text-amber-300'}`}>
                                    {isCancelled ? "Permanently Delete Payment?" : "Cancel this Payment?"}
                                </h3>
                                <p className={`text-sm mt-2 leading-relaxed ${isCancelled ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {isCancelled 
                                        ? "This payment has already been cancelled. Deleting it now will permanently wipe it from the database history. This action cannot be undone."
                                        : "Cancelling this payment will immediately revert the paid amounts on all associated bills and pull the funds out of the cash book. The record will remain visible but marked as 'Cancelled'."
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={isDeleting}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleDeleteSubmit}
                                disabled={isDeleting}
                                className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-md transition-all disabled:opacity-70 ${isCancelled ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                                {isCancelled ? "Yes, Hard Delete" : "Yes, Cancel Payment"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <PaymentForm
                        tenantId={tenantId}
                        type={modalType}
                        isModal={true}
                        availableParties={availableParties}
                        unpaidDocuments={unpaidDocuments}
                        defaultValues={modalType === "update" ? mapToFormData(selectedBatch) : undefined}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={modalType === "create" ? handleCreateSubmit : handleUpdateSubmit}
                        onEntityChange={handleEntityChange}
                    />
                )}
            </ActionModal>

        </div>
    )
}
