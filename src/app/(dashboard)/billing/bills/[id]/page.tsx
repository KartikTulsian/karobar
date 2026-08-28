"use client";

import BillForm from '@/components/billing/BillForm';
import { InvoiceHeader } from '@/components/billing/InvoiceHeader';
import { InvoiceItemsTable } from '@/components/billing/InvoiceItemsTable';
import { InvoiceParties } from '@/components/billing/InvoiceParties';
import InvoiceReturnsTable from '@/components/billing/InvoiceReturnsTable';
import { InvoiceSummary } from '@/components/billing/InvoiceSummary';
import PaymentForm from '@/components/finance/payments/PaymentForm';
import ActionModal from '@/components/ui/ActionModal';
import { useBill, useDeleteBill, useUpdateBill } from '@/hooks/useBilling';
import { useCustomerPayments, useRecordPaymentBatch } from '@/hooks/useFinance';
import { useNavigation } from '@/hooks/useNavigation';
import { useTenant } from '@/hooks/usePeople';
import { BillFormData } from '@/lib/validations/billSchema';
import { PaymentFormData } from '@/lib/validations/paymentSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { BillDetail } from '@/types/billing';
import { getLocalDateString, mergeDateWithOriginalTime } from '@/lib/utils';
import { ArrowLeft, CreditCard, Download, Edit, Eye, EyeOff, Loader2, Printer, Trash2, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

const mapBillToFormData = (bill: BillDetail | null): Partial<BillFormData> | undefined => {
    if (!bill) return undefined;
    return {
        id: bill.id,
        bill_number: bill.bill_number,
        customer_id: bill.customer_id,
        customer_type: bill.customers?.type || "registered",
        customer_name: bill.customers?.type === "flying" ? bill.customers.name : undefined,
        customer_phone: bill.customers?.phone || undefined,
        bill_date: getLocalDateString(bill.bill_date),
        due_date: bill.due_date ? getLocalDateString(bill.due_date) : undefined,
        status: bill.status,
        payment_method: bill.payment_method,
        is_gst_bill: bill.is_gst_bill,
        is_interstate: bill.is_interstate,
        amount_paid: bill.amount_paid,
        round_off: bill.round_off,
        discount_amount: bill.discount_amount,
        total_profit: bill.total_profit || 0,
        notes: bill.notes || "",
        vehicle_no: bill.vehicle_no || "",
        reference_name: bill.reference_name || "",
        terms_conditions: bill.terms_conditions || "",
        bill_line_items: bill.bill_line_items.map(item => ({
            id: item.id,
            item_id: item.item_id,
            item_name: item.item_name,
            hsn_code: item.hsn_code,
            unit: item.unit,
            qty: item.qty,
            unit_price: item.unit_price,
            total_buy_price: item.total_buy_price || 0,
            line_profit: item.line_profit || 0,
            discount_pct: item.discount_pct,
            gst_rate: item.gst_rate,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
            line_total: item.line_total,
            sort_order: item.sort_order,
            batch_allocations: item.batch_allocations || [],
            write_off_recovery: item.write_off_recovery || 0,
        }))
    };
};

export default function BillDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const billId = params.id as string;
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const { mutateAsync: recordPayment } = useRecordPaymentBatch();

    const { data: bill, isLoading: isBillLoading, isError: isBillError } = useBill(tenantId, billId);
    const { data: tenant, isLoading: isTenantLoading, isError: isTenantError } = useTenant(tenantId);
    const { data: customerPayments = [] } = useCustomerPayments(tenantId, bill?.customer_id ?? "");
    
    const { currentRole } = useNavigation();

    // Mutations
    const { mutateAsync: updateBill } = useUpdateBill(tenantId);
    const { mutateAsync: deleteBill, isPending: isDeleting } = useDeleteBill(tenantId);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"update" | "delete" | "payment">("update");

    const [showProfit, setShowProfit] = useState(false);

    const handleUpdateSubmit = async (data: BillFormData) => {
        try {
            await updateBill({
                billId,
                data: {
                    ...data,
                    bill_date: mergeDateWithOriginalTime(data.bill_date, bill?.bill_date),
                },
            });
            toast.success("Bill updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update bill.");
        }
    }

    const handleDeleteSubmit = async () => {
        try {
            await deleteBill(billId);
            toast.success("Bill deleted successfully!");
            router.push('/billing/bills'); // Redirect back to list after deletion
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete bill.");
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

    if (isBillLoading || isTenantLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Update error state
    if (isBillError || !bill || isTenantError || !tenant) {
        return <div className="p-8 text-center text-red-500 font-medium">Failed to load document details.</div>;
    }

    const isCancelled = bill?.status === 'cancelled';
    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
                </button>

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
                    {(bill.amount_due > 0 && bill.status != "draft") && (
                        <button
                            onClick={() => { setModalType("payment"); setIsModalOpen(true); }}
                            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 shadow-sm"
                        >
                            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                        </button>
                    )}

                    {currentRole === "owner" && (
                        <div className='flex gap-3'>
                            <button
                                onClick={() => { setModalType("update"); setIsModalOpen(true); }}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                            >
                                <Edit className="mr-2 h-4 w-4" /> Edit Invoice
                            </button>

                            <button
                                onClick={() => { setModalType("delete"); setIsModalOpen(true); }}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-red-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-slate-700"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </button>
                        </div>
                    )}

                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                        <Download className="mr-2 h-4 w-4" /> PDF
                    </button>
                    <button onClick={() => window.print()} className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </button>
                </div>
            </div>

            {/* The Main Printable Invoice Canvas */}
            {/* The 'print:shadow-none print:border-none' classes ensure it looks clean on paper */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-12 print:shadow-none print:border-none print:p-0">
                {/* Header Section */}
                <InvoiceHeader bill={bill} tenant={tenant} />
                <InvoiceParties bill={bill} tenant={tenant} />
                <InvoiceItemsTable
                    items={bill.bill_line_items}
                    returns={bill.sales_returns}
                    isGst={bill.is_gst_bill}
                    isInterstate={bill.is_interstate}
                    showProfit={showProfit}
                />
                <InvoiceReturnsTable returns={bill.sales_returns || []} originalItems={bill.bill_line_items} />
                <InvoiceSummary 
                    bill={bill} 
                    payments={customerPayments}
                    showProfit={showProfit}
                />

                {/* Footer Notes */}
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                    
                    {/* Render Custom Terms if they exist, otherwise fallback to Default Retail Terms */}
                    {bill.terms_conditions ? (
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{bill.terms_conditions}</p>
                        </div>
                    ) : (
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                            <p className="leading-relaxed">Goods once sold will not be taken back or exchanged. Warranty claims are subject to respective manufacturer&apos;s approval only. All disputes are subject to local jurisdiction.</p>
                        </div>
                    )}

                    {bill.notes && (
                        <div className="mt-5">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Additional Notes</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{bill.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "update" ? "Edit Bill" : modalType === "delete" ? "Delete Bill" : "Record Payment"}
            >
                {modalType === "payment" ? (
                    <PaymentForm
                        tenantId={tenant.id}
                        type="create"
                        preselectedEntityType="customer"
                        preselectedEntityId={bill.customer_id}
                        availableParties={[{ id: bill.customer_id, name: bill.customers?.name || "Customer" }]}
                        unpaidDocuments={[{
                            id: bill.id,
                            document_number: bill.bill_number,
                            document_date: getLocalDateString(bill.bill_date),
                            amount_due: bill.amount_due
                        }]}
                        isModal={true}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handlePaymentSubmit}
                    />
                ) : modalType === "delete" ? (
                    <div className="flex flex-col gap-6 p-2">
                        <div className={`flex items-start gap-4 p-4 rounded-xl border ${isCancelled ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                            {isCancelled ? <Trash2 className="h-6 w-6 text-red-600 mt-1 shrink-0" /> : <XCircle className="h-6 w-6 text-amber-600 mt-1 shrink-0" />}
                            <div>
                                <h3 className={`text-lg font-bold ${isCancelled ? 'text-red-900 dark:text-red-300' : 'text-amber-900 dark:text-amber-300'}`}>
                                    {isCancelled ? "Permanently Delete Invoice?" : "Cancel this Invoice?"}
                                </h3>
                                <p className={`text-sm mt-2 leading-relaxed ${isCancelled ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {isCancelled 
                                        ? "This invoice has already been cancelled. Deleting it now will permanently wipe it from the database history. This action cannot be undone."
                                        : "Cancelling this invoice will immediately revert the sold items back into your inventory, remove the revenue from your P&L reports, and adjust the customer's outstanding balance. The record will remain visible but marked as 'Cancelled'."
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
                                {isCancelled ? "Yes, Hard Delete" : "Yes, Cancel Invoice"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <BillForm
                        type="update"
                        tenantId={tenantId}
                        isModal={true}
                        defaultValues={mapBillToFormData(bill)}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div >
    );
}
