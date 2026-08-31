"use client";

import { BillFormData, billSchema } from '@/lib/validations/billSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileMinus, FileText, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react'
import { Path, Resolver, useFieldArray, useForm } from 'react-hook-form';
import InputField from '../common/InputField';
import { useCustomers } from '@/hooks/usePeople';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem, ItemBatch } from '@/types/inventory';
import { toast } from 'react-toastify';
import { useNavigation } from '@/hooks/useNavigation';
import { BatchAllocation } from '@/types/billing';
import { getLocalDateString } from '@/lib/utils';

interface BillFormProps {
    type: "create" | "update";
    defaultValues?: Partial<BillFormData>;
    tenantId: string;
    isModal?: boolean;
    nextBillPreview?: string;
    onCancel: () => void;
    onSubmit: (data: BillFormData) => void;
}

const DEFAULT_LINE_ITEM = {
    item_name: "",
    hsn_code: "",
    unit: "Pcs",
    qty: 1,
    unit_price: 0,
    discount_pct: 0,
    gst_rate: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    line_total: 0,
    sort_order: 0,
    total_buy_price: 0,
    line_profit: 0,
    batch_allocations: [],
    write_off_recovery: 0,
};

export default function BillForm({ type, defaultValues, tenantId, isModal = false, nextBillPreview, onCancel, onSubmit }: BillFormProps) {

    const { currentRole } = useNavigation();
    const { data: customers = [], isLoading: loadingCustomers } = useCustomers(tenantId);
    const { data: items = [], isLoading: loadingItems } = useInventory(tenantId);

    const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [activeBatchAllocator, setActiveBatchAllocator] = useState<number | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    //1. Initialize React hook form
    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<BillFormData>({
        resolver: zodResolver(billSchema) as Resolver<BillFormData>,
        defaultValues: {
            bill_date: getLocalDateString(new Date().toISOString()), // Today's date as default YYYY-MM-DD
            customer_type: "" as unknown as "registered",
            status: "" as unknown as "issued",
            payment_method: "credit",
            is_gst_bill: true,
            is_interstate: false,
            amount_paid: 0,
            round_off: 0,
            discount_amount: 0,
            total_profit: 0,
            vehicle_no: "",
            reference_name: "",
            terms_conditions: "",
            bill_line_items: [DEFAULT_LINE_ITEM],
            ...defaultValues,
        }
    });

    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) {
            reset({
                bill_date: getLocalDateString(new Date().toISOString()),
                customer_type: "" as unknown as "registered",
                status: "" as unknown as "issued",
                payment_method: "credit",
                amount_paid: 0,
                round_off: 0,
                discount_amount: 0,
                total_profit: 0,
                vehicle_no: "",
                reference_name: "",
                terms_conditions: "",
                bill_line_items: [DEFAULT_LINE_ITEM], // Ensures the array NEVER becomes undefined
                ...defaultValues
            } as BillFormData);

            if (defaultValues.customer_type === "registered" && defaultValues.customer_id) {
                const found = customers.find(c => c.id === defaultValues.customer_id);
                if (found) setCustomerSearch(found.name);
            }
        }
    }, [defaultValues, reset, customers]);

    //2. Initialize field array for dynamic line items
    const { fields, append, remove } = useFieldArray({
        control,
        name: "bill_line_items",
    });

    //3.watch form values for real-time math calculations
    const watchLineItems = watch("bill_line_items");
    const watchIsGst = watch("is_gst_bill");
    const watchIsInterstate = watch("is_interstate");
    const watchAmountPaid = Number(watch("amount_paid")) || 0;
    const watchGlobalDiscount = Number(watch("discount_amount")) || 0;
    const watchRoundOff = Number(watch("round_off")) || 0;
    const watchCustomerType = watch("customer_type");
    const watchStatus = watch("status");

    useEffect(() => {
        if (watchCustomerType === "flying" && type === "create") {
            // Auto-generate a random UUID for the new walk-in customer
            setValue("customer_id", crypto.randomUUID());
        } else if (type === "create" && watchCustomerType === "registered") {
            // Clear it out so they are forced to select from the dropdown
            setValue("customer_id", "");
        }
    }, [watchCustomerType, setValue, type]);

    const VALID_UNITS = ["Pcs", "Set", "Kg", "Litre", "Ml", "Mtr", "Box", "Pack", "Dozen", "Gm"];

    const getVirtualBatches = (itemId: string | null | undefined, lineItemId?: string) => {
        if (!itemId) return [];
        const invItem = items.find(i => i.id === itemId);
        if (!invItem) return [];

        const originalRowData = type === "update" && defaultValues?.bill_line_items
            ? defaultValues.bill_line_items.find(oli => oli.id === lineItemId)
            : null;

        return (invItem.batches || []).map(b => {
            const originallyHeld = originalRowData?.batch_allocations?.find(oba => oba.batch_id === b.id)?.qty || 0;
            return {
                ...b,
                stock_qty: b.stock_qty + Number(originallyHeld),
                _held_qty: Number(originallyHeld),
                _shelf_qty: b.stock_qty
            };
        }).filter(b => b.stock_qty > 0);
    };

    const getVirtualTotalStock = (itemId: string | null | undefined, lineItemId?: string) => {
        const virtualBatches = getVirtualBatches(itemId, lineItemId);
        return virtualBatches.reduce((sum, b) => sum + b.stock_qty, 0);
    };

    const autoAllocateFifo = (batches: ItemBatch[], neededQty: number): BatchAllocation[] => {
        let remaining = neededQty;
        const allocations: BatchAllocation[] = [];

        // Sort batches oldest first based on creation date
        const sortedBatches = [...batches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        for (const b of sortedBatches) {
            if (remaining <= 0) break;
            if (b.stock_qty > 0) {
                const take = Math.min(b.stock_qty, remaining);
                allocations.push({
                    batch_id: b.id,
                    qty: take,
                    buy_price: b.buy_price,
                    batch_number: b.batch_number || 'OPENING-STOCK'
                });
                remaining -= take;
            }
        }
        return allocations;
    };

    const handleItemSelect = (index: number, selectedItem: InventoryItem) => {
        setValue(`bill_line_items.${index}.item_id`, selectedItem.id);
        setValue(`bill_line_items.${index}.item_name`, selectedItem.name);
        // setValue(`bill_line_items.${index}.unit_price`, selectedItem.sell_price || 0);
        setValue(`bill_line_items.${index}.hsn_code`, selectedItem.hsn_code || "");

        // 1. Format the database unit to match dropdown options exactly
        let rawUnit = selectedItem.unit || "Pcs";
        // Handle common variations (e.g., Ltr -> Litre)
        if (rawUnit.toLowerCase() === 'ltr' || rawUnit.toLowerCase() === 'l') rawUnit = "Litre";

        const formattedUnit = rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase();

        // 2. Fallback to 'Pcs' if the database unit isn't in our standard list
        const finalUnit = VALID_UNITS.includes(formattedUnit) ? formattedUnit : "Pcs";

        setValue(`bill_line_items.${index}.unit`, finalUnit);

        setValue(`bill_line_items.${index}.gst_rate`, watchIsGst ? (selectedItem.gst_rate || 0) : 0);

        // setValue(`bill_line_items.${index}.qty`, 1, { shouldValidate: true, shouldDirty: true });

        const activeBatches = selectedItem.batches?.filter(b => b.stock_qty > 0) || [];

        const initialAllocations = autoAllocateFifo(activeBatches, 1);
        setValue(`bill_line_items.${index}.batch_allocations`, initialAllocations);

        // Use the catalog's default sell price as the unified selling price
        setValue(`bill_line_items.${index}.unit_price`, selectedItem.default_sell_price || 0);
        setValue(`bill_line_items.${index}.qty`, 1, { shouldValidate: true, shouldDirty: true });

        setActiveItemDropdown(null); // Close dropdown
    };

    const handleQtyChange = (index: number, newQty: number, selectedInventoryItem: InventoryItem | undefined) => {
        setValue(`bill_line_items.${index}.qty`, newQty, { shouldValidate: true });

        if (selectedInventoryItem) {
            const lineItemId = watchLineItems[index]?.id;
            const virtualBatches = getVirtualBatches(selectedInventoryItem.id, lineItemId);
            const newAllocations = autoAllocateFifo(virtualBatches as ItemBatch[], newQty);
            setValue(`bill_line_items.${index}.batch_allocations`, newAllocations);
        }
    };

    const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
        e.currentTarget.blur();
    };

    const handleFocusClear = (e: React.FocusEvent<HTMLInputElement>, fallback: string = '0') => {
        if (e.target.value === fallback) e.target.value = '';
    };

    const handleBlurRestore = (
        e: React.FocusEvent<HTMLInputElement>,
        fieldName: Path<BillFormData>,
        fallback: number = 0,
        rhfBlur: (event: React.FocusEvent<HTMLInputElement>) => void
    ) => {
        if (e.target.value === '') {
            e.target.value = String(fallback);
            // Explicit typeassertion to keep react-hook-form happy without any strings
            setValue(fieldName, fallback, { shouldValidate: true });
        }
        rhfBlur(e);
    };

    //4. Real time math engine (Calculates everything safely on the fly)
    const calculateTools = () => {
        let subtotal = 0;
        let cgst_total = 0;
        let sgst_total = 0;
        let igst_total = 0;

        let total_recovered_amount = 0;

        const processedItems = (watchLineItems || []).map((item, index) => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.unit_price) || 0;
            const discPct = Number(item.discount_pct) || 0;
            const gstRate = watchIsGst ? (Number(item.gst_rate) || 0) : 0;

            const baseTotal = qty * price;
            const discountAmt = baseTotal * (discPct / 100);
            const taxableValue = Number((baseTotal - discountAmt).toFixed(2));

            let cgst = 0, sgst = 0, igst = 0;
            if (watchIsGst && gstRate > 0) {
                if (watchIsInterstate) {
                    igst = Number((taxableValue * (gstRate / 100)).toFixed(2));
                } else {
                    cgst = Number((taxableValue * ((gstRate / 2) / 100)).toFixed(2));
                    sgst = Number((taxableValue * ((gstRate / 2) / 100)).toFixed(2));
                }
            }

            const line_total = Number((taxableValue + cgst + sgst + igst).toFixed(2));

            subtotal += taxableValue;
            cgst_total += cgst;
            sgst_total += sgst;
            igst_total += igst;

            // Batch Allocation & Profit Math
            let allocations = item.batch_allocations || [];
            const currentAllocQty = allocations.reduce((sum, a) => sum + Number(a.qty), 0);

            // Failsafe: If React Hook Form dropped the allocations or they don't match the Qty, recalculate safely
            if (currentAllocQty !== qty && item.item_id) {
                // const invItem = items.find(i => i.id === item.item_id);
                // const activeBatches = invItem?.batches?.filter(b => b.stock_qty > 0) || [];
                // allocations = autoAllocateFifo(activeBatches, qty);

                const virtualBatches = getVirtualBatches(item.item_id, item.id);
                allocations = autoAllocateFifo(virtualBatches as ItemBatch[], qty);
            }

            // Calculate Total Buy Price (COGS) from exact allocated batches
            const total_buy_price = Number(
                allocations.reduce((sum, a) => sum + (Number(a.qty) * Number(a.buy_price)), 0).toFixed(2)
            );

            // Calculate Profit (Taxable Value minus COGS)
            const line_profit = Number((taxableValue - total_buy_price).toFixed(2));

            let highest_batch_sell_price = 0;
            let line_write_off_recovery = 0;

            if (item.item_id) {
                const invItem = items.find(i => i.id === item.item_id);
                if (invItem) {
                    if (allocations.length > 0) {
                        // 1. Find the highest sell_price among the specifically allocated batches
                        allocations.forEach(alloc => {
                            const matchedBatch = invItem.batches?.find(b => b.id === alloc.batch_id);
                            if (matchedBatch && Number(matchedBatch.sell_price) > highest_batch_sell_price) {
                                highest_batch_sell_price = Number(matchedBatch.sell_price);
                            }
                        });
                    } else {
                        // 2. Fallback if no batches are allocated yet
                        highest_batch_sell_price = Number(invItem.default_sell_price || 0);
                    }
                }
            }

            if (highest_batch_sell_price > 0 && price > highest_batch_sell_price) {
                const extraPerUnit = price - highest_batch_sell_price;
                line_write_off_recovery = Number((extraPerUnit * qty).toFixed(2));
                total_recovered_amount += line_write_off_recovery;
            }

            return {
                ...item,
                gst_rate: gstRate,
                cgst,
                sgst,
                igst,
                line_total,
                sort_order: index,
                total_buy_price,
                line_profit,
                batch_allocations: allocations,
                write_off_recovery: line_write_off_recovery
            };
        });

        //Apply any global discount
        subtotal = Number((subtotal - watchGlobalDiscount).toFixed(2));
        cgst_total = Number(cgst_total.toFixed(2));
        sgst_total = Number(sgst_total.toFixed(2));
        igst_total = Number(igst_total.toFixed(2));

        const raw_grand_total = subtotal + cgst_total + sgst_total + igst_total;
        const grand_total = Number((raw_grand_total + watchRoundOff).toFixed(2));
        const amount_due = Number(Math.max(0, grand_total - watchAmountPaid).toFixed(2));

        // Aggregate total profit for the entire bill
        const total_profit = processedItems.reduce((sum, item) => sum + item.line_profit, 0);

        return { processedItems, subtotal, cgst_total, sgst_total, igst_total, grand_total, amount_due, total_profit, total_recovered_amount };
    }

    const totals = calculateTools();

    useEffect(() => {
        setValue("subtotal", totals.subtotal);
        setValue("cgst_total", totals.cgst_total);
        setValue("sgst_total", totals.sgst_total);
        setValue("igst_total", totals.igst_total);
        setValue("grand_total", totals.grand_total);
        setValue("amount_due", totals.amount_due);
    }, [totals.subtotal, totals.cgst_total, totals.sgst_total, totals.igst_total, totals.grand_total, totals.amount_due, setValue]);

    useEffect(() => {
        if (watchStatus === "paid" && totals.grand_total > 0) {
            setValue("amount_paid", totals.grand_total, { shouldValidate: true, shouldDirty: true });
        }
    }, [watchStatus, totals.grand_total, setValue]);

    const selectedCustomer = customers.find(c => c.id === watch("customer_id"));
    const currentDbWriteOff = selectedCustomer?.total_write_offs || 0;
    const hasWriteOffs = currentDbWriteOff > 0;

    const originalRecovery = type === "update"
        ? (defaultValues?.bill_line_items?.reduce((sum, item) => sum + (Number(item.write_off_recovery) || 0), 0) || 0)
        : 0;
    const newRecovery = totals.total_recovered_amount;
    const recoveryDelta = newRecovery - originalRecovery;
    const projectedRemainingDebt = Math.max(0, currentDbWriteOff - recoveryDelta);

    const getStockColor = (qty: number, threshold: number = 5) => {
        if (qty <= 0) return "text-red-600 bg-red-50 dark:bg-red-500/10";
        if (qty <= threshold) return "text-orange-600 bg-orange-50 dark:bg-orange-500/10";
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10";
    };

    //5. Submit handler (Injects the accurate math before sending to API)
    const handleFormSubmit = (data: BillFormData) => {
        if (data.customer_type === "registered" && !data.customer_id) {
            return;
        }

        const hasStockError = data.bill_line_items.some(item => {
            if (!item.item_id) return false;
            // const invItem = items.find(i => i.id === item.item_id);
            // return invItem && item.qty > invItem.total_stock_qty;
            const maxStock = getVirtualTotalStock(item.item_id, item.id);
            
            return item.qty > maxStock;
        });

        if (hasStockError) {
            toast.error("Please resolve stock errors before submitting the bill.");
            return;
        }

        const finalData: BillFormData = {
            ...data,
            bill_line_items: totals.processedItems, // Ensure accurate tax/sort_order per line
            subtotal: totals.subtotal,
            cgst_total: totals.cgst_total,
            sgst_total: totals.sgst_total,
            igst_total: totals.igst_total,
            grand_total: totals.grand_total,
            amount_due: totals.amount_due,
            total_profit: totals.total_profit,
        };
        onSubmit(finalData); // Pass to the parent! No backend code here.
    };

    if (loadingCustomers || loadingItems) {
        return (
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm font-medium text-slate-500">Loading bill data...</span>
            </div>
        );
    }

    // Wrapper classes adjust based on whether it's full-screen or inside an ActionModal
    const containerClass = isModal
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

    const filteredCustomers = customers.filter(c =>
        c.type === 'registered' &&
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            onKeyDown={(e) => {
                // Prevent form submission on Enter, unless typing in a textarea (like notes)
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }}
            className={containerClass}>
            <input type="hidden" {...register("is_gst_bill")} />

            {/* SECTION 1: BILL DETAILS & CUSTOMER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Customer & General Info */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-2 dark:border-slate-800">
                        Customer & General Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Customer Type</label>
                            <select
                                {...register("customer_type")}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2"
                            >
                                <option value="" disabled>Select Customer Type...</option>
                                <option value="registered">Registered Customer</option>
                                <option value="flying">Walk-in (Flying) Customer</option>
                            </select>
                            {errors.customer_type && <span className="text-xs text-red-500">{errors.customer_type.message}</span>}
                        </div>

                        {/* CONDITIONAL RENDER BASED ON TYPE */}
                        {watchCustomerType === "registered" && (
                            <div className="flex flex-col gap-1 col-span-2 relative">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Search & Select Customer *</label>

                                {/* Hidden input to store the actual UUID for the database */}
                                <input type="hidden" {...register("customer_id")} />

                                {/* Custom Search Input */}
                                <input
                                    type="text"
                                    value={customerSearch}
                                    placeholder="Search by name..."
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setIsCustomerDropdownOpen(true);
                                        setValue("customer_id", ""); // Clear ID if they edit the text
                                    }}
                                    onFocus={() => setIsCustomerDropdownOpen(true)}
                                    // Use setTimeout so the click event on the <li> registers before blur closes it
                                    onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2"
                                />

                                {/* Custom Customer Dropdown */}
                                {isCustomerDropdownOpen && (
                                    <ul className="absolute top-[65px] left-0 z-50 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                        {filteredCustomers.length > 0 ? (
                                            filteredCustomers.map(c => (
                                                <li
                                                    key={c.id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setValue("customer_id", c.id, { shouldValidate: true });
                                                        setCustomerSearch(c.name);
                                                        setIsCustomerDropdownOpen(false);
                                                    }}
                                                    className="cursor-pointer px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">{c.name}</div>
                                                    {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-4 py-3 text-sm text-slate-500">No customers found.</li>
                                        )}
                                    </ul>
                                )}
                                {errors.customer_id && <span className="text-xs text-red-500">{errors.customer_id.message}</span>}

                                {hasWriteOffs && (
                                    <div className="mt-1 flex flex-col gap-1 rounded bg-red-50 px-3 py-2 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                                {type === "update" ? "Current DB Write-offs:" : "Historical Write-offs:"}
                                            </span>
                                            <span className="text-sm font-bold text-red-700 dark:text-red-500">
                                                ₹ {currentDbWriteOff.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Shows real-time recovery if they charged extra above highest batch sell price */}
                                        {/* CREATE MODE UI */}
                                        {type === "create" && newRecovery > 0 && (
                                            <>
                                                <div className="flex items-center justify-between border-t border-red-200/50 pt-1 mt-1 dark:border-red-500/20">
                                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                        Recovering from Extra Amount:
                                                    </span>
                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-500">
                                                        - ₹ {newRecovery.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        Remaining Debt:
                                                    </span>
                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                                        ₹ {Math.max(0, currentDbWriteOff - newRecovery).toFixed(2)}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* UPDATE MODE UI */}
                                        {type === "update" && (originalRecovery > 0 || newRecovery > 0) && (
                                            <>
                                                <div className="flex items-center justify-between border-t border-red-200/50 pt-1 mt-1 dark:border-red-500/20">
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        Originally Recovered in Bill:
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-500">
                                                        ₹ {originalRecovery.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                        Net Change to Recovery:
                                                    </span>
                                                    <span className={`text-xs font-bold ${recoveryDelta >= 0 ? 'text-emerald-700 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`}>
                                                        {recoveryDelta >= 0 ? '+' : '-'} ₹ {Math.abs(recoveryDelta).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1 border-t border-red-200/50 mt-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        Projected Remaining Debt:
                                                    </span>
                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                                        ₹ {projectedRemainingDebt.toFixed(2)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {watchCustomerType === "flying" && (
                            <>
                                <InputField label="Customer Name *" name="customer_name" register={register} error={errors.customer_name} inputProps={{ placeholder: "e.g. John Doe" }} />
                                <InputField label="Phone Number" name="customer_phone" register={register} error={errors.customer_phone} inputProps={{ placeholder: "Optional" }} />
                            </>
                        )}

                        <InputField
                            label="Bill Number"
                            name="bill_number"
                            register={register}
                            error={errors.bill_number}
                            inputProps={{
                                placeholder: type === "create" && nextBillPreview
                                    ? `Auto: ${nextBillPreview}`
                                    : "Auto-generated if empty",
                                onFocus: (e) => {
                                    if (type === "create" && nextBillPreview && !e.target.value) {
                                        setValue("bill_number", nextBillPreview, {
                                            shouldValidate: true,
                                            shouldDirty: true
                                        });
                                    }
                                }
                            }}
                        />
                        <InputField label="Bill Date *" name="bill_date" type="date" register={register} error={errors.bill_date} />
                        <InputField label="Due Date" name="due_date" type="date" register={register} error={errors.due_date} />

                        <div className="col-span-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                            >
                                {showAdvanced ? "- Hide Reference / Vehicle Details" : "+ Add Reference / Vehicle Details"}
                            </button>
                        </div>
                        {showAdvanced && (
                            <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 mt-1">
                                <InputField label="Vehicle Reg. No." name="vehicle_no" register={register} error={errors.vehicle_no} inputProps={{ placeholder: "e.g. HR-26-XX-1234" }} />
                                <InputField label="Reference / Mechanic" name="reference_name" register={register} error={errors.reference_name} inputProps={{ placeholder: "e.g. Raju Garage" }} />
                                <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Terms & Conditions</label>
                                    <textarea
                                        {...register("terms_conditions")}
                                        rows={2}
                                        placeholder="Specific terms for this transaction (overrides default)..."
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
                        Billing Settings
                    </h3>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bill Status *</label>
                            <select {...register("status")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="" disabled>Select Status...</option>
                                <option value="issued">Issued (Unpaid)</option>
                                <option value="paid">Paid</option>
                                <option value="partial">Partially Paid</option>
                                <option value="draft">Draft</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            {errors.status && <span className="text-xs text-red-500">{errors.status.message}</span>}
                        </div>

                        {/* TAX TOGGLES */}
                        <div className="flex flex-col gap-3 rounded-lg border border-orange-100 bg-orange-50/50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
                            <div className="flex items-center gap-2">
                                {watchIsGst ? <ShieldCheck className="h-5 w-5 text-indigo-500" /> : <FileMinus className="h-5 w-5 text-slate-500" />}
                                <span className={`text-sm font-bold uppercase tracking-wider ${watchIsGst ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {watchIsGst ? 'GST Configuration Active' : 'Non-GST Bill Configuration'}
                                </span>
                            </div>

                            {watchIsGst && (
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
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Line Items</h3>
                    {errors.bill_line_items && <span className="text-xs font-medium text-red-500">{errors.bill_line_items.message}</span>}
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
                    <span className="font-semibold block mb-1">💡 Discount Calculation Helpers:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                        <li><strong>Successive Discounts (e.g., 16% + 5.5%):</strong> Combine into one: <code>(1 - ((1 - 0.16) × (1 - 0.055))) × 100</code> = 20.62%</li>
                        <li><strong>Hidden Discount (Final amount given instead of %):</strong> Find the difference: <code>(1 - (Final Amount / (Qty × Rate))) × 100</code></li>
                    </ul>
                </div>

                <datalist id="inventory-items-list">
                    {items.map((item) => (
                        <option key={item.id} value={item.name} />
                    ))}
                </datalist>

                <div className="w-full overflow-visible rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 font-medium">Item Name</th>
                                <th className="px-4 py-3 font-medium w-40">Qty & Unit</th>
                                <th className="px-4 py-3 font-medium w-32">Price (₹)</th>
                                <th className="px-4 py-3 font-medium w-24">Disc %</th>
                                {watchIsGst && <th className="px-4 py-3 font-medium w-24">GST %</th>}
                                <th className="px-4 py-3 font-medium text-right w-32">Total (₹)</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {fields.map((field, index) => {
                                const { onChange, onBlur, ...restRegister } = register(`bill_line_items.${index}.item_name`);

                                // Register destructing to intercept Focus/Blur for seamless UX
                                const qtyField = register(`bill_line_items.${index}.qty`, { valueAsNumber: true });

                                const priceReg = register(`bill_line_items.${index}.unit_price`, { valueAsNumber: true });
                                const discReg = register(`bill_line_items.${index}.discount_pct`, { valueAsNumber: true });
                                const gstReg = watchIsGst ? register(`bill_line_items.${index}.gst_rate`, { valueAsNumber: true }) : null;

                                const currentSearchValue = watchLineItems?.[index]?.item_name || "";
                                const searchLower = currentSearchValue.toLowerCase();
                                const currentItemId = watchLineItems?.[index]?.item_id;
                                // const currentBatchId = watchLineItems?.[index]?.batch_id;
                                const rowDbId = watchLineItems?.[index]?.id;

                                // Find real-time stock data for the selected item
                                const selectedInventoryItem = items.find(i => i.id === currentItemId);
                                const activeBatches = selectedInventoryItem?.batches?.filter(b => b.stock_qty > 0) || [];

                                const virtualBatches = getVirtualBatches(currentItemId, rowDbId);
                                const virtualTotalStock = getVirtualTotalStock(currentItemId, rowDbId);

                                // const selectedBatch = activeBatches.find(b => b.id === currentBatchId);
                                const maxStock = selectedInventoryItem ? virtualTotalStock : null;

                                const currentQty = watchLineItems[index]?.qty || 0;
                                const isOverStock = maxStock !== null && currentQty > maxStock;

                                const price = Number(watchLineItems[index]?.unit_price || 0);
                                const discPct = Number(watchLineItems[index]?.discount_pct || 0);
                                const effectivePrice = Number((price * (1 - discPct / 100)).toFixed(2));
                                const cost = Number(watchLineItems[index]?.total_buy_price || 0);

                                let marginStatus = "safe";
                                if (effectivePrice < cost) marginStatus = "loss";
                                else if (effectivePrice - cost <= 10) marginStatus = "low";

                                const totalColumnColor = marginStatus === 'loss' ? 'text-red-600 dark:text-red-500'
                                    : marginStatus === 'low' ? 'text-orange-600 dark:text-orange-500'
                                        : 'text-slate-900 dark:text-white';

                                const alreadySelectedIds = watchLineItems
                                    .map((item, i) => i !== index ? item.item_id : null)
                                    .filter(Boolean);

                                const filteredItems = items
                                    .filter(i => i.name.toLowerCase().includes(searchLower))
                                    .sort((a, b) => {
                                        // Prioritize items that START with the search term
                                        const aStarts = a.name.toLowerCase().startsWith(searchLower);
                                        const bStarts = b.name.toLowerCase().startsWith(searchLower);
                                        if (aStarts && !bStarts) return -1;
                                        if (!aStarts && bStarts) return 1;
                                        return 0; // If both or neither start with it, keep original order
                                    });

                                return (
                                    <tr key={field.id} className="bg-white dark:bg-slate-900">
                                        <td className="px-2 py-2 relative">
                                            <input type="hidden" {...register(`bill_line_items.${index}.item_id`)} />

                                            <input
                                                {...restRegister}
                                                autoComplete="off"
                                                placeholder="Search item..."
                                                onFocus={() => setActiveItemDropdown(index)}
                                                onBlur={(e) => {
                                                    onBlur(e);
                                                    setTimeout(() => setActiveItemDropdown(null), 200);
                                                }}
                                                onChange={(e) => {
                                                    onChange(e);
                                                    setValue(`bill_line_items.${index}.item_id`, null);
                                                    setValue(`bill_line_items.${index}.batch_allocations`, []);
                                                    setActiveItemDropdown(index);
                                                }}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500"
                                            />

                                            {selectedInventoryItem && (
                                                <div className="mt-1 flex items-center justify-between">
                                                    <span className={getStockColor(virtualTotalStock, selectedInventoryItem.low_stock_threshold) + " px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border border-slate-100 dark:border-slate-700 shadow-sm"}>
                                                        {type === "update" ? `Total Pool: ${virtualTotalStock}` : `Total Stock: ${virtualTotalStock}`}
                                                    </span>

                                                    {virtualBatches.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveBatchAllocator(activeBatchAllocator === index ? null : index)}
                                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded dark:bg-indigo-500/10 dark:text-indigo-400 transition-colors"
                                                        >
                                                            View / Edit Batches
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* NEW: The Manual Batch Allocator Popover */}
                                            {activeBatchAllocator === index && selectedInventoryItem && (
                                                <div className="absolute left-0 top-[65px] z-50 w-[320px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2 dark:border-slate-700">
                                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Manual Batch Allocation</h4>
                                                        <button type="button" onClick={() => setActiveBatchAllocator(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                                                    </div>

                                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                                        {virtualBatches.map(batch => {
                                                            // Find if this batch is currently allocated
                                                            const currentAllocations = watchLineItems[index]?.batch_allocations || [];
                                                            const alloc = currentAllocations.find((a: BatchAllocation) => a.batch_id === batch.id);
                                                            const allocQty = alloc ? alloc.qty : 0;

                                                            return (
                                                                <div key={batch.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                                            {batch.batch_number || 'OPENING-STOCK'}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-500">
                                                                            Cost: ₹{batch.buy_price} |
                                                                            {type === "update" && batch._held_qty > 0
                                                                                ? ` Shelf: ${batch._shelf_qty} + Held: ${batch._held_qty} = Avail: ${batch.stock_qty}`
                                                                                : ` Avail: ${batch.stock_qty}`
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] font-medium text-slate-500">Qty:</span>
                                                                        <input
                                                                            type="number" min="0" max={batch.stock_qty} step="0.001"
                                                                            value={allocQty || ''}
                                                                            onChange={(e) => {
                                                                                const newQty = Number(e.target.value) || 0;
                                                                                let updatedAllocations = [...currentAllocations];

                                                                                // Remove existing entry for this batch
                                                                                updatedAllocations = updatedAllocations.filter((a: BatchAllocation) => a.batch_id !== batch.id);

                                                                                // Add back if qty > 0
                                                                                if (newQty > 0) {
                                                                                    updatedAllocations.push({
                                                                                        batch_id: batch.id,
                                                                                        qty: Math.min(newQty, batch.stock_qty), // Gatekeeper
                                                                                        buy_price: batch.buy_price,
                                                                                        batch_number: batch.batch_number
                                                                                    });
                                                                                }
                                                                                setValue(`bill_line_items.${index}.batch_allocations`, updatedAllocations);
                                                                            }}
                                                                            className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs text-right outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>

                                                    {/* Allocation Summary & Warning */}
                                                    {(() => {
                                                        const totalAllocated = (watchLineItems[index]?.batch_allocations || []).reduce((sum: number, a: BatchAllocation) => sum + Number(a.qty), 0);
                                                        const isMismatch = Math.abs(totalAllocated - currentQty) > 0.001;
                                                        return (
                                                            <div className={`mt-2 p-1.5 rounded text-[10px] font-bold text-center border ${isMismatch ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                                {isMismatch ? `⚠️ Mismatch: Needed ${currentQty}, Allocated ${totalAllocated}` : `Perfectly Allocated: ${totalAllocated} Units`}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* NEW: Blended COGS Margin Warning Highlight Box */}
                                            {(() => {
                                                const allocations = watchLineItems[index]?.batch_allocations || [];
                                                if ((currentRole === "owner" || currentRole === "manager") && allocations.length > 0) {

                                                    // Calculate Blended Math
                                                    const totalCogs = allocations.reduce((sum: number, a: BatchAllocation) => sum + (a.qty * a.buy_price), 0);
                                                    const totalRevenue = currentQty * effectivePrice;
                                                    const avgUnitCost = currentQty > 0 ? totalCogs / currentQty : 0;

                                                    let marginStatus = "safe";
                                                    if (effectivePrice < avgUnitCost) marginStatus = "loss";
                                                    else if (effectivePrice - avgUnitCost <= 10) marginStatus = "low";

                                                    return (
                                                        <div className={`mt-2 flex items-center justify-between rounded px-2 py-1.5 text-[9px] font-bold border shadow-sm ${marginStatus === 'loss' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400' :
                                                            marginStatus === 'low' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400' :
                                                                'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                            }`}>
                                                            <span className="flex items-center gap-1.5">
                                                                <span>Avg Cost: ₹{avgUnitCost.toFixed(2)}</span>
                                                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                                                <span>Effective: ₹{effectivePrice.toFixed(2)}</span>
                                                            </span>
                                                            {marginStatus === 'loss' && <span>⚠️ Selling Below Cost</span>}
                                                        </div>
                                                    )
                                                }
                                                return null;
                                            })()}

                                            {activeItemDropdown === index && currentSearchValue.length > 0 && (
                                                <ul className="absolute top-[45px] left-2 z-50 max-h-48 w-[250px] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                                    {filteredItems.length > 0 ? (
                                                        filteredItems.map(item => {
                                                            const isOutOfStock = item.total_stock_qty <= 0;
                                                            const isAlreadySelected = alreadySelectedIds.includes(item.id);
                                                            const isDisabled = isOutOfStock || isAlreadySelected;

                                                            return (
                                                                <li
                                                                    key={item.id}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        if (!isOutOfStock) {
                                                                            handleItemSelect(index, item);
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-2 text-sm border-b border-slate-100 dark:border-slate-700 last:border-0 ${isDisabled
                                                                        ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                                                                        : 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700'
                                                                        }`}
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
                                                                        <span className="text-xs font-semibold text-emerald-600">₹{item.default_sell_price}</span>
                                                                        <span className={`text-[10px] font-bold px-1.5 rounded ${isAlreadySelected ? 'text-amber-600 bg-amber-100 dark:bg-amber-500/20'
                                                                            : isOutOfStock ? 'text-red-600 bg-red-100 dark:bg-red-500/20'
                                                                                : getStockColor(item.total_stock_qty, item.low_stock_threshold)
                                                                            }`}>
                                                                            {/* Display "ALREADY ADDED" if duplicate */}
                                                                            {isAlreadySelected ? 'ALREADY ADDED' : isOutOfStock ? 'OUT OF STOCK' : `Stock: ${item.total_stock_qty}`}
                                                                        </span>
                                                                    </div>
                                                                </li>
                                                            )
                                                        })
                                                    ) : (
                                                        <li className="px-3 py-2 text-xs text-slate-500 italic">No matches found.</li>
                                                    )}
                                                </ul>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex">
                                                    <input
                                                        type="number" step="0.001"
                                                        {...qtyField}
                                                        onFocus={(e) => handleFocusClear(e, '1')}
                                                        onBlur={(e) => handleBlurRestore(e, `bill_line_items.${index}.qty`, 1, qtyField.onBlur)}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        onChange={(e) => {
                                                            qtyField.onChange(e);
                                                            handleQtyChange(index, Number(e.target.value) || 0, selectedInventoryItem);
                                                        }}
                                                        className={`w-16 rounded-l border px-2 py-1.5 text-sm outline-none dark:bg-slate-800 dark:text-white focus:border-indigo-500 ${isOverStock
                                                            ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10 text-red-600 border-r-slate-200'
                                                            : 'border-slate-200 dark:border-slate-700 border-r-0'
                                                            }`}
                                                    />
                                                    <select
                                                        {...register(`bill_line_items.${index}.unit`)}
                                                        className={`w-20 rounded-r border-y border-r px-1 py-1.5 text-xs outline-none dark:bg-slate-800 dark:text-white focus:border-indigo-500 uppercase tracking-wider ${isOverStock ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10 text-red-600' : 'border-slate-200 dark:border-slate-700'
                                                            }`}
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
                                                {/* INLINE ERROR RENDER */}
                                                {isOverStock && (
                                                    <span className="text-[10px] font-bold text-red-500 leading-none">
                                                        Max stock: {maxStock}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-2 py-2 align-top">
                                            <input
                                                type="number" step="0.01"
                                                {...priceReg}
                                                onFocus={(e) => handleFocusClear(e, '0')}
                                                onBlur={(e) => handleBlurRestore(e, `bill_line_items.${index}.unit_price`, 0, priceReg.onBlur)}
                                                onWheel={preventScrollChange}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                type="number" step="0.01"
                                                {...discReg}
                                                onFocus={(e) => handleFocusClear(e, '0')}
                                                onBlur={(e) => handleBlurRestore(e, `bill_line_items.${index}.discount_pct`, 0, discReg.onBlur)}
                                                onWheel={preventScrollChange}
                                                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                                            />
                                        </td>

                                        {watchIsGst && gstReg && (
                                            <td className="px-2 py-2 align-top">
                                                <input
                                                    type="number" step="0.01"
                                                    {...gstReg}
                                                    onFocus={(e) => handleFocusClear(e, '0')}
                                                    onBlur={(e) => handleBlurRestore(e, `bill_line_items.${index}.gst_rate`, 0, gstReg.onBlur)}
                                                    onWheel={preventScrollChange}
                                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                                                />
                                            </td>
                                        )}

                                        <td className={`px-4 py-2 align-top text-right font-bold ${totalColumnColor}`}>
                                            {totals.processedItems[index]?.line_total.toFixed(2)}
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
                                )
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
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method *</label>
                            <select {...register("payment_method")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="credit">Credit (Unpaid)</option>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card / POS</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="mixed">Mixed / Split</option>
                            </select>
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
                            {errors.amount_paid && <span className="text-xs text-red-500">{errors.amount_paid.message}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes / Terms</label>
                        <textarea
                            {...register("notes")}
                            rows={3}
                            placeholder="Thank you for your business..."
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>

                {/* Financial Summary */}
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

                        {watchIsGst && !watchIsInterstate && (
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

                        {watchIsGst && watchIsInterstate && (
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
                            <span>₹ {totals.grand_total.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between text-sm font-medium text-red-500 mt-2">
                            <span>Amount Due</span>
                            <span>₹ {totals.amount_due.toFixed(2)}</span>
                        </div>

                    </div>
                </div>
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
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-70"
                >
                    <FileText className="h-4 w-4" />
                    {isSubmitting ? "Processing..." : type === "create" ? "Save & Issue Bill" : "Update Bill"}
                </button>
            </div>
        </form>
    )
}
