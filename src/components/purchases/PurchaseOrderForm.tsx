"use client";

import { useInventory } from '@/hooks/useInventory';
import { useSuppliers } from '@/hooks/usePeople';
import { PurchaseOrderFormData, purchaseOrderSchema } from '@/lib/validations/purchaseOrderSchema';
import { InventoryItem } from '@/types/inventory';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useMemo, useState } from 'react'
import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import { FileMinus, FileText, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';

interface PurchaseOrderFormProps {
    type: "create" | "update";
    defaultValues?: Partial<PurchaseOrderFormData>;
    tenantId: string;
    isModal?: boolean;
    nextPoPreview?: string;
    onCancel: () => void;
    onSubmit: (data: PurchaseOrderFormData) => void;
}

const DEFAULT_LINE_ITEM = {
    item_name: "",
    hsn_code: "",
    unit: "Pcs",
    qty_ordered: 1,
    qty_received: 0,
    unit_cost: 0,
    batch_sell_price:0,
    discount_pct: 0,
    gst_rate: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    line_total: 0,
    sort_order: 0,
};

export default function PurchaseOrderForm({ type, defaultValues, tenantId, isModal = false, nextPoPreview, onCancel, onSubmit }: PurchaseOrderFormProps) {

    const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers(tenantId);
    const { data: inventory = [], isLoading: loadingInventory } = useInventory(tenantId);

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // 1. Calculate safe initial values exactly ONCE when the form mounts
    const initialFormValues = useMemo(() => {
        const baseValues = {
            // po_number: "",
            status: "draft",
            payment_status: "unpaid",
            payment_method: "credit",
            order_date: getLocalDateString(new Date().toISOString()),
            is_gst_supply: false,
            is_interstate: false,
            round_off: 0,
            discount_amount: 0,
            amount_paid: 0,
            vehicle_no: "",
            reference_name: "",
            terms_conditions: "",
            po_line_items: [{ ...DEFAULT_LINE_ITEM }],
        };

        if (!defaultValues || Object.keys(defaultValues).length === 0) {
            return baseValues as Partial<PurchaseOrderFormData>;
        }

        return {
            ...baseValues,
            ...defaultValues,
            vehicle_no: defaultValues.vehicle_no || "",
            reference_name: defaultValues.reference_name || "",
            terms_conditions: defaultValues.terms_conditions || "",
            discount_amount: Number(defaultValues.discount_amount) || 0,
            round_off: Number(defaultValues.round_off) || 0,
            is_gst_supply: Boolean(defaultValues.is_gst_supply),
            is_interstate: Boolean(defaultValues.is_interstate),
            payment_status: defaultValues.payment_status || "unpaid",
            payment_method: defaultValues.payment_method || "credit",
            amount_paid: Number(defaultValues.amount_paid) || 0,
            po_line_items: defaultValues.po_line_items?.map((item, index) => ({
                ...DEFAULT_LINE_ITEM,
                ...item,
                batch_sell_price: Number(item.batch_sell_price) || 0, 
                unit_cost: Number(item.unit_cost) || 0,
                discount_pct: Number(item.discount_pct) || 0,
                gst_rate: Number(item.gst_rate) || 0,
                sort_order: index
            })) || [{ ...DEFAULT_LINE_ITEM }]
        } as Partial<PurchaseOrderFormData>;
    }, [defaultValues]);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        getValues,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<PurchaseOrderFormData>({
        resolver: zodResolver(purchaseOrderSchema) as Resolver<PurchaseOrderFormData>,
        defaultValues: initialFormValues,
    });

    useEffect(() => {
        if (type === "update" && defaultValues && Object.keys(defaultValues).length > 0) {
            reset(initialFormValues as PurchaseOrderFormData);
        }
    }, [initialFormValues, reset, type, defaultValues]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "po_line_items",
    });

    const watchItems = watch("po_line_items");
    const watchIsGstSupply = watch("is_gst_supply");
    const watchIsInterstate = watch("is_interstate");
    const watchDiscount = watch("discount_amount") || 0;
    const watchRoundOff = Number(watch("round_off")) || 0;
    const watchAmountPaid = watch("amount_paid") || 0;
    const watchStatus = watch("status");
    const watchPaymentStatus = watch("payment_status");

    useEffect(() => {
        if (watchStatus === "received") {
            const currentItems = getValues("po_line_items");

            // Auto-fill all received quantities to match ordered quantities
            currentItems.forEach((item, index) => {
                if (item.qty_received !== item.qty_ordered) {
                    setValue(`po_line_items.${index}.qty_received`, item.qty_ordered, { shouldValidate: true, shouldDirty: true });
                }
            });

            // Auto-fill Received Date to today if it's empty
            if (!getValues("received_date")) {
                setValue("received_date", getLocalDateString(new Date().toISOString()), { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [watchStatus, setValue, getValues]);

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: string,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            // Explicit typeassertion to keep react-hook-form happy without any strings
            setValue(fieldName as unknown as "round_off", fallback, { shouldValidate: true });
        }
        rhfBlur(e);
    };

    const VALID_UNITS = ["Pcs", "Set", "Kg", "Litre", "Ml", "Mtr", "Box", "Pack", "Dozen", "Gm"];

    const handleSelectItem = (invItem: InventoryItem, index: number) => {
        setValue(`po_line_items.${index}.item_id`, invItem.id);
        setValue(`po_line_items.${index}.item_name`, invItem.name, { shouldValidate: true });
        
        const batches = invItem.batches || [];
        // Sort by created_at descending to put the newest batch at index 0
        const sortedBatches = [...batches].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latestBuyPrice = sortedBatches.length > 0 ? sortedBatches[0].buy_price : 0;

        setValue(`po_line_items.${index}.unit_cost`, latestBuyPrice, { shouldValidate: true });
        setValue(`po_line_items.${index}.batch_sell_price`, invItem.default_sell_price || 0, { shouldValidate: true });

        setValue(`po_line_items.${index}.hsn_code`, invItem.hsn_code || "");

        let rawUnit = invItem.unit || "Pcs";
        if (rawUnit.toLowerCase() === 'ltr' || rawUnit.toLowerCase() === 'l') rawUnit = "Litre";
        const formattedUnit = rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase();

        setValue(`po_line_items.${index}.unit`, VALID_UNITS.includes(formattedUnit) ? formattedUnit : "Pcs");

        setValue(`po_line_items.${index}.gst_rate`, watchIsGstSupply ? (invItem.gst_rate || 0) : 0);
        setValue(`po_line_items.${index}.qty_ordered`, 1, { shouldValidate: true });
        setActiveDropdown(null);
    };

    const calculateTools = () => {
        let subtotal = 0;
        let cgst_total = 0;
        let sgst_total = 0;
        let igst_total = 0;

        const isFulfilling = watchStatus === "partial" || watchStatus === "received";

        const updatedItems = watchItems.map((item, index) => {
            const orderedQty = Number(item.qty_ordered) || 0;
            const receivedQty = Number(item.qty_received) || 0;
            const calculationQty = isFulfilling ? receivedQty : orderedQty;

            // const qty = Number(item.qty_ordered) || 0;
            const price = Number(item.unit_cost) || 0;
            const discPct = Number(item.discount_pct) || 0;
            const gst = watchIsGstSupply ? (Number(item.gst_rate) || 0) : 0;

            // const baseAmount = qty * price;
            const baseAmount = calculationQty * price;
            const itemDiscount = baseAmount * (discPct / 100);
            const taxableAmount = Number((baseAmount - itemDiscount).toFixed(2));

            let cgst = 0, sgst = 0, igst = 0;

            if (watchIsGstSupply && gst > 0) {
                if (watchIsInterstate) {
                    igst = Number((taxableAmount * (gst / 100)).toFixed(2));
                    // igst_total += igst;
                } else {
                    cgst = Number((taxableAmount * ((gst / 2) / 100)).toFixed(2));
                    sgst = Number((taxableAmount * ((gst / 2) / 100)).toFixed(2));
                    // cgst_total += cgst;
                    // sgst_total += sgst;
                }
            }

            const line_total = Number((taxableAmount + cgst + sgst + igst).toFixed(2));
            subtotal += taxableAmount;
            cgst_total += cgst;
            sgst_total += sgst;
            igst_total += igst;

            return { ...item, discount_pct: discPct, gst_rate: gst, cgst, sgst, igst, line_total, sort_order: index };
        });

        subtotal = Number((subtotal - watchDiscount).toFixed(2));
        cgst_total = Number(cgst_total.toFixed(2));
        sgst_total = Number(sgst_total.toFixed(2));
        igst_total = Number(igst_total.toFixed(2));

        const raw_total_amount = subtotal + cgst_total + sgst_total + igst_total;
        const total_amount = Number((raw_total_amount + watchRoundOff).toFixed(2));
        const amount_due = Number(Math.max(0, total_amount - Number(watchAmountPaid)).toFixed(2));

        return { updatedItems, subtotal, cgst_total, sgst_total, igst_total, total_amount, amount_due };
    };

    const totals = calculateTools();

    useEffect(() => {
        setValue("subtotal", totals.subtotal);
        setValue("cgst_total", totals.cgst_total);
        setValue("sgst_total", totals.sgst_total);
        setValue("igst_total", totals.igst_total);
        setValue("total_amount", totals.total_amount);
        setValue("amount_due", totals.amount_due);

        // totals.updatedItems.forEach((item, index) => {
        //     if (item.line_total !== watchItems[index].line_total || item.gst_rate !== watchItems[index].gst_rate || item.discount_pct !== watchItems[index].discount_pct) {
        //         setValue(`po_line_items.${index}.discount_pct`, item.discount_pct);
        //         setValue(`po_line_items.${index}.gst_rate`, item.gst_rate);
        //         setValue(`po_line_items.${index}.cgst`, item.cgst);
        //         setValue(`po_line_items.${index}.sgst`, item.sgst);
        //         setValue(`po_line_items.${index}.igst`, item.igst);
        //         setValue(`po_line_items.${index}.line_total`, item.line_total);
        //     }
        // });
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // }, [JSON.stringify(watchItems), watchIsGstSupply, watchIsInterstate, watchDiscount, watchAmountPaid, setValue]);
    }, [totals.subtotal, totals.cgst_total, totals.sgst_total, totals.igst_total, totals.total_amount, totals.amount_due, setValue]);

    useEffect(() => {
        if (watchPaymentStatus === "paid" && totals.total_amount > 0) {
            if (watchAmountPaid !== totals.total_amount) {
                setValue("amount_paid", totals.total_amount, { shouldValidate: true, shouldDirty: true });
            }
        } else if (watchPaymentStatus === "unpaid" && watchAmountPaid !== 0) {
            setValue("amount_paid", 0, { shouldValidate: true, shouldDirty: true });
        }
    }, [watchPaymentStatus, totals.total_amount, setValue, watchAmountPaid]);

    // const handleItemSearch = (query: string, index: number) => {
    //     if (!query.trim()) {
    //         setSearchResults(inventory.slice(0, 5));
    //     } else {
    //         const lowerQuery = query.toLowerCase();
    //         setSearchResults(
    //             inventory.filter(item => item.name.toLowerCase().includes(lowerQuery)).slice(0, 5)
    //         );
    //     }
    //     setActiveDropdown(index);
    // };



    // const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    //     setValue(`po_line_items.${index}.item_id`, null);
    //     handleItemSearch(e.target.value, index);
    // };

    const handleFormSubmit = (data: PurchaseOrderFormData) => {
        const finalData: PurchaseOrderFormData = {
            ...data,
            po_line_items: totals.updatedItems,
            subtotal: totals.subtotal,
            cgst_total: totals.cgst_total,
            sgst_total: totals.sgst_total,
            igst_total: totals.igst_total,
            total_amount: totals.total_amount,
            amount_due: totals.amount_due,
        };

        onSubmit(finalData);
    };

    // MATCHED WITH BILLFORM LOADING STATE
    if (loadingSuppliers || loadingInventory) {
        return (
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm font-medium text-slate-500">Loading purchase order data...</span>
            </div>
        );
    }

    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

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
            <input type="hidden" {...register("is_gst_supply")} />

            {/* SECTION 1: HEADER & SUPPLIER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Supplier & General Info */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-2 dark:border-slate-800">
                        Supplier & Order Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supplier *</label>
                            <select
                                {...register("supplier_id")}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">Select Supplier...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {errors.supplier_id && <p className="text-xs text-red-500">{errors.supplier_id.message}</p>}
                        </div>

                        <InputField 
                            label="PO Number" 
                            register={register} 
                            name="po_number" 
                            error={errors.po_number} 
                            inputProps={{ 
                                placeholder: type === "create" && nextPoPreview 
                                    ? `Auto: ${nextPoPreview}` 
                                    : "Auto-generated if empty",
                                onFocus: (e) => {
                                    if (type === "create" && nextPoPreview && !e.target.value) {
                                        setValue("po_number", nextPoPreview, { 
                                            shouldValidate: true, 
                                            shouldDirty: true 
                                        });
                                    }
                                }
                            }} 
                        />
                        <InputField label="Order Date *" type="date" register={register} name="order_date" error={errors.order_date} />
                        <InputField label="Expected Date" type="date" register={register} name="expected_date" error={errors.expected_date} />

                        <div className="col-span-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                            >
                                {showAdvanced ? "- Hide Dispatch Details" : "+ Add Dispatch / Reference Details"}
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 mt-1">
                                <InputField label="Dispatch Vehicle / LR No." name="vehicle_no" register={register} error={errors.vehicle_no} inputProps={{ placeholder: "e.g. HR-38-Transport" }} />
                                <InputField label="Reference / Transport Agency" name="reference_name" register={register} error={errors.reference_name} inputProps={{ placeholder: "e.g. VRL Logistics" }} />
                                <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Terms & Conditions</label>
                                    <textarea
                                        {...register("terms_conditions")}
                                        rows={2}
                                        placeholder="Specific terms for this purchase order..."
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status & Tax Toggles */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-2 dark:border-slate-800">
                        Order Settings
                    </h3>

                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">PO Status *</label>
                                <select {...register("status")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                    <option value="draft">Draft (Not Sent)</option>
                                    <option value="sent">Sent to Supplier</option>
                                    <option value="partial">Partially Received</option>
                                    <option value="received">Fully Received</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Conditionally show received date if status is partial or received */}
                            {(watchStatus === "partial" || watchStatus === "received") && (
                                <div className="col-span-2 sm:col-span-1">
                                    <InputField label="Received Date" type="date" register={register} name="received_date" error={errors.received_date} />
                                </div>
                            )}
                        </div>

                        {/* TAX TOGGLES (MATCHING BILLFORM UI) */}
                        <div className={`flex flex-col gap-3 rounded-lg border p-4 ${watchIsGstSupply ? 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-500/20 dark:bg-indigo-500/5' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                            <div className="flex items-center gap-2">
                                {watchIsGstSupply ? <ShieldCheck className="h-5 w-5 text-indigo-500" /> : <FileMinus className="h-5 w-5 text-slate-500" />}
                                <span className={`text-sm font-bold uppercase tracking-wider ${watchIsGstSupply ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {watchIsGstSupply ? 'GST Configuration Active' : 'Non-GST Purchase Order'}
                                </span>
                            </div>
                            {watchIsGstSupply && (
                                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-indigo-100 dark:border-indigo-500/20">
                                    <input
                                        type="checkbox"
                                        id="isInterstate"
                                        {...register("is_interstate")}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <label htmlFor="isInterstate" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                        Mark as Interstate Supply (Charge IGST exclusively)
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: LINE ITEMS TABLE */}
            <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Items to Order</h3>
                    {errors.po_line_items && <span className="text-xs font-medium text-red-500">{errors.po_line_items.root?.message}</span>}
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
                    <span className="font-semibold block mb-1">💡 Discount Calculation Helpers:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                        <li><strong>Successive Discounts (e.g., 16% + 5.5%):</strong> Combine into one: <code>(1 - ((1 - 0.16) × (1 - 0.055))) × 100</code> = 20.62%</li>
                        <li><strong>Hidden Discount (Final amount given instead of %):</strong> Find the difference: <code>(1 - (Final Amount / (Qty × Rate))) × 100</code></li>
                    </ul>
                </div>

                <div className="w-full overflow-visible rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 font-medium">Item Details *</th>
                                <th className="px-4 py-3 font-medium w-40">Ordered Qty & Unit</th>
                                <th className="px-4 py-3 font-medium w-24 text-indigo-600">Received</th>
                                <th className="px-4 py-3 font-medium w-32">Unit Cost (Buy) (₹)</th>
                                <th className="px-4 py-3 font-medium w-32 text-emerald-600">Target Sell Price</th>
                                <th className="px-4 py-3 font-medium w-24">Disc %</th>
                                {watchIsGstSupply && <th className="px-4 py-3 font-medium w-24">GST %</th>}
                                <th className="px-4 py-3 font-medium text-right w-32">Total (₹)</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {fields.map((field, index) => {
                                const { onChange, onBlur, ...restRegister } = register(`po_line_items.${index}.item_name`);
                                const qtyReg = register(`po_line_items.${index}.qty_ordered`, { valueAsNumber: true });

                                const qtyReceivedReg = register(`po_line_items.${index}.qty_received`, { valueAsNumber: true });

                                const priceReg = register(`po_line_items.${index}.unit_cost`, { valueAsNumber: true });
                                const discReg = register(`po_line_items.${index}.discount_pct`, { valueAsNumber: true });
                                const gstReg = watchIsGstSupply ? register(`po_line_items.${index}.gst_rate`, { valueAsNumber: true }) : null;

                                const orderedQty = watchItems?.[index]?.qty_ordered || 0;
                                const receivedQty = watchItems?.[index]?.qty_received || 0;
                                const isOverReceived = receivedQty > orderedQty;

                                const currentSearchValue = watchItems?.[index]?.item_name || "";
                                const searchLower = currentSearchValue.toLowerCase();

                                const alreadySelectedIds = (watchItems || [])
                                    .map((item, i) => i !== index ? item.item_id : null)
                                    .filter(Boolean);

                                const filteredItems = inventory
                                    .filter(i => i.name.toLowerCase().includes(searchLower))
                                    .sort((a, b) => {
                                        const aStarts = a.name.toLowerCase().startsWith(searchLower);
                                        const bStarts = b.name.toLowerCase().startsWith(searchLower);
                                        if (aStarts && !bStarts) return -1;
                                        if (!aStarts && bStarts) return 1;
                                        return 0;
                                    });

                                return (
                                    <tr key={field.id} className="bg-white dark:bg-slate-900">
                                        <td className="px-2 py-2 relative">
                                            <input type="hidden" {...register(`po_line_items.${index}.item_id`)} />

                                            <input
                                                {...restRegister}
                                                autoComplete="off"
                                                placeholder="Search item..."
                                                onFocus={() => setActiveDropdown(index)}
                                                onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                                                onChange={(e) => {
                                                    onChange(e);
                                                    setValue(`po_line_items.${index}.item_id`, null);
                                                    setActiveDropdown(index);
                                                }}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500"
                                            />

                                            {activeDropdown === index && currentSearchValue.length > 0 && (
                                                <ul className="absolute top-[45px] left-2 z-50 max-h-48 w-[250px] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                                    {filteredItems.map(item => {
                                                        const isAlreadySelected = alreadySelectedIds.includes(item.id);

                                                        const sortedBatches = [...(item.batches || [])].sort((a, b) => 
                                                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                                                        );
                                                        const displayBuyPrice = sortedBatches.length > 0 ? sortedBatches[0].buy_price : 0;
                                                        return (
                                                            <li
                                                                key={item.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    if (!isAlreadySelected) handleSelectItem(item, index);
                                                                }}
                                                                className={`px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-700 last:border-0 ${isAlreadySelected ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700'}`}
                                                            >
                                                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                                                    {item.name}
                                                                    {item.sku && (
                                                                        <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                                                            SKU: {item.sku}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center justify-between mt-0.5">
                                                                    <span className="text-xs font-semibold text-emerald-600">Buy: ₹{displayBuyPrice}</span>
                                                                    <span className={`text-[10px] font-bold px-1.5 rounded ${isAlreadySelected ? 'text-amber-600 bg-amber-100' : 'text-slate-400'}`}>
                                                                        {isAlreadySelected ? 'ALREADY ADDED' : `Stock: ${item.total_stock_qty}`}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex">
                                                    <input
                                                        type="number" step="0.001"
                                                        {...qtyReg}
                                                        onFocus={(e) => handleFocusClear(e, '1')}
                                                        onBlur={(e) => handleBlurRestore(e, `po_line_items.${index}.qty_ordered`, 1, qtyReg.onBlur)}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        className="w-16 rounded-l border border-slate-200 border-r-0 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500"
                                                    />
                                                    <select
                                                        {...register(`po_line_items.${index}.unit`)}
                                                        className="w-20 rounded-r border border-slate-200 px-1 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 uppercase tracking-wider"
                                                    >
                                                        <option value="Pcs">Pcs</option>
                                                        <option value="Set">Set</option>
                                                        <option value="Kg">Kg</option>
                                                        <option value="Litre">Litre</option>
                                                        <option value="Ml">Ml</option>
                                                        <option value="Mtr">Mtr</option>
                                                        <option value="Box">Box</option>
                                                        <option value="Pack">Pack</option>
                                                        <option value="Dozen">Dozen</option>
                                                        <option value="Gm">Gm</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 align-top pt-2.5">
                                            <div className="flex flex-col gap-1 w-full">
                                                <input
                                                    type="number" step="0.001"
                                                    {...qtyReceivedReg}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        // Clamp logic: Prevent typing more than ordered
                                                        if (val > orderedQty) {
                                                            e.target.value = String(orderedQty);
                                                        }
                                                        qtyReceivedReg.onChange(e); // Trigger RHF
                                                    }}
                                                    onFocus={(e) => handleFocusClear(e, '0')}
                                                    onBlur={(e) => handleBlurRestore(e, `po_line_items.${index}.qty_received`, 0, qtyReceivedReg.onBlur)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    className={`w-full rounded border px-2 py-1.5 text-sm font-medium outline-none focus:border-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 ${
                                                        isOverReceived 
                                                        ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10' 
                                                        : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                                    }`}
                                                />
                                                {/* INLINE ERROR RENDER */}
                                                {isOverReceived && (
                                                    <span className="text-[10px] font-bold text-red-500 leading-none">
                                                        Max allowed: {orderedQty}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number" step="0.01"
                                                {...priceReg}
                                                onFocus={(e) => handleFocusClear(e, '0')}
                                                onBlur={(e) => handleBlurRestore(e, `po_line_items.${index}.unit_cost`, 0, priceReg.onBlur)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500"
                                            />
                                        </td>

                                        <td className="px-2 py-2">
                                            <div className="flex flex-col gap-1 w-full">
                                                <input
                                                    type="number" step="0.01"
                                                    {...register(`po_line_items.${index}.batch_sell_price`, { valueAsNumber: true })}
                                                    onFocus={(e) => handleFocusClear(e, '0')}
                                                    onBlur={(e) => {
                                                        const rhfBlur = register(`po_line_items.${index}.batch_sell_price`).onBlur;
                                                        handleBlurRestore(e, `po_line_items.${index}.batch_sell_price`, 0, rhfBlur);
                                                    }}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    className={`w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors ${
                                                        (watchItems[index]?.batch_sell_price || 0) < (watchItems[index]?.unit_cost || 0) 
                                                        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300' 
                                                        : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                                                    }`}
                                                />
                                                {/* INLINE WARNING RENDER */}
                                                {(watchItems[index]?.batch_sell_price || 0) < (watchItems[index]?.unit_cost || 0) && (
                                                    <span className="text-[9px] font-bold text-red-500 leading-none">
                                                        ⚠️ Selling below cost
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-2 py-2">
                                            <input
                                                type="number" step="0.01"
                                                {...discReg}
                                                onFocus={(e) => handleFocusClear(e, '0')}
                                                onBlur={(e) => handleBlurRestore(e, `po_line_items.${index}.discount_pct`, 0, discReg.onBlur)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500"
                                            />
                                        </td>

                                        {watchIsGstSupply && gstReg && (
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number" step="0.01"
                                                    {...gstReg}
                                                    onFocus={(e) => handleFocusClear(e, '0')}
                                                    onBlur={(e) => handleBlurRestore(e, `po_line_items.${index}.gst_rate`, 0, gstReg.onBlur)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500"
                                                />
                                            </td>
                                        )}

                                        <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                                            {totals.updatedItems[index]?.line_total.toFixed(2)}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <button
                    type="button"
                    onClick={() => append({ ...DEFAULT_LINE_ITEM, sort_order: fields.length })}
                    className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 mt-2"
                >
                    <Plus className="h-4 w-4" /> Add Item Row
                </button>
            </div>

            {/* SECTION 3: SUMMARY & PAYMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Status *</label>
                            <select {...register("payment_status")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="unpaid">Unpaid</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partially Paid</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method *</label>
                            <select {...register("payment_method")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="credit">Credit / Pay Later</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="card">Card</option>
                                <option value="cheque">Cheque</option>
                                <option value="mixed">Mixed / Split</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Paid (₹)</label>
                        <input
                            type="number" step="0.01"
                            {...register("amount_paid", { valueAsNumber: true })}
                            onFocus={(e) => handleFocusClear(e, '0')}
                            onBlur={(e) => {
                                if (e.target.value === '') {
                                    e.target.value = '0';
                                    setValue('amount_paid', 0);
                                }
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Additional Notes</label>
                        <textarea
                            {...register("notes")}
                            rows={3}
                            placeholder="Terms, shipping instructions..."
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-5 dark:bg-slate-800/50">
                    <div className="flex flex-col gap-3 text-sm">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Subtotal</span>
                            <span className="font-medium">₹ {totals.subtotal.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-slate-600 dark:text-slate-400 items-center">
                            <span>Global Discount Amount</span>
                            <input
                                type="number" step="0.01" min="0"
                                {...register("discount_amount", { valueAsNumber: true })}
                                onFocus={(e) => handleFocusClear(e, '0')}
                                onBlur={(e) => {
                                    if (e.target.value === '') { e.target.value = '0'; setValue('discount_amount', 0); }
                                }}
                                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        {watchIsGstSupply && !watchIsInterstate && (
                            <>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>CGST Total</span>
                                    <span className="font-medium">₹ {totals.cgst_total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>SGST Total</span>
                                    <span className="font-medium">₹ {totals.sgst_total.toFixed(2)}</span>
                                </div>
                            </>
                        )}

                        {watchIsGstSupply && watchIsInterstate && (
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>IGST Total</span>
                                <span className="font-medium">₹ {totals.igst_total.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-slate-600 dark:text-slate-400 items-center">
                            <span>Round Off (+/-)</span>
                            <input
                                type="number" step="0.01"
                                {...register("round_off", { valueAsNumber: true })}
                                onFocus={(e) => handleFocusClear(e, '0')}
                                onBlur={(e) => {
                                    if (e.target.value === '') { e.target.value = '0'; setValue('round_off', 0); }
                                }}
                                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>

                        <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white">
                            <span>Grand Total</span>
                            <span>₹ {totals.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-red-500 mt-2">
                            <span>Balance Due</span>
                            <span>₹ {totals.amount_due.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 4: ACTIONS */}
            <div className={`mt-2 flex items-center justify-end gap-3 pt-5 ${!isModal && "border-t border-slate-200 dark:border-slate-800"}`}>
                <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 transition-colors">
                    <FileText className="h-4 w-4" />
                    {isSubmitting ? "Processing..." : type === "create" ? "Save Purchase Order" : "Update Purchase Order"}
                </button>
            </div>
        </form>
    )
}