import POHeader from '@/components/purchases/POHeader';
import POItemsTable from '@/components/purchases/POItemsTable';
import { POParties } from '@/components/purchases/POParties';
import POReturnsTable from '@/components/purchases/POReturnsTable';
import POSummary from '@/components/purchases/POSummary';
import { useTenant } from '@/hooks/usePeople';
import { useTenantStore } from '@/store/useTenantStore';
import { SupplierPOSummary, SupplierProfileData } from '@/types/people'
import { PurchaseOrderDetail } from '@/types/purchases';
import { ChevronLeft, FileText, Printer, X, ChevronRight } from 'lucide-react';
import React from 'react'

interface ExpandedPOModalProps {
    order: SupplierPOSummary;
    supplier: SupplierProfileData;
    onClose: () => void;
    onNext: (e: React.MouseEvent) => void;
    onPrev: (e: React.MouseEvent) => void;
}

export default function ExpandedPOModal({ order, supplier, onClose, onNext, onPrev }: ExpandedPOModalProps) {
    
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const { data: tenant } = useTenant(activeTenant?.tenantId || "");
    
    const poDetail: PurchaseOrderDetail = {
        ...order,
        po_line_items: order.po_line_items || [],
        purchase_returns: order.purchase_returns || [],
        suppliers: {
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email,
            address: supplier.address,
            gstin: supplier.gstin
        }
    };
    
    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onPrev}
                className="hidden md:flex absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 z-50 hover:scale-110 active:scale-95"
            >
                <ChevronLeft className="h-8 w-8" />
            </button>

            <div
                className="relative bg-white dark:bg-slate-950 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Purchase Order Details
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

                <div className="p-8 overflow-y-auto print:shadow-none print:border-none print:p-0">
                    
                    {/* Render live header and parties if tenant loaded, else skeleton */}
                    {tenant ? (
                        <>
                            <POHeader po={poDetail} tenant={tenant} />
                            <POParties po={poDetail} tenant={tenant} />
                        </>
                    ) : (
                        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-8" />
                    )}

                    <div className="mt-8">
                        <POItemsTable 
                            items={order.po_line_items || []} 
                            returns={order.purchase_returns || []} 
                            isGst={order.is_gst_supply}
                            isInterstate={order.is_interstate}
                        />
                        <POReturnsTable 
                            returns={order.purchase_returns || []} 
                            originalItems={order.po_line_items || []} 
                        />
                        <POSummary po={poDetail} />
                    </div>

                    {/* Terms and Notes */}
                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                        {order.terms_conditions ? (
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                                <p className="whitespace-pre-wrap leading-relaxed">{order.terms_conditions}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Terms & Conditions</p>
                                <p className="leading-relaxed">Subject to standard vendor terms. Please notify immediately in case of discrepancies.</p>
                            </div>
                        )}

                        {order.notes && (
                            <div className="mt-5">
                                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wider">Additional Notes</p>
                                <p className="whitespace-pre-wrap leading-relaxed">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={onNext}
                className="hidden md:flex absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 z-50 hover:scale-110 active:scale-95"
            >
                <ChevronRight className="h-8 w-8" />
            </button>
        </div>
    )
}
