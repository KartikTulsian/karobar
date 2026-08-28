import { InvoiceHeader } from '@/components/billing/InvoiceHeader';
import { InvoiceItemsTable } from '@/components/billing/InvoiceItemsTable';
import { InvoiceParties } from '@/components/billing/InvoiceParties';
import InvoiceReturnsTable from '@/components/billing/InvoiceReturnsTable';
import { InvoiceSummary } from '@/components/billing/InvoiceSummary';
import { useTenant } from '@/hooks/usePeople';
import { useTenantStore } from '@/store/useTenantStore';
import { BillDetail } from '@/types/billing';
import { PaymentBatchSummary } from '@/types/finance';
import { CustomerProfileData, DatabaseBill } from '@/types/people';
import { ChevronLeft, ChevronRight, FileText, Printer, X } from 'lucide-react';
import React from 'react'

interface ExpandedBillModalProps {
    bill: DatabaseBill;
    customer: CustomerProfileData;
    onClose: () => void;
    onNext: (e: React.MouseEvent) => void;
    onPrev: (e: React.MouseEvent) => void;
    payments: PaymentBatchSummary[];
    showProfit?: boolean;
}

export default function ExpandedBillModal({ bill, customer, onClose, onNext, onPrev, payments, showProfit = false }: ExpandedBillModalProps) {

    const activeTenant = useTenantStore((state) => state.activeTenant);
    const { data: tenant } = useTenant(activeTenant?.tenantId || "");
    
    const billDetail: BillDetail = { 
        ...bill,
        total_profit: bill.total_profit || 0,
        payment_method: bill.payment_method || 'cash', // Fallback for null
        bill_line_items: bill.bill_line_items || [],   // Ensure array exists
        vehicle_no: bill.vehicle_no || null,
        reference_name: bill.reference_name || null,
        terms_conditions: bill.terms_conditions || null,
        customers: {
            name: customer.name,
            type: customer.type,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            gstin: customer.gstin || null
        }
    };

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose} // Close modal when clicking the backdrop
        >

            {/* Left Modal Navigation */}
            <button
                onClick={onPrev}
                className="hidden md:flex absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 z-50 hover:scale-110 active:scale-95"
            >
                <ChevronLeft className="h-8 w-8" />
            </button>

            {/* Modal Container */}
            <div
                className="relative bg-white dark:bg-slate-950 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 z-10"
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from triggering backdrop close
            >

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Invoice Details
                    </h3>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Printer className="h-5 w-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body (The Invoice) */}
                <div className="p-8 overflow-y-auto print:shadow-none print:border-none print:p-0">
                    
                    {/* Render live header and parties if tenant loaded, else skeleton */}
                    {tenant ? (
                        <>
                            <InvoiceHeader bill={billDetail} tenant={tenant} />
                            <InvoiceParties bill={billDetail} tenant={tenant} />
                        </>
                    ) : (
                        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-8" />
                    )}

                    <div className="mt-8">
                        <InvoiceItemsTable items={bill.bill_line_items || []} returns={bill.sales_returns || []} isGst={bill.is_gst_bill} isInterstate={bill.is_interstate} showProfit={showProfit} />
                        <InvoiceReturnsTable returns={bill.sales_returns || []} originalItems={bill.bill_line_items || []} />
                        <InvoiceSummary bill={billDetail} payments={payments} showProfit={showProfit}/>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                        {bill.terms_conditions ? (
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                                <p className="whitespace-pre-wrap leading-relaxed">{bill.terms_conditions}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                                <p className="leading-relaxed">Goods once sold will not be taken back or exchanged. Warranty claims are subject to respective manufacturer's approval only. All disputes are subject to local jurisdiction.</p>
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
            </div>

            {/* Right Modal Navigation */}
            <button
                onClick={onNext}
                className="hidden md:flex absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 z-50 hover:scale-110 active:scale-95"
            >
                <ChevronRight className="h-8 w-8" />
            </button>

        </div>
    )
}
