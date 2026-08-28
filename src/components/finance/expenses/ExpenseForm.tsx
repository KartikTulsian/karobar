"use client";

import DeferredImageUploader from '@/components/common/DeferredImageUploader';
import InputField from '@/components/common/InputField';
import { ExpenseFormData, expenseSchema } from '@/lib/validations/expenseSchema';
import { ExpenseCategory } from '@/types/finance';
import { zodResolver } from '@hookform/resolvers/zod';
import { Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Path, Resolver, useForm } from 'react-hook-form';
import { getLocalDateString } from '@/lib/utils';

interface ExpenseFormProps {
    type: "create" | "update";
    defaultValues?: Partial<ExpenseFormData>;
    categories: ExpenseCategory[];
    tenantId: string;
    isModal?: boolean;
    onCancel: () => void;
    onSubmit: (data: ExpenseFormData) => void;
}

export default function ExpenseForm({ type, defaultValues, categories, tenantId, isModal = false, onCancel, onSubmit }: ExpenseFormProps) {

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema) as Resolver<ExpenseFormData>,
        defaultValues: {
            amount: 0,
            expense_date: getLocalDateString(new Date().toISOString()),
            category_id: "",
            payment_method: "cash",
            description: "",
            ...defaultValues
        }
    });

    const selectedCategory = watch("category_id");
    // const currentReceiptUrl = watch("receipt_url");

    const amountReg = register("amount", { valueAsNumber: true });

    const [receipts, setReceipts] = useState<(File | string)[]>(
        defaultValues?.receipt_url ? [defaultValues.receipt_url] : []
    );
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);

    const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
        e.currentTarget.blur();
    };

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: Path<ExpenseFormData>,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            setValue(fieldName, fallback, { shouldValidate: true });
        }
        rhfBlur(e);
    };

    const handleFormSubmit = async (data: ExpenseFormData) => {
        setIsUploadingFiles(true);
        try {
            // Pre-generate the ID for perfect Cloudflare R2 folder mapping
            const finalExpenseId = type === "create" ? crypto.randomUUID() : defaultValues!.id!;
            let finalReceiptUrl: string | null = null;

            if (receipts.length > 0) {
                const img = receipts[0]; // Expenses only allow 1 receipt
                if (typeof img === "string") {
                    finalReceiptUrl = img; // Keep existing image
                } else if (img instanceof File) {
                    // Upload new image
                    const presignRes = await fetch("/api/upload/presign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: img.name,
                            contentType: img.type,
                            category: "expense_receipt",
                            tenantId: tenantId,
                            entityId: finalExpenseId
                        })
                    });

                    if (!presignRes.ok) throw new Error("Failed to get upload authorization");
                    const { uploadUrl, publicUrl } = await presignRes.json();

                    // Direct PUT to Cloudflare R2
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        headers: { "Content-Type": img.type },
                        body: img,
                    });

                    if (!uploadRes.ok) throw new Error("Failed to upload receipt");

                    finalReceiptUrl = publicUrl;
                }
            }

            // Inject the generated ID and final URL into the payload
            const finalData = {
                ...data,
                id: finalExpenseId, // Passed to Postgres
                description: data.description?.trim() || null,
                receipt_url: finalReceiptUrl
            } as ExpenseFormData;

            await onSubmit(finalData);

        } catch (error) {
            console.error("Upload Error:", error);
            alert("Failed to upload receipt. Please try again.");
        } finally {
            setIsUploadingFiles(false);
        }
    };

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50";

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className={containerClass}>

            {/* SECTION 1: EXPENSE DETAILS */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <Wallet className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Expense Details</h3>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">

                    <div className="flex w-full flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (₹) *</label>
                        <input
                            type="number" step="0.01" min="0"
                            placeholder="0.00"
                            {...amountReg}
                            onFocus={(e) => handleFocusClear(e, '0')}
                            onBlur={(e) => handleBlurRestore(e, "amount", 0, amountReg.onBlur)}
                            onWheel={preventScrollChange}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        {errors.amount && <span className="text-xs text-red-500">{errors.amount.message}</span>}
                    </div>

                    <InputField
                        label="Date *"
                        type="date"
                        register={register}
                        name="expense_date"
                        error={errors.expense_date}
                    />

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category *</label>
                        <select
                            {...register("category_id")}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="" disabled>Select a category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                            <option value="other">+ Create &quot;Other&quot;</option>
                        </select>
                        {errors.category_id && <p className="mt-1 text-xs text-red-500">{errors.category_id.message}</p>}
                    </div>

                    {selectedCategory === "other" && (
                        <InputField
                            label="New Category Name *"
                            type="text"
                            register={register}
                            name="new_category_name"
                            error={errors.new_category_name}
                            inputProps={{ placeholder: "Enter custom category name" }}
                        />
                    )}

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method *</label>
                        <select
                            {...register("payment_method")}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="card">Card / POS</option>
                            <option value="cheque">Cheque</option>
                            <option value="mixed">Mixed</option>
                        </select>
                        {errors.payment_method && <p className="mt-1 text-xs text-red-500">{errors.payment_method.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                        <InputField
                            label="Description"
                            type="text"
                            register={register}
                            name="description"
                            error={errors.description}
                            inputProps={{ placeholder: "What was this expense for?" }}
                        />
                    </div>
                </div>
            </div>

            {/* SECTION 2: RECEIPT */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <Receipt className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Attachment</h3>
                </div>
                <div className="p-5">
                    <DeferredImageUploader
                        value={receipts}
                        onChange={setReceipts}
                        maxImages={1}
                    />
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className={`mt-2 flex items-center justify-end gap-3 pt-2 ${!isModal && "border-t border-slate-200 dark:border-slate-800 pt-5"}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || isUploadingFiles}
                    className="inline-flex items-center gap-2 rounded-md bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-70"
                >
                    {isUploadingFiles ? "Uploading Receipt..." : isSubmitting ? "Saving..." : type === "create" ? "Save Expense" : "Update Expense"}
                </button>
            </div>
        </form>
    )
}
