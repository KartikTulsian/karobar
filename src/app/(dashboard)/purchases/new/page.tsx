"use client";

import PurchaseOrderForm from '@/components/purchases/PurchaseOrderForm';
import { useCreatePurchaseOrder, useNextPONumberPreview } from '@/hooks/usePurchases';
import { PurchaseOrderFormData } from '@/lib/validations/purchaseOrderSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { Receipt, FileMinus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react'
import { toast } from 'react-toastify';

export default function CreatePurchaseOrderPage() {

    const router = useRouter();
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const tenantId = activeTenant?.tenantId || "";

    const { mutateAsync: createPO } = useCreatePurchaseOrder(tenantId);

    const { data: nextPoPreview } = useNextPONumberPreview(tenantId, true);
    
    const [poType, setPoType] = useState<"gst" | "non-gst" | null>(null);

    const handleCreateSubmit = async (data: PurchaseOrderFormData) => {
        try {
            const newPO = await createPO(data);
            toast.success("Purchase Order created successfully!");
            // Redirect straight to the beautiful individual PO details page!
            router.push(`/purchases/orders/${newPO.id}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create PO.");
        }
    };

    if (!poType) {
        return (
            <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto h-[80vh] justify-center">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Create Purchase Order</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">What type of purchase order are you raising today?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setPoType('gst')}
                        className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-indigo-100 bg-white hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500 text-left"
                    >
                        <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Receipt className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">GST Purchase Order</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Standard B2B order with GST tracking, allowing you to record CGST, SGST, or IGST applied by the supplier.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setPoType('non-gst')}
                        className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-xl hover:shadow-slate-500/10 transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-500 text-left"
                    >
                        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileMinus className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Non-GST Purchase Order</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Simple purchase order without tax brackets. Ideal for purchasing exempt items or ordering from unregistered suppliers.</p>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-2">
                <button 
                    onClick={() => setPoType(null)} 
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Change PO Type"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Create {poType === 'gst' ? 'GST Purchase Order' : 'Non-GST Purchase Order'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Draft a new order, add items, and request stock from your supplier.
                    </p>
                </div>
            </div>

            {/* The Form in Full-Page Mode */}
            <PurchaseOrderForm
                type="create"
                tenantId={tenantId}
                isModal={false} // Tells the form to render as a full page component, not a modal!
                nextPoPreview={nextPoPreview}
                defaultValues={{
                    is_gst_supply: poType === 'gst' // Passes the selection directly into the form
                }}
                onCancel={() => router.back()}
                onSubmit={handleCreateSubmit}
            />
        </div>
    )
}
