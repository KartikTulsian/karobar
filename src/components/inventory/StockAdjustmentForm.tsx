"use client";

import { AdjustmentBatchAllocation, StockAdjustmentFormData, stockAdjustmentSchema } from '@/lib/validations/stockAdjustmentSchema';
import { InventoryItem, InventoryItemDetail, ItemBatch } from '@/types/inventory';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react'
import { Resolver, useForm } from 'react-hook-form';
import InputField from '../common/InputField';

interface StockAdjustmentModalProps {
    item: InventoryItem | InventoryItemDetail;
    onCancel: () => void;
    onSubmit: (data: StockAdjustmentFormData) => void;
    isSubmitting?: boolean;
}

export default function StockAdjustmentForm({ item, onCancel, onSubmit, isSubmitting = false }: StockAdjustmentModalProps) {
    const autoAllocateFifo = (batches: ItemBatch[], neededQty: number): AdjustmentBatchAllocation[] => {
        let remaining = Math.abs(neededQty);
        const allocations: AdjustmentBatchAllocation[] = [];

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

    const [isAllocatorOpen, setIsAllocatorOpen] = useState(false);

    const sortedBatches = [...(item.batches || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const suggestedBuyPrice= sortedBatches.length > 0 ? sortedBatches[0].buy_price : 0;

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        getValues,
        formState: {errors},
    } = useForm<StockAdjustmentFormData>({
        resolver: zodResolver(stockAdjustmentSchema) as Resolver<StockAdjustmentFormData>,
        defaultValues: {
            item_id: item.id,
            item_name: item.name,
            type: "adjustment",
            reference_type: "manual_adjustment",
            qty_before: item.total_stock_qty,
            actual_qty: item.total_stock_qty, 
            qty_change: 0,
            qty_after: item.total_stock_qty,
            new_batch_buy_price: suggestedBuyPrice,
            batch_allocations: [],
            reason: "",
        }
    });

    const watchActualQty = watch("actual_qty");
    const watchQtyChange = watch("qty_change");
    const watchAllocations = watch("batch_allocations");

    useEffect(() => {
        const actual = Number(watchActualQty) || 0;
        const change = actual - item.total_stock_qty;

        setValue("qty_change", change);
        setValue("qty_after", actual);

        if (change < 0) {
            const neededSum = Math.abs(change);
            const currentSum = getValues("batch_allocations").reduce((acc, a) => acc + Number(a.qty), 0);

            // Failsafe: Only auto-allocate if the sums mismatch. 
            // This preserves the user's manual edits while they are typing.
            if (currentSum !== neededSum) {
                const activeBatches = item.batches?.filter(b => b.stock_qty > 0) || [];
                const allocations = autoAllocateFifo(activeBatches, neededSum);
                setValue("batch_allocations", allocations, { shouldValidate: true });
            }
        } else{
            setValue("batch_allocations", []);
        }
    }, [watchActualQty, item.total_stock_qty, item.batches, setValue, getValues]);

    const isLoss = watchQtyChange < 0;
    const isGain = watchQtyChange > 0;
    const activeBatchesForAllocator = item.batches?.filter(b => b.stock_qty > 0) || [];
    
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            
            {/* 1. Header Info */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{item.name}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm">
                    <div className="flex flex-col">
                        <span className="text-slate-500 text-xs uppercase tracking-wider">System Stock</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.total_stock_qty} {item.unit}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <div className="flex flex-col">
                        <span className="text-indigo-500 text-xs uppercase tracking-wider">New Stock</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">{watchActualQty || 0} {item.unit}</span>
                    </div>
                </div>
            </div>

            {/* 2. Core Inputs */}
            <div className="flex flex-col gap-4">
                <InputField 
                    label={`Actual Physical Count (${item.unit}) *`} 
                    name="actual_qty" 
                    type="number" 
                    register={register} 
                    error={errors.actual_qty} 
                    inputProps={{ step: "0.001" }}
                />

                {/* CONDITIONAL RENDER: GAIN (Found Stock) */}
                {isGain && (
                    <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <InputField 
                            label="Cost Basis for New Stock (₹) *" 
                            name="new_batch_buy_price" 
                            type="number" 
                            register={register} 
                            error={errors.new_batch_buy_price} 
                            inputProps={{ step: "0.01" }}
                        />
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                            This creates a new batch. We suggested your most recent buy price.
                        </p>
                    </div>
                )}

                {/* CONDITIONAL RENDER: LOSS (Shrinkage & Batch Allocator) */}
                {isLoss && (
                    <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
                        <div className="flex items-center justify-between mb-3 border-b border-red-100 dark:border-red-500/20 pb-2">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                Batches Affected by Shrinkage
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsAllocatorOpen(!isAllocatorOpen)}
                                className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-white border border-red-200 px-2 py-1 rounded dark:bg-slate-800 dark:border-red-500/30 flex items-center gap-1 transition-colors"
                            >
                                <Settings2 className="h-3 w-3" />
                                Modify Allocations
                            </button>
                        </div>

                        {/* Summary View (When allocator is closed) */}
                        {!isAllocatorOpen && (
                            <div className="flex flex-col gap-1.5">
                                {watchAllocations.map((alloc, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-red-900 dark:text-red-300 bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-red-100 dark:border-red-500/20">
                                        <span>{alloc.batch_number} (Cost: ₹{alloc.buy_price})</span>
                                        <span className="font-bold">- {alloc.qty} {item.unit}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Interactive Allocator View */}
                        {isAllocatorOpen && (
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 p-2 rounded border border-red-100 dark:border-red-500/30">
                                {activeBatchesForAllocator.map(batch => {
                                    const alloc = watchAllocations.find(a => a.batch_id === batch.id);
                                    const allocQty = alloc ? alloc.qty : 0;

                                    return (
                                        <div key={batch.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {batch.batch_number || 'OPENING-STOCK'}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    Cost: ₹{batch.buy_price} | Avail: {batch.stock_qty}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-medium text-slate-500">Deduct Qty:</span>
                                                <input
                                                    type="number" min="0" max={batch.stock_qty} step="0.001"
                                                    value={allocQty || ''}
                                                    onChange={(e) => {
                                                        const newQty = Number(e.target.value) || 0;
                                                        const updatedAllocations = [...watchAllocations].filter(a => a.batch_id !== batch.id);

                                                        if (newQty > 0) {
                                                            updatedAllocations.push({
                                                                batch_id: batch.id,
                                                                qty: Math.min(newQty, batch.stock_qty), 
                                                                buy_price: batch.buy_price,
                                                                batch_number: batch.batch_number
                                                            });
                                                        }
                                                        setValue("batch_allocations", updatedAllocations, { shouldValidate: true });
                                                    }}
                                                    className="w-20 rounded border border-slate-300 px-2 py-1 text-xs text-right outline-none focus:border-red-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Allocator Validation Warnings */}
                        {(() => {
                            const totalAllocated = watchAllocations.reduce((sum, a) => sum + Number(a.qty), 0);
                            const neededSum = Math.abs(watchQtyChange);
                            const isMismatch = Math.abs(totalAllocated - neededSum) > 0.001;

                            if (isMismatch) {
                                return (
                                    <div className="mt-2 p-1.5 rounded text-[10px] font-bold text-center bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:border-red-500/40">
                                        ⚠️ Mismatch: You need to allocate {neededSum} {item.unit}. Currently allocated: {totalAllocated}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {errors.batch_allocations && <p className="text-xs text-red-500 mt-2">{errors.batch_allocations.message}</p>}
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Reason for Adjustment *
                    </label>
                    <textarea
                        {...register("reason")}
                        rows={3}
                        placeholder="e.g., Oil spilled from barrel, found extra items in back room..."
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
                </div>
            </div>

            {/* 3. Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || watchQtyChange === 0}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Adjustment"}
                </button>
            </div>
        </form>
    )
}
