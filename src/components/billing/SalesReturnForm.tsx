"use client";

import { useBill, useBills } from "@/hooks/useBilling";
import { SalesReturnFormData, salesReturnSchema } from "@/lib/validations/salesReturnSchema";
import { BatchAllocation, BillWithCustomer, SalesReturnWithDetails } from "@/types/billing";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Box, Loader2, Search, Undo2 } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import { Path, Resolver, SubmitErrorHandler, useFieldArray, useForm } from "react-hook-form";

interface SalesReturnFormProps {
    tenantId: string;
    isModal?: boolean;
    defaultValues?: SalesReturnWithDetails | null;
    onCancel: () => void;
    onSubmit: (data: SalesReturnFormData) => void;
}

export default function SalesReturnForm({ tenantId, isModal = false, defaultValues, onCancel, onSubmit }: SalesReturnFormProps) {

    const { data: bills = [], isLoading: loadingBills } = useBills(tenantId);

    const [billSearch, setBillSearch] = useState(defaultValues?.bills?.bill_number || "");
    const [isBillDropdownOpen, setIsBillDropdownOpen] = useState(false);
    // const [selectedBillDetails, setSelectedBillDetails] = useState<BillDetail | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    // const [isFetchingDetails, setIsFetchingDetails] = useState(false);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SalesReturnFormData>({
        resolver: zodResolver(salesReturnSchema) as Resolver<SalesReturnFormData>,
        defaultValues: {
            id: defaultValues?.id,
            original_bill_id: defaultValues?.original_bill_id || "",
            reason: defaultValues?.reason || "",
            refund_method: defaultValues?.refund_method || "credit_note",
            refund_amount: defaultValues?.refund_amount || 0,
            return_items: [],
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: "return_items",
    });

    const watchOriginalBillId = watch("original_bill_id");

    const { data: fullBill, isLoading: isFetchingDetails } = useBill(tenantId, watchOriginalBillId);

    useEffect(() => {
        if (fullBill) {
            console.log("[DEBUG - UI] fullBill loaded:", fullBill.bill_number);
            console.log("[DEBUG - UI] Passed defaultValues:", defaultValues);

            const mappedItems = fullBill.bill_line_items.map(item => {
                // In edit mode, check if we previously returned this item
                const existingReturnItem = defaultValues?.sales_return_items?.find(
                    ri => ri.bill_line_item_id === item.id
                );

                if (existingReturnItem) {
                    console.log(`[DEBUG - UI] Found existing return mapping for ${item.item_name}:`, existingReturnItem.return_qty);
                }

                return {
                    bill_line_item_id: item.id,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    purchased_qty: item.qty,
                    unit_price: item.unit_price,
                    discount_pct: item.discount_pct || 0,
                    gst_rate: item.gst_rate,
                    return_qty: existingReturnItem ? existingReturnItem.return_qty : 0,
                    refund_total: existingReturnItem ? existingReturnItem.refund_amount : 0,
                    return_batch_allocations: existingReturnItem ? existingReturnItem.return_batch_allocations : [],
                    write_off_recovery: existingReturnItem ? (existingReturnItem.write_off_recovery || 0) : 0
                };
            });
            replace(mappedItems);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullBill?.id]);

    const watchReturnItems = watch("return_items");

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: Path<SalesReturnFormData>,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            setValue(fieldName, fallback, { shouldValidate: true });
        }
        rhfBlur(e);
    };

    const autoAllocateReturnFifo = (originalBatches: BatchAllocation[], neededQty: number): BatchAllocation[] => {
        let remaining = neededQty;
        const allocations: BatchAllocation[] = [];

        for (const b of originalBatches) {
            if (remaining <= 0) break;
            // Cannot return more to a batch than what was originally sold from it
            const take = Math.min(b.qty, remaining);
            if (take > 0) {
                allocations.push({
                    batch_id: b.batch_id,
                    qty: take,
                    buy_price: b.buy_price,
                    batch_number: b.batch_number
                });
                remaining -= take;
            }
        }
        return allocations;
    };

    const currentTotalRefund = (() => {
        if (!watchReturnItems || !fullBill) return 0;

        let rawRefundTotal = 0;
        let originalGrossTotal = 0;

        // 1. Calculate Original Gross Total (to find the proportion)
        fullBill.bill_line_items.forEach(item => {
            originalGrossTotal += Number(item.line_total);
        });

        // 2. Calculate the raw refund for the selected items
        watchReturnItems.forEach(item => {
            const safeQty = Math.min(Number(item.return_qty) || 0, item.purchased_qty);
            if (safeQty > 0) {
                const baseAmount = safeQty * item.unit_price;
                const afterLineDiscount = baseAmount - (baseAmount * ((item.discount_pct || 0) / 100));
                const gstAmount = afterLineDiscount * (item.gst_rate / 100);

                rawRefundTotal += (afterLineDiscount + gstAmount);
            }
        });

        // 3. Deduct proportional global discount
        const originalGlobalDiscount = Number(fullBill.discount_amount) || 0;
        let finalRefund = rawRefundTotal;

        if (originalGlobalDiscount > 0 && originalGrossTotal > 0) {
            const refundWeight = rawRefundTotal / originalGrossTotal;
            const discountReduction = originalGlobalDiscount * refundWeight;
            finalRefund = rawRefundTotal - discountReduction;
        }

        return Number(finalRefund.toFixed(2));
    })();

    const currentWriteOffReverted = (() => {
        if (!watchReturnItems || !fullBill) return 0;
        let revertedDebt = 0;

        watchReturnItems.forEach(item => {
            const safeQty = Math.min(Number(item.return_qty) || 0, item.purchased_qty);
            if (safeQty > 0) {
                const originalLine = fullBill.bill_line_items.find(i => i.id === item.bill_line_item_id);
                if (originalLine && originalLine.write_off_recovery > 0 && originalLine.qty > 0) {
                    const ratio = safeQty / originalLine.qty;
                    revertedDebt += (originalLine.write_off_recovery * ratio);
                }
            }
        });
        return Number(revertedDebt.toFixed(2));
    })();

    useEffect(() => {
        setValue("refund_amount", currentTotalRefund, { shouldValidate: currentTotalRefund > 0 });
    }, [currentTotalRefund, setValue]);

    const handleBillSelect = async (bill: BillWithCustomer) => {
        setIsBillDropdownOpen(false);
        setBillSearch(bill.bill_number);
        setValue("original_bill_id", bill.id, { shouldValidate: true });
        setFormError(null);
        replace([]);
    };

    const handleFormError: SubmitErrorHandler<SalesReturnFormData> = (errors) => {
        console.error("[DEBUG] Form Validation Blocked Submission!", errors);
    };

    const handleFormSubmit = (data: SalesReturnFormData) => {
        console.log("[DEBUG] 1. SalesReturnForm Validation Passed! Raw Data:", data);
        setFormError(null);
        let rawRefundTotal = 0;
        let allocationMismatch = false;

        const processedItems = data.return_items.map(item => {
            // Clamp quantity to prevent returning more than purchased
            const safeQty = Math.min(Number(item.return_qty) || 0, item.purchased_qty);

            const totalAllocated = (item.return_batch_allocations || []).reduce((sum, a) => sum + Number(a.qty), 0);
            if (safeQty > 0 && Math.abs(totalAllocated - safeQty) > 0.001) {
                allocationMismatch = true;
            }

            const baseAmount = safeQty * item.unit_price;
            const afterLineDiscount = baseAmount - (baseAmount * ((item.discount_pct || 0) / 100));
            const gstAmount = afterLineDiscount * (item.gst_rate / 100);
            const lineRefund = afterLineDiscount + gstAmount;

            rawRefundTotal += lineRefund;

            return {
                ...item,
                return_qty: safeQty,
                refund_total: Number(lineRefund.toFixed(2)),
                return_batch_allocations: item.return_batch_allocations || [],
                write_off_recovery: item.write_off_recovery || 0
            };
        });

        if (allocationMismatch) {
            setFormError("Batch allocation mismatch detected. Ensure returned quantities are properly assigned to the batches.");
            return;
        }

        // Proportional global discount deduction for the final submission
        let finalRefund = rawRefundTotal;
        const originalGlobalDiscount = Number(fullBill?.discount_amount) || 0;
        const originalGrossTotal = fullBill?.bill_line_items.reduce((sum, i) => sum + Number(i.line_total), 0) || 0;

        if (originalGlobalDiscount > 0 && originalGrossTotal > 0) {
            const refundWeight = rawRefundTotal / originalGrossTotal;
            finalRefund = rawRefundTotal - (originalGlobalDiscount * refundWeight);
        }


        const itemsBeingReturned = processedItems.filter(i => i.return_qty > 0);
        if (itemsBeingReturned.length === 0) {
            setFormError("You must specify at least one item to return with a quantity greater than 0.");
            return;
        }

        const finalData: SalesReturnFormData = {
            ...data,
            return_items: processedItems,
            refund_amount: Number(finalRefund.toFixed(2))
        };

        console.log("[DEBUG] 2. SalesReturnForm passing to parent onSubmit:", finalData);
        onSubmit(finalData); // Pass cleanly to parent!
    };

    const filteredBills = bills.filter(b =>
        b.bill_number.toLowerCase().includes(billSearch.toLowerCase()) ||
        b.customers?.name?.toLowerCase().includes(billSearch.toLowerCase())
    );

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

    const isEditMode = !!defaultValues?.id;
    const originalRefund = defaultValues?.refund_amount || 0;
    const refundDifference = currentTotalRefund - originalRefund;

    if (loadingBills) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm font-medium text-slate-500">Loading bills...</span>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit, handleFormError)}
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className={containerClass}
        >

            {/* SECTION 1: BILL SELECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-slate-100 pb-6 dark:border-slate-800">
                <div className="md:col-span-8 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Sales Ledger Details
                    </h3>

                    <div className="flex flex-col gap-1 relative z-50">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Search Original Bill *</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={billSearch}
                                placeholder="Search by Bill Number or Customer..."
                                onChange={(e) => {
                                    setBillSearch(e.target.value);
                                    setIsBillDropdownOpen(true);
                                    setValue("original_bill_id", "");
                                    replace([]);
                                }}
                                onFocus={() => setIsBillDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsBillDropdownOpen(false), 200)}
                                className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 bg-white text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>


                        {isBillDropdownOpen && (
                            <ul className="absolute top-[65px] left-0 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                {filteredBills.length > 0 ? (
                                    filteredBills.map(b => (
                                        <li
                                            key={b.id}
                                            onMouseDown={(e) => { e.preventDefault(); handleBillSelect(b); }}
                                            className="cursor-pointer px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 border-b border-slate-100 last:border-0 flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-slate-200">{b.bill_number}</div>
                                                <div className="text-xs text-slate-500">{b.customers?.name}</div>
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">₹{b.grand_total}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-3 text-sm text-slate-500">No recent bills found.</li>
                                )}
                            </ul>
                        )}
                        {errors.original_bill_id && <span className="text-xs text-red-500 mt-1">{errors.original_bill_id.message}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason for Return</label>
                        <textarea
                            {...register("reason")}
                            rows={2}
                            placeholder="Defective items, wrong size, etc."
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>

                {/* RIGHT: Original Bill Info Card */}
                <div className="md:col-span-4">
                    {fullBill ? (
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 mt-6 md:mt-8">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Original Bill Summary</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Customer:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{fullBill.customers?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Bill Date:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{new Date(fullBill.bill_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Bill Total:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">₹{fullBill.grand_total.toFixed(2)}</span>
                                </div>
                                {fullBill.amount_paid > 0 && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                        <span className="font-medium">Amount Paid:</span>
                                        <span className="font-bold">- ₹{fullBill.amount_paid.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-800 dark:text-slate-300 font-bold uppercase tracking-wider text-xs">Balance Due:</span>
                                    <span className="font-black text-orange-600 dark:text-orange-400 text-lg">₹{fullBill.amount_due.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[120px] rounded-lg border border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20 flex items-center justify-center text-sm text-slate-400 mt-6 md:mt-8">
                            Select a Bill to view details
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 2: RETURN ITEMS TABLE */}
            {isFetchingDetails ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium text-slate-500">Loading line items...</span>
                </div>
            ) : fullBill && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Select Items to Return</h3>
                        {/* <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Bill Date: {new Date(fullBill.bill_date).toLocaleDateString()}
                        </span> */}
                    </div>

                    <div className="w-full overflow-visible rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Item Name</th>
                                    <th className="px-4 py-3 font-medium w-24">Purchased</th>
                                    <th className="px-4 py-3 font-medium w-32">Price (₹)</th>
                                    <th className="px-4 py-3 font-medium w-32 text-indigo-600 dark:text-indigo-400">Return Qty</th>
                                    <th className="px-4 py-3 font-medium text-right w-32">Refund (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {fields.map((field, index) => {
                                    const returnQtyReg = register(`return_items.${index}.return_qty`, { valueAsNumber: true });

                                    const currentQty = Number(watchReturnItems?.[index]?.return_qty) || 0;
                                    const maxQty = field.purchased_qty;
                                    const isOverReturn = currentQty > maxQty;

                                    const base = currentQty * field.unit_price;
                                    const refund = base + (base * (field.gst_rate / 100));

                                    const originalLineItem = fullBill?.bill_line_items.find(i => i.id === field.bill_line_item_id);
                                    const originalBatches: BatchAllocation[] = originalLineItem?.batch_allocations || [];

                                    return (
                                        <React.Fragment key={field.id}>
                                            <tr key={field.id} className="bg-white dark:bg-slate-900">
                                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                                                    {/* Fix 2: Hidden inputs bind the background data so it successfully reaches the API */}
                                                    <input type="hidden" {...register(`return_items.${index}.bill_line_item_id`)} />
                                                    <input type="hidden" {...register(`return_items.${index}.item_id`)} />
                                                    <input type="hidden" {...register(`return_items.${index}.item_name`)} />
                                                    <input type="hidden" {...register(`return_items.${index}.purchased_qty`, { valueAsNumber: true })} />
                                                    <input type="hidden" {...register(`return_items.${index}.unit_price`, { valueAsNumber: true })} />
                                                    <input type="hidden" {...register(`return_items.${index}.gst_rate`, { valueAsNumber: true })} />

                                                    {field.item_name}
                                                    {field.gst_rate > 0 && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">GST {field.gst_rate}%</span>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {field.purchased_qty}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    ₹ {field.unit_price.toFixed(2)}
                                                </td>
                                                <td className="px-2 py-2">
                                                    {/* Using standard input here prevents UI breaking from empty InputField labels */}
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        {...returnQtyReg}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const safeVal = Math.min(val, maxQty);
                                                            // Clamp logic: Prevent typing more than was originally received
                                                            e.target.value = String(safeVal);
                                                            returnQtyReg.onChange(e); // Trigger RHF

                                                            const newAllocations = autoAllocateReturnFifo(originalBatches, safeVal);
                                                            setValue(`return_items.${index}.return_batch_allocations`, newAllocations, { shouldValidate: true });
                                                        }}
                                                        onFocus={(e) => handleFocusClear(e, '0')}
                                                        onBlur={(e) => handleBlurRestore(e, `return_items.${index}.return_qty`, 0, returnQtyReg.onBlur)}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className={`w-full max-w-[100px] text-center rounded border px-2 py-1.5 text-sm font-medium outline-none focus:ring-1 dark:bg-slate-800 ${isOverReturn
                                                            ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10'
                                                            : 'border-orange-200 text-orange-700 focus:border-orange-500 dark:border-orange-500/30 dark:text-orange-400'
                                                            }`}
                                                    // {...register(`return_items.${index}.return_qty`, { valueAsNumber: true })}
                                                    // className="w-full rounded border border-indigo-200 bg-indigo-50/50 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-white"
                                                    />
                                                    {/* INLINE ERROR RENDER */}
                                                    {isOverReturn && (
                                                        <span className="text-[10px] font-bold text-red-500 leading-none">
                                                            Max: {maxQty}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                                                    {refund.toFixed(2)}
                                                </td>
                                            </tr>
                                            {/* BATCH ALLOCATION INLINE SUB-ROW */}
                                            {currentQty > 0 && originalBatches.length > 0 && (
                                                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                                    <td colSpan={5} className="px-4 py-3">
                                                        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                                            <div className="flex items-center justify-between">
                                                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                    <Box className="h-3.5 w-3.5" /> Restoring to Batches
                                                                </span>
                                                                {/* Dynamic Mismatch Warning */}
                                                                {(() => {
                                                                    const totalAlloc = (watchReturnItems[index]?.return_batch_allocations || []).reduce((s, a) => s + Number(a.qty), 0);
                                                                    if (Math.abs(totalAlloc - currentQty) > 0.001) {
                                                                        return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded dark:bg-red-500/10">⚠️ Allocation Mismatch</span>;
                                                                    }
                                                                    return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-500/10">Perfectly Allocated</span>;
                                                                })()}
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {originalBatches.map(batch => {
                                                                    const allocs = watchReturnItems[index]?.return_batch_allocations || [];
                                                                    const currentAlloc = allocs.find(a => a.batch_id === batch.batch_id);
                                                                    const allocQty = currentAlloc ? currentAlloc.qty : 0;

                                                                    return (
                                                                        <div key={batch.batch_id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                                                    {batch.batch_number || 'OPENING-STOCK'}
                                                                                </span>
                                                                                <span className="text-[9px] font-medium text-slate-500">
                                                                                    Orig. Sold: {batch.qty} | COGS: ₹{batch.buy_price}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-[9px] font-semibold text-slate-500 uppercase">Return:</span>
                                                                                <input
                                                                                    type="number" min="0" max={batch.qty} step="0.001"
                                                                                    value={allocQty || ''}
                                                                                    onChange={(e) => {
                                                                                        const val = parseFloat(e.target.value) || 0;
                                                                                        const safeVal = Math.min(val, batch.qty); // Gatekeeper: Can't return more than was originally sold from THIS batch

                                                                                        const updatedAllocs = [...allocs].filter(a => a.batch_id !== batch.batch_id);
                                                                                        if (safeVal > 0) {
                                                                                            updatedAllocs.push({
                                                                                                batch_id: batch.batch_id,
                                                                                                qty: safeVal,
                                                                                                buy_price: batch.buy_price,
                                                                                                batch_number: batch.batch_number
                                                                                            });
                                                                                        }
                                                                                        setValue(`return_items.${index}.return_batch_allocations`, updatedAllocs, { shouldValidate: true });
                                                                                    }}
                                                                                    className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs text-right outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white transition-all"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {formError && <span className="text-sm font-medium text-red-500">{formError}</span>}
                    {errors.return_items && <p className="text-xs text-red-500 mt-1">{errors.return_items.message}</p>}
                </div>
            )}

            {/* SECTION 3: REFUND DETAILS */}
            <div className="flex flex-col gap-4 pt-6 border-t border-slate-200 dark:border-slate-800 mt-2">
                {isEditMode && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 dark:bg-slate-800/40 dark:border-slate-700/60 mb-2 animate-in fade-in">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Refund Adjustment Summary</h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Previously Processed Refund</span>
                                <span className="font-medium">₹ {originalRefund.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-900 dark:text-slate-200">
                                <span className="font-medium">Revised Refund Amount</span>
                                <span className="font-bold">₹ {currentTotalRefund.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">Net Change (To be settled)</span>
                                <span className={`text-xl font-black ${refundDifference > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                    refundDifference < 0 ? 'text-rose-600 dark:text-rose-400' :
                                        'text-slate-500'
                                    }`}>
                                    {refundDifference > 0 ? '+ ' : refundDifference < 0 ? '- ' : ''}₹ {Math.abs(refundDifference).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-lg bg-orange-50/50 border border-orange-100 p-5 dark:bg-orange-500/5 dark:border-orange-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-orange-800 dark:text-orange-300">How is the customer refunding this? *</label>
                            <select
                                {...register("refund_method")}
                                className="w-full sm:w-64 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 dark:border-orange-500/30 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="credit_note">Credit Note (Adjust in next bill)</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                            </select>
                            {errors.refund_method && <p className="text-xs text-red-500">{errors.refund_method.message}</p>}
                        </div>

                        <div className="flex sm:justify-end">
                            <div className="flex flex-col items-start sm:items-end">
                                <span className="text-sm font-medium text-orange-800/70 dark:text-orange-300/70">
                                    {isEditMode ? "New Total Refund Amount" : "Total Refund Amount"}
                                </span>
                                <span className="text-3xl font-bold text-orange-600 dark:text-orange-500">
                                    ₹ {currentTotalRefund.toFixed(2)}
                                </span>
                                {errors.refund_amount && <p className="text-xs text-red-500 mt-1">{errors.refund_amount.message}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {isEditMode && refundDifference !== 0 && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 mt-1 animate-in fade-in slide-in-from-top-2 ${refundDifference > 0
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                        }`}>
                        <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${refundDifference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                        <div>
                            <h4 className="text-sm font-bold">
                                {refundDifference > 0 ? "Return Amount Increased" : "Return Amount Decreased (Items Kept)"}
                            </h4>
                            <p className="text-sm mt-1 leading-relaxed opacity-90">
                                {refundDifference > 0
                                    ? <>You are returning MORE items. An additional <strong>₹{Math.abs(refundDifference).toFixed(2)}</strong> will be refunded or adjusted on top of the original return.</>
                                    : <>You are reducing the return. The customer is keeping <strong>₹{Math.abs(refundDifference).toFixed(2)}</strong> worth of items from the previous return. This amount will be added back to their due balance.</>
                                }
                            </p>
                        </div>

                        {currentWriteOffReverted > 0 && (
                            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 flex items-start gap-3 mt-1 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">Historical Debt Reversal</h4>
                                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-1 leading-relaxed">
                                        This return includes items that previously contained extra pricing to recover bad debt.
                                        <strong>₹{currentWriteOffReverted.toFixed(2)}</strong> will be automatically added back to this customer&apos;s Write-off Balance.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {fullBill && (isEditMode ? refundDifference : currentTotalRefund) > fullBill.amount_due && fullBill.amount_due > 0 && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 flex items-start gap-3 mt-1 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Refund Exceeds Outstanding Balance</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                                The new adjustment covers the entire remaining balance of this Bill (<strong>₹{fullBill.amount_due.toFixed(2)}</strong>).
                                This bill will be automatically marked as <strong>Paid</strong>, and the excess will be credited directly to the customer&apos;s overall account as an advance.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className={`mt-2 flex items-center justify-end gap-3 pt-5 ${!isModal && "border-t border-slate-200 dark:border-slate-800"}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !fullBill}
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <Undo2 className="h-4 w-4" />
                    {isSubmitting ? "Processing..." : "Process Return"}
                </button>
            </div>
        </form>
    );
}
