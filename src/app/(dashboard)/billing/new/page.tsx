"use client";

import BillForm from '@/components/billing/BillForm';
import { useCreateBill, useNextBillNumberPreview } from '@/hooks/useBilling';
import { BillFormData } from '@/lib/validations/billSchema';
import { useTenantStore } from '@/store/useTenantStore';
import { ArrowLeft, FileMinus, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react'
import { toast } from 'react-toastify';

export default function CreateBillPage() {

  const router = useRouter();
  const activeTenant = useTenantStore((state) => state.activeTenant);
  const tenantId = activeTenant?.tenantId || "";

  const { data: nextBillPreview } = useNextBillNumberPreview(tenantId, true)

  const { mutateAsync: createBill, isPending } = useCreateBill(tenantId);

  const [billType, setBillType] = useState<"gst" | "non-gst" | null>(null);

  const handleCreateSubmit = async (data: BillFormData) => {
    try {
      const newBill = await createBill(data);
      toast.success("Bill Generated successfully!");
      router.push(`/billing/bills/${newBill.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create bill.");
    }
  };

  if (!billType) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto h-[80vh] justify-center">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Create New Bill</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">What type of invoice would you like to generate today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setBillType('gst')}
            className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-indigo-100 bg-white hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500 text-left"
          >
            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">GST Invoice</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Standard tax invoice with HSN codes, CGST, SGST, and IGST calculations for registered businesses or B2C sales.</p>
            </div>
          </button>

          <button
            onClick={() => setBillType('non-gst')}
            className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-xl hover:shadow-slate-500/10 transition-all dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-500 text-left"
          >
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileMinus className="h-8 w-8 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Bill of Supply (Non-GST)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Simple receipt without tax brackets. Ideal for unregistered entities, exempt goods, or standard cash transactions.</p>
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
          onClick={() => setBillType(null)}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Change Bill Type"
        >
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create {billType === 'gst' ? 'GST Invoice' : 'Non-GST Bill'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Draft a new invoice, add line items, and record payments.
          </p>
        </div>
      </div>

      {/* We pass isModal={false} so the form knows to render its own 
        card background and page-level padding.
      */}
      <BillForm
        type="create"
        tenantId={tenantId}
        isModal={false}
        nextBillPreview={nextBillPreview}
        defaultValues={{
          is_gst_bill: billType === 'gst' // Pass the selection directly into the form!
        }}
        onCancel={() => router.back()}
        onSubmit={handleCreateSubmit}
      />
    </div>
  )
}
