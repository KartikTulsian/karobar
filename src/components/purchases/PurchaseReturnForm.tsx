"use client";

import { usePurchaseOrder, usePurchaseOrders } from '@/hooks/usePurchases';
import { PurchaseReturnFormData, purchaseReturnSchema } from '@/lib/validations/purchaseReturnSchema';
import { PurchaseReturnWithDetails } from '@/types/purchases';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Search, Undo2 } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { Path, Resolver, useFieldArray, useForm } from 'react-hook-form';

interface PurchaseReturnFormProps {
    tenantId: string;
    isModal?: boolean;
    defaultValues?: PurchaseReturnWithDetails | null;
    onCancel: () => void;
    onSubmit: (data: PurchaseReturnFormData) => void;
}

export default function PurchaseReturnForm({ tenantId, isModal = false, defaultValues, onCancel, onSubmit }: PurchaseReturnFormProps) {

    const { data: purchaseOrders = [], isLoading: loadingPOs } = usePurchaseOrders(tenantId);

    const [poSearch, setPoSearch] = useState(defaultValues?.purchase_orders?.po_number || "");
    const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
    // const [selectedPoDetails, setSelectedPoDetails] = useState<PurchaseOrderDetail | null>(null);
    // const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<PurchaseReturnFormData>({
        resolver: zodResolver(purchaseReturnSchema) as Resolver<PurchaseReturnFormData>,
        defaultValues: {
            id: defaultValues?.id,
            original_po_id: defaultValues?.original_po_id || "",
            reason: defaultValues?.reason || "",
            refund_method: defaultValues?.refund_method || "credit_note",
            refund_amount: defaultValues?.refund_amount || 0,
            return_items: [],
        }
    })

    const { fields, replace } = useFieldArray({
        control,
        name: "return_items"
    });

    // const watchRefundMethod = watch("refund_method");
    const watchOriginalPoId = watch("original_po_id");

    const { data: fullPo, isLoading: isFetchingDetails } = usePurchaseOrder(tenantId, watchOriginalPoId);

    useEffect(() => {
        if (fullPo) {
            console.log("[DEBUG - UI] fullPo loaded:", fullPo.po_number);

            const mappedItems = fullPo.po_line_items.map(item => {
                // In edit mode, check if we previously returned this item
                const existingReturnItem = defaultValues?.return_items?.find(
                    ri => ri.po_line_item_id === item.id
                );

                return {
                    po_line_item_id: item.id,
                    item_id: item.item_id,
                    item_name: item.item_name,
                    received_qty: item.qty_received, // Max allowed to return
                    unit_cost: item.unit_cost,
                    discount_pct: item.discount_pct || 0,
                    gst_rate: item.gst_rate,
                    return_qty: existingReturnItem ? existingReturnItem.return_qty : 0,
                    refund_total: existingReturnItem ? existingReturnItem.refund_amount : 0
                };
            });
            replace(mappedItems);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullPo?.id]);

    const watchReturnItems = watch("return_items");

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: Path<PurchaseReturnFormData>,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            setValue(fieldName, fallback, { shouldValidate: true });
        }
        rhfBlur(e);
    };

    const currentTotalRefund = (() => {
        if (!watchReturnItems || !fullPo) return 0;

        let rawRefundTotal = 0;
        let originalGrossTotal = 0;

        // 1. Calculate Original Gross Total (for proportional math)
        fullPo.po_line_items.forEach(item => {
            originalGrossTotal += Number(item.line_total);
        });

        // 2. Calculate raw refund accounting for line-item discounts
        watchReturnItems.forEach(item => {
            const safeQty = Math.min(Number(item.return_qty) || 0, item.received_qty);
            if (safeQty > 0) {
                const baseAmount = safeQty * item.unit_cost;
                const afterLineDiscount = baseAmount - (baseAmount * ((item.discount_pct || 0) / 100));
                const gstAmount = afterLineDiscount * (item.gst_rate / 100);
                
                rawRefundTotal += (afterLineDiscount + gstAmount);
            }
        });

        // 3. Deduct proportional global discount
        const originalGlobalDiscount = Number(fullPo.discount_amount) || 0;
        let finalRefund = rawRefundTotal;

        if (originalGlobalDiscount > 0 && originalGrossTotal > 0) {
            const refundWeight = rawRefundTotal / originalGrossTotal;
            const discountReduction = originalGlobalDiscount * refundWeight;
            finalRefund = rawRefundTotal - discountReduction;
        }

        return Number(finalRefund.toFixed(2));
    })();

    useEffect(() => {
        setValue("refund_amount", currentTotalRefund, { shouldValidate: currentTotalRefund > 0 });
    }, [currentTotalRefund, setValue]);

    const handleSelectPO = (poId: string, poNumber: string) => {
        setIsPoDropdownOpen(false);
        setPoSearch(poNumber);
        setValue("original_po_id", poId, { shouldValidate: true });
        setFormError(null);
        replace([]);
    };

    const handleFormSubmit = (data: PurchaseReturnFormData) => {
        setFormError(null);
        let rawRefundTotal = 0;

        const processedItems = data.return_items.map(item => {
            // Clamp quantity to prevent returning more than was received
            const safeQty = Math.min(Number(item.return_qty) || 0, item.received_qty);
            
            const baseAmount = safeQty * item.unit_cost;
            const afterLineDiscount = baseAmount - (baseAmount * ((item.discount_pct || 0) / 100));
            const gstAmount = afterLineDiscount * (item.gst_rate / 100);
            const lineRefund = afterLineDiscount + gstAmount;

            rawRefundTotal += lineRefund;

            return {
                ...item,
                return_qty: safeQty,
                refund_total: Number(lineRefund.toFixed(2))
            };
        });

        // Proportional global discount deduction for the final submission
        let finalRefund = rawRefundTotal;
        const originalGlobalDiscount = Number(fullPo?.discount_amount) || 0;
        const originalGrossTotal = fullPo?.po_line_items.reduce((sum, i) => sum + Number(i.line_total), 0) || 0;

        if (originalGlobalDiscount > 0 && originalGrossTotal > 0) {
            const refundWeight = rawRefundTotal / originalGrossTotal;
            finalRefund = rawRefundTotal - (originalGlobalDiscount * refundWeight);
        }

        const itemsBeingReturned = processedItems.filter(i => i.return_qty > 0);
        if (itemsBeingReturned.length === 0) {
            setFormError("You must specify at least one item to return with a quantity greater than 0.");
            return;
        }

        const finalData: PurchaseReturnFormData = {
            ...data,
            return_items: processedItems,
            refund_amount: Number(finalRefund.toFixed(2))
        };

        onSubmit(finalData);
    };

    const filteredPOs = purchaseOrders.filter(po =>
        po.po_number.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.suppliers?.name?.toLowerCase().includes(poSearch.toLowerCase())
    );

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

    const isEditMode = !!defaultValues?.id;
    const originalRefund = defaultValues?.refund_amount || 0;
    const refundDifference = currentTotalRefund - originalRefund;

    if (loadingPOs) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm font-medium text-slate-500">Loading purchase orders...</span>
            </div>
        );
    }

    return (
        <form 
            onSubmit={handleSubmit(handleFormSubmit)} 
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className={containerClass}
        >
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-slate-100 pb-6 dark:border-slate-800">
                <div className="md:col-span-8 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Purchase Order Details
                    </h3>
                    
                    <div className="flex flex-col gap-1 relative z-50">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Search Original PO *</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                                type="text"
                                value={poSearch}
                                placeholder="Search by PO Number or Supplier..."
                                onChange={(e) => {
                                    setPoSearch(e.target.value);
                                    setIsPoDropdownOpen(true);
                                    setValue("original_po_id", "");
                                    replace([]);
                                }}
                                onFocus={() => setIsPoDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setIsPoDropdownOpen(false), 200)}
                                className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 bg-white text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                        
                        {isPoDropdownOpen && (
                            <ul className="absolute top-[65px] left-0 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                {filteredPOs.length > 0 ? (
                                    filteredPOs.map(po => (
                                        <li 
                                            key={po.id}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectPO(po.id, po.po_number); }}
                                            className="cursor-pointer px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 border-b border-slate-100 last:border-0 flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-slate-200">{po.po_number}</div>
                                                <div className="text-xs text-slate-500">{po.suppliers?.name}</div>
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">₹{po.total_amount}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-3 text-sm text-slate-500">No purchase orders found.</li>
                                )}
                            </ul>
                        )}
                        {errors.original_po_id && <span className="text-xs text-red-500">{errors.original_po_id.message}</span>}
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

                {/* RIGHT: Original PO Info Card */}
                <div className="md:col-span-4">
                    {fullPo ? (
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 mt-6 md:mt-8">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Original PO Summary</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Supplier:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{fullPo.suppliers?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">PO Date:</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{new Date(fullPo.order_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">PO Total:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">₹{fullPo.total_amount.toFixed(2)}</span>
                                </div>
                                {fullPo.amount_paid > 0 && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                        <span className="font-medium">Amount Paid:</span>
                                        <span className="font-bold">- ₹{fullPo.amount_paid.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-800 dark:text-slate-300 font-bold uppercase tracking-wider text-xs">Balance Due:</span>
                                    <span className="font-black text-orange-600 dark:text-orange-400 text-lg">₹{fullPo.amount_due.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[120px] rounded-lg border border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20 flex items-center justify-center text-sm text-slate-400 mt-6 md:mt-8">
                            Select a PO to view details
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 2: Return Items Table */}
            {isFetchingDetails ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium text-slate-500">Loading line items...</span>
                </div>
            ) : fullPo && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Select Items to Return</h3>
                    </div>

                    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Item Name</th>
                                    <th className="px-4 py-3 font-medium text-center">Qty Received</th>
                                    <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                                    <th className="px-4 py-3 font-medium text-center text-orange-600 bg-orange-50 dark:bg-orange-500/10">Return Qty</th>
                                    <th className="px-4 py-3 font-medium text-right text-orange-600 bg-orange-50 dark:bg-orange-500/10">Refund (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {fields.map((field, index) => {
                                    const returnQtyReg = register(`return_items.${index}.return_qty`, { valueAsNumber: true });
                                    
                                    const currentQty = Number(watchReturnItems?.[index]?.return_qty) || 0;
                                    const maxQty = field.received_qty;
                                    const isOverReturn = currentQty > maxQty;

                                    const base = currentQty * field.unit_cost;
                                    const refund = base + (base * (field.gst_rate / 100));

                                    return (
                                        <tr key={field.id} className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                {/* Hidden inputs bind the background data so it successfully reaches the API */}
                                                <input type="hidden" {...register(`return_items.${index}.po_line_item_id`)} />
                                                <input type="hidden" {...register(`return_items.${index}.item_id`)} />
                                                <input type="hidden" {...register(`return_items.${index}.item_name`)} />
                                                <input type="hidden" {...register(`return_items.${index}.received_qty`, { valueAsNumber: true })} />
                                                <input type="hidden" {...register(`return_items.${index}.unit_cost`, { valueAsNumber: true })} />
                                                <input type="hidden" {...register(`return_items.${index}.gst_rate`, { valueAsNumber: true })} />
                                                
                                                {field.item_name}
                                                {field.gst_rate > 0 && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">GST {field.gst_rate}%</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                                {field.received_qty}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                                ₹ {field.unit_cost.toFixed(2)}
                                            </td>
                                            <td className="px-2 py-2 bg-orange-50/30 dark:bg-orange-500/5 align-top pt-2.5">
                                                <div className="flex flex-col gap-1 items-center w-full">
                                                    <input 
                                                        type="number" 
                                                        step="0.001" 
                                                        min="0"
                                                        {...returnQtyReg}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            // Clamp logic: Prevent typing more than was originally received
                                                            if (val > maxQty) {
                                                                e.target.value = String(maxQty);
                                                            }
                                                            returnQtyReg.onChange(e); // Trigger RHF
                                                        }}
                                                        onFocus={(e) => handleFocusClear(e, '0')}
                                                        onBlur={(e) => handleBlurRestore(e, `return_items.${index}.return_qty`, 0, returnQtyReg.onBlur)}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className={`w-full max-w-[100px] text-center rounded border px-2 py-1.5 text-sm font-medium outline-none focus:ring-1 dark:bg-slate-800 ${
                                                            isOverReturn 
                                                            ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10' 
                                                            : 'border-orange-200 text-orange-700 focus:border-orange-500 dark:border-orange-500/30 dark:text-orange-400'
                                                        }`}
                                                    />
                                                    {/* INLINE ERROR RENDER */}
                                                    {isOverReturn && (
                                                        <span className="text-[10px] font-bold text-red-500 leading-none">
                                                            Max: {maxQty}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-500/5">
                                                ₹ {refund.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {formError && <span className="text-sm font-medium text-red-500">{formError}</span>}
                    {errors.return_items && <p className="text-xs text-red-500 mt-1">{errors.return_items.message}</p>}
                </div>
            )}

            {/* SECTION 3: Refund Resolution */}
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
                                <span className={`text-xl font-black ${
                                    refundDifference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 
                                    refundDifference < 0 ? 'text-rose-600 dark:text-rose-400' : 
                                    'text-slate-500'
                                }`}>
                                    {refundDifference > 0 ? '+ ' : refundDifference < 0 ? '- ' : ''}₹ {Math.abs(refundDifference).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="rounded-lg bg-orange-50 p-5 border border-orange-100 dark:bg-orange-500/5 dark:border-orange-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-orange-800 dark:text-orange-300">How is the supplier refunding this? *</label>
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
                    <div className={`p-4 rounded-xl border flex items-start gap-3 mt-1 animate-in fade-in slide-in-from-top-2 ${
                        refundDifference > 0 
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
                                    ? <>You are returning MORE items to the supplier. An additional <strong>₹{Math.abs(refundDifference).toFixed(2)}</strong> will be refunded or adjusted by the supplier.</>
                                    : <>You are reducing the return. You are keeping <strong>₹{Math.abs(refundDifference).toFixed(2)}</strong> worth of items from the previous return. This amount will be added back to your payable balance.</>
                                }
                            </p>
                        </div>
                    </div>
                )}

                {fullPo && (isEditMode ? refundDifference : currentTotalRefund) > fullPo.amount_due && fullPo.amount_due > 0 && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 flex items-start gap-3 mt-1 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Refund Exceeds Outstanding Balance</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                                The new adjustment covers the entire remaining balance of this PO (<strong>₹{fullPo.amount_due.toFixed(2)}</strong>). 
                                This order will be automatically marked as <strong>Paid</strong>, and the excess will be credited directly to your supplier account as an advance.
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
                    disabled={isSubmitting || !fullPo}
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <Undo2 className="h-4 w-4" />
                    {isSubmitting ? "Processing..." : "Process Return"}
                </button>
            </div>
        </form>
    )
}
