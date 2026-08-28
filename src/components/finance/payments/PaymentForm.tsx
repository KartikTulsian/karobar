"use client";

import { fetchEntityAdvanceBalance } from '@/lib/api/finance';
import { PaymentFormData, paymentSchema } from '@/lib/validations/paymentSchema';
import { PartyOption, UnpaidDocument } from '@/types/finance';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wand2, Loader2, FileText, Landmark, ShieldCheck, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react'
import { Path, Resolver, useFieldArray, useForm } from 'react-hook-form';
import { getLocalDateString } from '@/lib/utils';

interface PaymentFormProps {
    tenantId: string;
    type: "create" | "update";
    preselectedEntityType?: "customer" | "supplier";
    preselectedEntityId?: string; // If opened directly from a customer or bill page
    defaultValues?: Partial<PaymentFormData>;

    availableParties: PartyOption[];
    unpaidDocuments: UnpaidDocument[];

    isModal?: boolean;
    onCancel: () => void;
    onSubmit: (data: PaymentFormData) => void;

    onEntityChange?: (entityType: "customer" | "supplier", entityId: string) => void;
}

export default function PaymentForm({
    tenantId, type, preselectedEntityType, preselectedEntityId, defaultValues, availableParties, unpaidDocuments, isModal = false, onCancel, onSubmit, onEntityChange
}: PaymentFormProps) {

    // Calculate initial total discount if updating an existing payment
    const initialDiscount = defaultValues?.allocations?.reduce((sum, a) => sum + (Number(a.discount) || 0), 0) || 0;
    const [globalDiscount, setGlobalDiscount] = useState<number | "">(initialDiscount > 0 ? initialDiscount : "");
    const [allowAdvance, setAllowAdvance] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingData, setPendingData] = useState<PaymentFormData | null>(null);

    const [availableAdvance, setAvailableAdvance] = useState<number>(0);

    // 1. Initialize Form
    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema) as Resolver<PaymentFormData>,
        defaultValues: {
            paid_at: getLocalDateString(new Date().toISOString()),
            entity_type: preselectedEntityType || "customer",
            entity_id: preselectedEntityId || "",
            method: "cash",
            status: "sanctioned",
            total_amount: 0,
            advance_applied: 0,
            note: "",
            allocations: [],
            ...defaultValues,
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: "allocations",
    });

    // 2. Watchers for UI Reactivity
    const watchEntityType = watch("entity_type");
    const watchEntityId = watch("entity_id");
    const watchTotalAmount = Number(watch("total_amount")) || 0;
    const watchAdvanceApplied = Number(watch("advance_applied")) || 0;
    const watchAllocations = watch("allocations") || [];

    const totalAvailableFunds = watchTotalAmount + watchAdvanceApplied;
    const [prevType, setPrevType] = useState(watchEntityType);

    // 3. Trigger parent fetch when Entity changes
    useEffect(() => {
        if (watchEntityType !== prevType) {
            setValue("entity_id", "", { shouldValidate: false }); // Prevents the red error from jumping out immediately
            replace([]);
            setPrevType(watchEntityType);
        }
    }, [watchEntityType, prevType, setValue, replace]);

    useEffect(() => {
        if (onEntityChange) {
            onEntityChange(watchEntityType, watchEntityId);
        }
    }, [watchEntityType, watchEntityId, onEntityChange]);

    // 4. Populate allocation table when unpaid documents are passed in
    useEffect(() => {
        if (unpaidDocuments && type === "create") {
            const defaultAllocations = unpaidDocuments.map(doc => ({
                document_id: doc.id,
                document_number: doc.document_number,
                document_date: doc.document_date,
                amount_due: doc.amount_due,
                amount: 0, // Default to 0 until auto-allocated or manually entered
                discount: 0 // for write-off
            }));
            replace(defaultAllocations);
        }
    }, [unpaidDocuments, type, replace]);

    useEffect(() => {
        const loadAdvanceBalance = async () => {
            if (!watchEntityId) {
                setAvailableAdvance(0);
                return;
            }

            try {
                const balance = await fetchEntityAdvanceBalance(tenantId, watchEntityType, watchEntityId);
                setAvailableAdvance(balance);
            } catch (error) {
                console.error("Failed to load advance balance");
                setAvailableAdvance(0);
            }
        };

        loadAdvanceBalance();
    }, [watchEntityId, watchEntityType, tenantId]);

    // 5. The Magic Auto-Allocate Function (FIFO Logic)
    const executeAllocation = (targetAmount: number, targetDiscount: number) => {
        let remainingAmount = targetAmount;
        let remainingDiscount = targetDiscount;

        const autoFilled = fields.map((field) => {
            let appliedAmount = 0;
            let appliedDiscount = 0;

            if (remainingAmount > 0) {
                appliedAmount = Math.min(remainingAmount, field.amount_due);
                remainingAmount -= appliedAmount;
            }

            const balanceAfterCash = field.amount_due - appliedAmount;
            if (balanceAfterCash > 0 && remainingDiscount > 0) {
                appliedDiscount = Math.min(remainingDiscount, balanceAfterCash);
                remainingDiscount -= appliedDiscount;
            }

            return {
                ...field,
                amount: Number(appliedAmount.toFixed(2)),
                discount: Number(appliedDiscount.toFixed(2))
            };
        });

        replace(autoFilled);
    };

    useEffect(() => {
        if (totalAvailableFunds > 0 && fields.length > 0) {
            executeAllocation(totalAvailableFunds, Number(globalDiscount) || 0);
        }
    }, [totalAvailableFunds, globalDiscount]);

    // Memoized financial breakdown aggregates
    const metrics = useMemo(() => {
        const allocated = watchAllocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const writtenOff = watchAllocations.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
        const remaining = Math.max(0, totalAvailableFunds - allocated);
        return { allocated, writtenOff, remaining };
    }, [watchAllocations, totalAvailableFunds]);

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: Path<PaymentFormData>,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            setValue(fieldName, fallback, { shouldValidate: true });
        }
        if (rhfBlur) rhfBlur(e);
    };

    // 7. Submit Wrapper
    const handleFormSubmit = (data: PaymentFormData) => {

        const allocated = data.allocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        if (allocated > data.total_amount) {
            alert("Error: You cannot allocate more money than you received.");
            return;
        }

        if (metrics.remaining > 0 && !allowAdvance) {
            alert("Validation Warning: You have unallocated funds remaining. Please distribute the balance completely or enable 'Process remaining as Advance'.");
            return;
        }

        // 2. Instead of submitting, save the data and show the dialog
        setPendingData(data);
        setShowConfirm(true);
    };


    const executeFinalSubmit = () => {
        if (pendingData) {
            const activeAllocations = pendingData.allocations.filter(a => a.amount !== 0 || a.discount !== 0);
            onSubmit({ ...pendingData, allocations: activeAllocations });
            setShowConfirm(false);
        }
    };

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className={containerClass}>

            {/* Top Split Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Panel 1: Payment Source Context */}
                <div className="lg:col-span-4 xl:col-span-3 bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900/30 dark:border-slate-800 flex flex-col gap-5 min-h-[340px]">
                    <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3 dark:border-slate-700/60">
                        <User className="h-4 w-4 text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Source Profile</h3>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Context</label>
                            <select
                                {...register("entity_type")}
                                disabled={!!preselectedEntityId}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300"
                            >
                                <option value="customer">Money In (Customer Receipt)</option>
                                <option value="supplier">Money Out (Supplier Payment)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Assigned {watchEntityType === 'customer' ? 'Customer' : 'Supplier'}
                            </label>
                            <select
                                {...register("entity_id")}
                                disabled={!!preselectedEntityId}
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                                    errors.entity_id 
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/20' 
                                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-700 bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <option value="">Select registry...</option>
                                {availableParties.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.entity_id && <span className="text-[10px] font-bold text-rose-500 mt-0.5">{errors.entity_id.message}</span>}
                        </div>

                        {type === 'update' && (
                            <div className="flex flex-col gap-1.5 border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Record Status</label>
                                <select
                                    {...register("status")}
                                    className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none transition-all focus:ring-2 ${
                                        watch("status") === 'cancelled' 
                                            ? 'bg-rose-50 border-rose-200 text-rose-700 focus:border-rose-500 focus:ring-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400'
                                    }`}
                                >
                                    <option value="sanctioned">Sanctioned (Active)</option>
                                    <option value="draft">Draft (Unposted)</option>
                                    <option value="cancelled">Cancelled (Voided)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {preselectedEntityId && (
                        <div className="mt-auto flex items-start gap-2.5 bg-emerald-50 text-emerald-800 text-xs px-3 py-3 rounded-lg border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40">
                            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="font-medium leading-relaxed">System locks target verification constraints securely when navigated from active record views.</span>
                        </div>
                    )}
                </div>

                {/* Panel 2: Operational Data Processing Metrics */}
                <div className="lg:col-span-8 xl:col-span-9 bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-950 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                        <Landmark className="h-4 w-4 text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Execution Parameters</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                        
                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Liquid Capital (₹) *</label>
                            <input
                                type="number" step="0.01" min="0"
                                {...register("total_amount", { valueAsNumber: true })}
                                onFocus={(e) => handleFocusClear(e, '0')}
                                onBlur={(e) => handleBlurRestore(e, 'total_amount', 0, register("total_amount").onBlur)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none transition-all focus:ring-2 ${
                                    errors.total_amount 
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/20' 
                                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                                }`}
                                placeholder="0.00"
                            />
                            {errors.total_amount && <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{errors.total_amount.message}</span>}
                        </div>

                        <div className="flex flex-col gap-1.5 w-full relative">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Apply Advance (₹)</label>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 dark:bg-indigo-900/40 dark:border-indigo-800/60 dark:text-indigo-400">
                                    Wallet: ₹{availableAdvance.toFixed(2)}
                                </span>
                            </div>
                            <input
                                type="number" step="0.01" min="0" max={availableAdvance}
                                {...register("advance_applied", { valueAsNumber: true })}
                                onFocus={(e) => handleFocusClear(e, '0')}
                                onBlur={(e) => handleBlurRestore(e, 'advance_applied', 0, register("advance_applied").onBlur)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none transition-all focus:ring-2 ${
                                    watchAdvanceApplied > availableAdvance
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/20'
                                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                                }`}
                                placeholder="0.00"
                            />
                            {watchAdvanceApplied > availableAdvance && (
                                <span className="text-[10px] font-semibold text-rose-500 absolute -bottom-5">Exceeds wallet limit</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Global Kasar (₹)</label>
                            <input
                                type="number" step="0.01" min="0"
                                value={globalDiscount}
                                onChange={(e) => setGlobalDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                                onFocus={(e) => { if(e.target.value === '0') setGlobalDiscount('') }}
                                onBlur={(e) => { if(e.target.value === '') setGlobalDiscount(0) }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-amber-600 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Medium Channel *</label>
                            <select {...register("method")} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                                <option value="card">Card / POS</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Accounting Date *</label>
                            <input
                                type="date"
                                {...register("paid_at")}
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2 ${
                                    errors.paid_at 
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/20' 
                                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                                }`}
                            />
                            {errors.paid_at && <span className="text-[10px] font-semibold text-rose-500 mt-0.5">{errors.paid_at.message}</span>}
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tracking Reference</label>
                            <input
                                type="text"
                                {...register("reference_no")}
                                placeholder="UTR, Trans ID..."
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2 ${
                                    errors.reference_no 
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/20' 
                                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                                }`}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 lg:col-span-3">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Transaction Notes</label>
                            <textarea
                                {...register("note")}
                                rows={2}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                placeholder="Add context for this payment..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Allocation Array */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-950 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Document Matching Interface
                    </h3>

                    <button
                        type="button"
                        onClick={() => executeAllocation(watchTotalAmount, Number(globalDiscount) || 0)}
                        disabled={watchTotalAmount <= 0 || fields.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 transition-all dark:bg-indigo-900/30 dark:border-indigo-800/50 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                    >
                        <Wand2 className="h-3.5 w-3.5" /> Force Auto-Reconciliation
                    </button>
                </div>

                {fields.length === 0 ? (
                    <div className="py-12 text-center text-sm font-medium text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl dark:bg-slate-900/40 dark:border-slate-800">
                        {watchEntityId ? "No active debt documents found for this profile." : "Assign a transaction target above to index available documents."}
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto border border-slate-200 rounded-xl dark:border-slate-800">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3.5">Token Number</th>
                                    <th className="px-4 py-3.5">Issuance Date</th>
                                    <th className="px-4 py-3.5 text-right">Outstanding Debt</th>
                                    <th className="px-4 py-3.5 text-right w-44">Allocated Capture</th>
                                    <th className="px-4 py-3.5 text-right w-36">Write-off Relief</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                {fields.map((field, index) => (
                                    <tr key={field.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                                            {field.document_number}
                                            <input type="hidden" {...register(`allocations.${index}.document_id`)} />
                                            <input type="hidden" {...register(`allocations.${index}.amount_due`, { valueAsNumber: true })} />
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 text-xs font-medium">{field.document_date}</td>
                                        <td className="px-4 py-3.5 text-right text-rose-600 font-bold bg-rose-50/30 dark:bg-rose-950/10">
                                            ₹{field.amount_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        
                                        {/* AMOUNT APPLIED COLUMN */}
                                        <td className="px-4 py-2 align-middle">
                                            {(() => {
                                                const amountReg = register(`allocations.${index}.amount`, { valueAsNumber: true });
                                                return (
                                                    <>
                                                        <input
                                                            type="number" step="0.01" min="0"
                                                            {...amountReg}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (val > field.amount_due) e.target.value = String(field.amount_due);
                                                                amountReg.onChange(e); 
                                                            }}
                                                            onFocus={(e) => handleFocusClear(e, '0')}
                                                            onBlur={(e) => handleBlurRestore(e, `allocations.${index}.amount`, 0, amountReg.onBlur)}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            className={`w-full rounded-md border px-3 py-2 text-right text-sm font-bold outline-none transition-all focus:ring-2 
                                                                ${errors.allocations?.[index]?.amount
                                                                    ? 'border-rose-500 text-rose-700 focus:border-rose-500 focus:ring-rose-200 dark:bg-rose-950/20'
                                                                    : 'border-slate-200 text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900'}`}
                                                        />
                                                        {errors.allocations?.[index]?.amount && (
                                                            <span className="text-[10px] text-rose-500 font-semibold block mt-1 leading-tight">
                                                                {errors.allocations[index]?.amount?.message}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </td>

                                        {/* WRITE-OFF / DISCOUNT COLUMN */}
                                        <td className="px-4 py-2 align-middle">
                                            {(() => {
                                                const discountReg = register(`allocations.${index}.discount`, { valueAsNumber: true });
                                                return (
                                                    <>
                                                        <input
                                                            type="number" step="0.01" min="0"
                                                            {...discountReg}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (val > field.amount_due) e.target.value = String(field.amount_due);
                                                                discountReg.onChange(e);
                                                            }}
                                                            onFocus={(e) => handleFocusClear(e, '0')}
                                                            onBlur={(e) => handleBlurRestore(e, `allocations.${index}.discount`, 0, discountReg.onBlur)}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            className={`w-full rounded-md border px-3 py-2 text-right text-sm font-bold outline-none transition-all focus:ring-2
                                                                ${errors.allocations?.[index]?.discount
                                                                    ? 'border-rose-500 text-rose-700 focus:border-rose-500 focus:ring-rose-200 dark:bg-rose-950/20'
                                                                    : 'border-slate-200 text-amber-600 focus:border-amber-500 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900'}`}
                                                        />
                                                        {errors.allocations?.[index]?.discount && (
                                                            <span className="text-[10px] text-rose-500 font-semibold block mt-1 leading-tight">
                                                                {errors.allocations[index]?.discount?.message}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bottom Panel Summary Matrix */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-950 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-6 md:gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gross Capital</span>
                        <span className="text-lg font-black text-slate-800 dark:text-white">₹{watchTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-6 md:pl-8 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">Reconciled</span>
                        <span className="text-lg font-black text-emerald-600">₹{metrics.allocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-6 md:pl-8 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Written-off</span>
                        <span className="text-lg font-black text-amber-600">₹{metrics.writtenOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-6 md:pl-8 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Remaining Flow</span>
                        <span className={`text-lg font-black ${metrics.remaining > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                            ₹{metrics.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Conditional Safe Allocation Advance Element */}
                {metrics.remaining > 0 && (
                    <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg dark:bg-amber-950/30 dark:border-amber-900/50">
                        <input
                            type="checkbox"
                            id="allow_advance_toggle"
                            checked={allowAdvance}
                            onChange={(e) => setAllowAdvance(e.target.checked)}
                            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <label htmlFor="allow_advance_toggle" className="text-xs font-bold text-amber-800 dark:text-amber-400 select-none cursor-pointer tracking-wide">
                            Store Balance as Advance
                        </label>
                    </div>
                )}

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 w-full md:w-auto">Cancel</button>
                    <button
                        type="submit"
                        disabled={isSubmitting || (watchTotalAmount <= 0 && metrics.writtenOff <= 0)}
                        className="inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Commit Transaction
                    </button>
                </div>
            </div>

            {showConfirm && pendingData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Confirm Allocation</h3>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 mb-6 space-y-4 text-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                                <span className="text-slate-600 font-medium dark:text-slate-400">Liquid Cash Received:</span>
                                <span className="font-bold text-slate-900 dark:text-white text-base">₹{pendingData.total_amount.toFixed(2)}</span>
                            </div>
                            {Number(pendingData.advance_applied) > 0 && (
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">Wallet Advance Used:</span>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-300 text-base">₹{Number(pendingData.advance_applied).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-slate-600 font-medium dark:text-slate-400">Total Allocated to Bills:</span>
                                <span className="font-black text-emerald-600 text-lg">
                                    ₹{pendingData.allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0).toFixed(2)}
                                </span>
                            </div>

                            {((Number(pendingData.total_amount) + Number(pendingData.advance_applied || 0)) - pendingData.allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)) > 0 && (
                                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">Saved as Advance:</span>
                                    <span className="font-black text-amber-600 text-lg">
                                        ₹{((Number(pendingData.total_amount) + Number(pendingData.advance_applied || 0)) - pendingData.allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="px-5 py-2.5 text-sm font-bold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                            >
                                Review Again
                            </button>
                            <button
                                type="button"
                                onClick={executeFinalSubmit}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-colors w-full sm:w-auto"
                            >
                                Confirm & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    )
}
