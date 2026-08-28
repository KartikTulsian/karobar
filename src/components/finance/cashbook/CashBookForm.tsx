"use client";

import InputField from '@/components/common/InputField';
import { cashBookSchema, CashBookFormData } from '@/lib/validations/cashBookSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownRight, ArrowUpRight, Play, Wallet } from 'lucide-react';
import { useEffect } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { getLocalDateString } from '@/lib/utils';

interface CashBookFormProps {
    type: "create" | "update";
    defaultValues?: Partial<CashBookFormData>;
    bills: { id: string, bill_number: string, grand_total: number }[];
    expenses: { id: string, description: string, amount: number }[];
    purchases: { id: string, po_number: string, total_amount: number }[];
    isModal?: boolean;
    onCancel: () => void;
    onSubmit: (data: CashBookFormData) => void;
}

export default function CashBookForm({ type, defaultValues, bills, expenses, purchases, isModal = false, onCancel, onSubmit }: CashBookFormProps) {

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<CashBookFormData>({
        resolver: zodResolver(cashBookSchema) as Resolver<CashBookFormData>,
        defaultValues: {
            type: "in",
            amount: 0,
            payment_method: "cash", // Default to physical drawer
            entry_date: getLocalDateString(new Date().toISOString()), // Defaults to today
            description: "",
            reference_type: "manual",
            ...defaultValues
        }
    });

    const selectedType = watch("type");
    const selectedRefType = watch("reference_type");

    useEffect(() => {
        if (selectedRefType === 'manual') return;

        const descriptions: Record<string, string> = {
            single_sale: "Payment collection for Sales Bill",
            expense: "Payment for Expense",
            single_purchase: "Payment for Purchase Order",
            advance_receipt: "Advance payment received from Customer",
            advance_payment: "Advance payment issued to Supplier"
        };
        setValue("description", descriptions[selectedRefType] || "");
    }, [selectedRefType, setValue]);

    const setOpeningBalance = () => {
        setValue("description", "Added Morning Float (Extra Change)");
        setValue("type", "in");
        setValue("reference_type", "manual");
        setValue("payment_method", "cash");
        setValue("amount", 0);
    };

    const handleFormSubmit = async (data: CashBookFormData) => {
        const finalData = {
            ...data,
            description: data.description.trim(),
        };
        await onSubmit(finalData);
    };

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50";

    const selectStyle = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className={containerClass}>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-800">Manual Entry Details</h3>
                    </div>
                    <button
                        type="button"
                        onClick={setOpeningBalance}
                        className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                        <Play className="h-3 w-3" /> Add Morning Float
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-5 p-5">

                    {/* Toggle for In/Out */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transaction Type *</label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition-all ${selectedType === 'in' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                <input type="radio" value="in" {...register("type")} className="sr-only" />
                                <ArrowDownRight className="h-4 w-4" /> Money In
                            </label>
                            <label className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition-all ${selectedType === 'out' ? 'border-red-600 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-400' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                <input type="radio" value="out" {...register("type")} className="sr-only" />
                                <ArrowUpRight className="h-4 w-4" /> Money Out
                            </label>
                        </div>
                        {errors.type && <span className="text-xs text-red-500">{errors.type.message}</span>}
                    </div>

                    {/* Amount & Date Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <InputField
                            label="Amount (₹) *"
                            type="number"
                            register={register}
                            name="amount"
                            valueAsNumber={true}
                            error={errors.amount}
                            inputProps={{ 
                                placeholder: "0.00", 
                                min: 0, 
                                step: "0.01",
                                onWheel: (e) => (e.target as HTMLInputElement).blur() // Added Scroll Hijacking Fix
                            }}
                        />

                        <InputField
                            label="Date *"
                            type="date"
                            register={register}
                            name="entry_date"
                            error={errors.entry_date}
                        />
                    </div>

                    {/* Methods and Reference Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Payment Method *</label>
                            <select {...register("payment_method")} className={selectStyle}>
                                <option value="cash">Cash (Physical Drawer)</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                                <option value="cheque">Cheque</option>
                                <option value="card">Card / POS</option>
                            </select>
                            {errors.payment_method && <span className="text-xs text-red-500">{errors.payment_method.message}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Reference Type</label>
                            <select {...register("reference_type")} className={selectStyle}>
                                <option value="manual">Manual Entry</option>
                                <option value="single_sale">Sales Bill</option>
                                <option value="expense">Expense</option>
                                <option value="single_purchase">Purchase Order</option>
                                <option value="advance_receipt">Customer Advance</option>
                                <option value="advance_payment">Supplier Advance</option>
                            </select>
                        </div>
                    </div>

                    {/* Conditional Dropdown */}
                    {selectedRefType !== 'manual' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700 capitalize">
                                Select {selectedRefType} *
                            </label>
                            <select {...register("reference_id")} className={selectStyle}>
                                <option value="">Select Record...</option>
                                {selectedRefType === 'single_sale' && bills.map(b => (
                                    <option key={b.id} value={b.id}>#{b.bill_number} - ₹{b.grand_total}</option>
                                ))}
                                {selectedRefType === 'expense' && expenses.map(e => (
                                    <option key={e.id} value={e.id}>{e.description} - ₹{e.amount}</option>
                                ))}
                                {selectedRefType === 'single_purchase' && purchases.map(p => (
                                    <option key={p.id} value={p.id}>#{p.po_number} - ₹{p.total_amount}</option>
                                ))}
                            </select>
                            {errors.reference_id && (
                                <span className="text-xs text-red-500">{errors.reference_id.message}</span>
                            )}
                        </div>
                    )}

                    {/* Description (Full Width) */}
                    <InputField
                        label="Description *"
                        type="text"
                        register={register}
                        name="description"
                        error={errors.description}
                        inputProps={{ placeholder: "e.g., Owner withdrew cash, Opening Float" }}
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
                    disabled={isSubmitting}
                    className={`inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-70 ${selectedType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {isSubmitting ? "Saving..." : type === "create" ? "Save Entry" : "Update Entry"}
                </button>
            </div>
        </form>
    )
}
