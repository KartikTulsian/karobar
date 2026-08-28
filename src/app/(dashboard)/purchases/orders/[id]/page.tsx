"use client";

import PaymentForm from "@/components/finance/payments/PaymentForm";
import POHeader from "@/components/purchases/POHeader";
import POItemsTable from "@/components/purchases/POItemsTable";
import { POParties } from "@/components/purchases/POParties";
import POReturnsTable from "@/components/purchases/POReturnsTable";
import POSummary from "@/components/purchases/POSummary";
import PurchaseOrderForm from "@/components/purchases/PurchaseOrderForm";
import ActionModal from "@/components/ui/ActionModal";
import { useRecordPaymentBatch, useSupplierPayments } from "@/hooks/useFinance";
import { useNavigation } from "@/hooks/useNavigation";
import { useTenant } from "@/hooks/usePeople";
import { useDeletePurchaseOrder, usePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/usePurchases";
import { PaymentFormData } from "@/lib/validations/paymentSchema";
import { PurchaseOrderFormData } from "@/lib/validations/purchaseOrderSchema";
import { useTenantStore } from "@/store/useTenantStore";
import { PurchaseOrderDetail } from "@/types/purchases";
import { getLocalDateString, mergeDateWithOriginalTime } from "@/lib/utils";
import { ArrowLeft, CreditCard, Download, Edit, Loader2, Printer, Trash2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

const mapPOToFormData = (po: PurchaseOrderDetail | null): Partial<PurchaseOrderFormData> | undefined => {
    if (!po) return undefined;
    return {
        id: po.id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        order_date: getLocalDateString(po.order_date),
        expected_date: po.expected_date ? getLocalDateString(po.expected_date) : po.expected_date,
        received_date: po.received_date ? getLocalDateString(po.received_date) : po.received_date,
        status: po.status,

        // --- ADDED MISSING FIELDS ---
        is_gst_supply: po.is_gst_supply,
        payment_status: po.payment_status,
        payment_method: po.payment_method || "cash",
        // ----------------------------

        is_interstate: po.is_interstate,
        subtotal: po.subtotal,
        round_off: po.round_off,
        discount_amount: po.discount_amount,
        cgst_total: po.cgst_total,
        sgst_total: po.sgst_total,
        igst_total: po.igst_total,
        total_amount: po.total_amount,
        amount_paid: po.amount_paid,
        amount_due: po.amount_due,
        notes: po.notes || "",
        vehicle_no: po.vehicle_no || "",
        reference_name: po.reference_name || "",
        terms_conditions: po.terms_conditions || "",


        // Explicitly map line items to ensure new tax/discount fields aren't lost
        po_line_items: po.po_line_items?.map(item => ({
            id: item.id,
            item_id: item.item_id,
            item_name: item.item_name,
            hsn_code: item.hsn_code,
            unit: item.unit,
            qty_ordered: item.qty_ordered,
            qty_received: item.qty_received,
            unit_cost: item.unit_cost,
            batch_sell_price: item.batch_sell_price || item.unit_cost || 0,
            discount_pct: item.discount_pct,
            gst_rate: item.gst_rate,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
            line_total: item.line_total,
            sort_order: item.sort_order,
        })) || [],
    };
};

export default function PurchaseOrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const poId = params.id as string;
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";
    const { mutateAsync: recordPayment } = useRecordPaymentBatch();

    const { data: po, isLoading, isError } = usePurchaseOrder(tenantId, poId);

    const { data: supplierPayments = [] } = useSupplierPayments(tenantId, po?.supplier_id ?? "");

    const { data: tenant, isLoading: isTenantLoading, isError: isTenantError } = useTenant(tenantId);

    // Authorization
    const { currentRole } = useNavigation();

    // Mutations
    const { mutateAsync: updatePO } = useUpdatePurchaseOrder(tenantId);
    const { mutateAsync: deletePO, isPending: isDeleting } = useDeletePurchaseOrder(tenantId);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"update" | "delete" | "payment">("update");

    // Handlers
    const handleUpdateSubmit = async (data: PurchaseOrderFormData) => {
        try {
            await updatePO({
                poId,
                data: {
                    ...data,
                    order_date: mergeDateWithOriginalTime(data.order_date, po?.order_date),
                },
            });
            toast.success("Purchase Order updated successfully!");
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update PO.");
        }
    };

    const handleDeleteSubmit = async () => {
        try {
            await deletePO(poId);
            toast.success("Purchase Order deleted successfully!");
            router.push('/purchases/orders');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete PO.");
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

    if (isLoading || isTenantLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (isError || !po || isTenantError || !tenant) {
        return <div className="p-8 text-center text-red-500 font-medium">Failed to load purchase order details.</div>;
    }

    const isCancelled = po?.status === 'cancelled';

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            {/* Top Navigation & Actions (Hidden during printing) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
                </button>

                <div className="flex items-center gap-3">

                    {(po.amount_due > 0 && po.status != "draft") && (
                        <button
                            onClick={() => { setModalType("payment"); setIsModalOpen(true); }}
                            className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 shadow-sm"
                        >
                            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                        </button>
                    )}
                    {currentRole === "owner" && (
                        <div className="flex gap-2 mr-2">
                            <button
                                onClick={() => { setModalType("update"); setIsModalOpen(true); }}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                            >
                                <Edit className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Edit PO</span>
                            </button>

                            <button
                                onClick={() => { setModalType("delete"); setIsModalOpen(true); }}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-red-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-slate-700"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
                            </button>
                        </div>
                    )}

                    <button className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Download className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm"
                    >
                        <Printer className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Print PO</span>
                    </button>
                </div>
            </div>

            {/* The Main Printable Canvas */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-12 print:shadow-none print:border-none print:p-0">
                {/* Header Section */}
                <POHeader po={po} tenant={tenant} />
                {/* Sub-components rendering the data */}
                <POParties po={po} tenant={tenant} />
                <POItemsTable 
                    items={po.po_line_items} 
                    returns={po.purchase_returns} 
                    isGst={po.is_gst_supply} 
                    isInterstate={po.is_interstate} 
                />
                <POReturnsTable returns={po.purchase_returns || []} originalItems={po.po_line_items} />
                <POSummary po={po} payments={supplierPayments}/>

                {/* Footer Notes */}
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                    
                    {/* Render Custom Terms if they exist, otherwise fallback to Default */}
                    {po.terms_conditions ? (
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Purchase Order Terms</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{po.terms_conditions}</p>
                        </div>
                    ) : (
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Purchase Order Terms</p>
                            <p className="leading-relaxed">Please deliver items by the expected delivery date. All goods are subject to inspection upon arrival. Defective or incorrect items will be returned at the vendor&apos;s expense.</p>
                        </div>
                    )}

                    {po.notes && (
                        <div className="mt-5">
                            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Notes to Vendor</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{po.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === "update" ? "Edit Purchase Order" : modalType === "delete" ? "Delete Purchase Order" : "Record Payment"}
            >
                {modalType === "payment" ? (
                    <PaymentForm
                        tenantId={tenantId}
                        type="create"
                        preselectedEntityType="supplier"
                        preselectedEntityId={po.supplier_id}
                        availableParties={[{ id: po.supplier_id, name: po.suppliers?.name || "Supplier" }]}
                        unpaidDocuments={[{
                            id: po.id,
                            document_number: po.po_number,
                            document_date: getLocalDateString(po.order_date),
                            amount_due: po.amount_due
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
                                    {isCancelled ? "Permanently Delete Purchase Order?" : "Cancel this Purchase Order?"}
                                </h3>
                                <p className={`text-sm mt-2 leading-relaxed ${isCancelled ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                    {isCancelled 
                                        ? "This purchase order has already been cancelled. Deleting it now will permanently wipe it from the database history. This action cannot be undone."
                                        : "Cancelling this purchase order will immediately revert the received items back out of your inventory and adjust the supplier's outstanding balance. The record will remain visible but marked as 'Cancelled'."
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
                                {isCancelled ? "Yes, Hard Delete" : "Yes, Cancel PO"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <PurchaseOrderForm
                        type="update"
                        tenantId={tenantId}
                        isModal={true}
                        defaultValues={mapPOToFormData(po)}
                        onCancel={() => setIsModalOpen(false)}
                        onSubmit={handleUpdateSubmit}
                    />
                )}
            </ActionModal>
        </div>
    );
}
