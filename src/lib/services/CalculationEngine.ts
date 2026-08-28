import { BatchAllocation, BillDetail, BillLineItem } from "@/types/billing";
import { BillFormData } from "../validations/billSchema";
import { SalesReturnFormData } from "../validations/salesReturnSchema";

export const CalculationEngine = {
    /**
     * 1. VERIFY BILL CALCULATIONS
     * Takes the raw inputs (qty, price, gst) from the frontend, recalculates 
     * the exact totals, and returns a sanitized data object ready for the database.
     */

    verifyBill(
        data: BillFormData, 
        actualPricesMap: Record<string, number> = {}, 
        activeBatchesMap: Record<string, { id: string; stock_qty: number; buy_price: number; sell_price: number; batch_number: string | null }[]> = {}
    ) {
        let subtotal = 0;
        let cgst_total = 0;
        let sgst_total = 0;
        let igst_total = 0;

        let total_recovered_amount = 0;
        let accumulated_profit = 0;

        let hasAllocationMismatch = false;
        let allocationErrorMessage = "";

        // 1. Calculate line items strictly from the raw editable inputs
        const verifiedLineItems = data.bill_line_items.map((item) => {
            const qty = Number(item.qty) || 0;
            const submittedPrice = Number(item.unit_price) || 0; 
            const discPct = Number(item.discount_pct) || 0;
            const gstRate = data.is_gst_bill ? (Number(item.gst_rate) || 0) : 0;

            // --- SILENT RECOVERY LOGIC ---
            // If the item exists in the DB, check for a markup. (Ignores flying items).
            // if (item.item_id && actualPricesMap[item.item_id] !== undefined) {
            //     const actualDbPrice = actualPricesMap[item.item_id];
            //     const markupPerUnit = Math.max(0, submittedPrice - actualDbPrice);
            //     total_recovered_amount += (markupPerUnit * qty);
            // }

            const baseTotal = qty * submittedPrice;
            const discountAmt = baseTotal * (discPct / 100);
            const taxableValue = Number((baseTotal - discountAmt).toFixed(2));

            let total_buy_price = 0;
            let allocated_qty = 0;
            let final_allocations: BatchAllocation[] = item.batch_allocations || [];

            final_allocations.forEach(alloc => {
                allocated_qty += Number(alloc.qty);
            });

            // SERVER-SIDE AUTO-ALLOCATION FALLBACK
            // If allocations were dropped by the frontend or don't match the Qty, repair them via DB data
            if (Math.abs(allocated_qty - qty) > 0.001 && item.item_id && activeBatchesMap[item.item_id]) {
                const batches = activeBatchesMap[item.item_id];
                let remaining = qty;
                final_allocations = [];

                // Loop through active batches (assumed pre-sorted FIFO) and re-allocate
                for (const b of batches) {
                    if (remaining <= 0) break;
                    if (b.stock_qty > 0) {
                        const take = Math.min(b.stock_qty, remaining);
                        final_allocations.push({
                            batch_id: b.id,
                            qty: take,
                            buy_price: b.buy_price,
                            batch_number: b.batch_number || 'OPENING-STOCK'
                        });
                        remaining -= take;
                    }
                }
                allocated_qty = final_allocations.reduce((sum, a) => sum + Number(a.qty), 0);
            }

            // Gatekeeper: Reject transaction if even the DB couldn't fulfill the allocations
            if (Math.abs(allocated_qty - qty) > 0.001) {
                hasAllocationMismatch = true;
                allocationErrorMessage = `Quantity mismatch on "${item.item_name}". Needed ${qty}, but allocated ${allocated_qty} from batches.`;
            }

            // STRICT COGS (Buy Price)
            final_allocations.forEach(alloc => {
                total_buy_price += (Number(alloc.qty) * Number(alloc.buy_price));
            });

            const lineProfit = Number((taxableValue - total_buy_price).toFixed(2));
            accumulated_profit += lineProfit;

            let highest_batch_sell_price = 0;
            let line_write_off_recovery = 0;

            if (item.item_id) {
                if (final_allocations.length > 0 && activeBatchesMap[item.item_id]) {
                    // Find the highest sell_price among the specifically allocated batches
                    const dbBatches = activeBatchesMap[item.item_id];
                    final_allocations.forEach(alloc => {
                        const matchedBatch = dbBatches.find(b => b.id === alloc.batch_id);
                        if (matchedBatch && Number(matchedBatch.sell_price) > highest_batch_sell_price) {
                            highest_batch_sell_price = Number(matchedBatch.sell_price);
                        }
                    });
                } else if (actualPricesMap[item.item_id] !== undefined) {
                    // Fallback if no batches are allocated yet
                    highest_batch_sell_price = Number(actualPricesMap[item.item_id]);
                }
            }

            // If we are selling for MORE than the highest batch sell price, the extra is write-off recovery
            if (highest_batch_sell_price > 0 && submittedPrice > highest_batch_sell_price) {
                const extraPerUnit = submittedPrice - highest_batch_sell_price;
                line_write_off_recovery = Number((extraPerUnit * qty).toFixed(2));
                total_recovered_amount += line_write_off_recovery;
            }

            let cgst = 0, sgst = 0, igst = 0;
            if (data.is_gst_bill && gstRate > 0) {
                if (data.is_interstate) {
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

            return { 
                ...item, 
                gst_rate: gstRate, 
                cgst, sgst, igst, 
                line_total,
                total_buy_price,
                line_profit: lineProfit ,
                batch_allocations: final_allocations,
                write_off_recovery: line_write_off_recovery
            };
        });

        // 2. Apply global discount & rounding safely
        const safeGlobalDiscount = Number(data.discount_amount) || 0;
        const safeRoundOff = Number(data.round_off) || 0;

        const discountedSubtotal = Number((subtotal - safeGlobalDiscount).toFixed(2));

        const finalBillProfit = Number((accumulated_profit - safeGlobalDiscount).toFixed(2));

        const raw_grand_total = discountedSubtotal + cgst_total + sgst_total + igst_total;
        const backendGrandTotal = Number((raw_grand_total + safeRoundOff).toFixed(2));

        const safeAmountPaid = Number(data.amount_paid) || 0;
        const backendAmountDue = Number(Math.max(0, backendGrandTotal - safeAmountPaid).toFixed(2));

        // 3. CROSS-CHECK AUDIT (The new feature)
        const frontendGrandTotal = Number(data.grand_total) || 0;
        const frontendTaxTotal = Number(data.cgst_total || 0) + Number(data.sgst_total || 0) + Number(data.igst_total || 0);
        const backendTaxTotal = Number((cgst_total + sgst_total + igst_total).toFixed(2));

        // Allow a 2 paisa tolerance for floating point variations
        const TOLERANCE = 0.02; 
        
        const isTotalMismatch = Math.abs(backendGrandTotal - frontendGrandTotal) > TOLERANCE;
        const isTaxMismatch = Math.abs(backendTaxTotal - frontendTaxTotal) > TOLERANCE;
        const hasDiscrepancy = isTotalMismatch || isTaxMismatch || hasAllocationMismatch;

        let finalErrorMessage = "";
        if (hasAllocationMismatch) finalErrorMessage = allocationErrorMessage;
        else if (isTotalMismatch || isTaxMismatch) finalErrorMessage = "Calculated totals do not match the submitted form data.";

        return {
            isValid: !hasDiscrepancy,
            total_recovered_amount,
            discrepancyDetails: hasDiscrepancy ? {
                message: finalErrorMessage,
                expected_total: backendGrandTotal,
                submitted_total: frontendGrandTotal,
                expected_tax: backendTaxTotal,
                submitted_tax: frontendTaxTotal,
            } : null,
            sanitizedData: {
                ...data,
                bill_line_items: verifiedLineItems,
                subtotal: discountedSubtotal,
                cgst_total: Number(cgst_total.toFixed(2)),
                sgst_total: Number(sgst_total.toFixed(2)),
                igst_total: Number(igst_total.toFixed(2)),
                grand_total: backendGrandTotal,
                amount_due: backendAmountDue,
                discount_amount: safeGlobalDiscount,
                round_off: safeRoundOff,
                total_profit: finalBillProfit
            }
        }
    },

    /**
     * 2. CALCULATE FAIR REFUND
     * Accounts for the global discount on the original bill so you don't over-refund.
     */

    calculateRefund(
        originalBill: BillDetail,
        returnItemsData: SalesReturnFormData["return_items"]
    ) {
        let rawRefundTotal = 0;
        let originalGrossTotal = 0;
        let total_write_off_reverted = 0;

        // 1. Find the gross total of the original bill (before global discount)
        originalBill.bill_line_items.forEach((item: BillLineItem) => {
            originalGrossTotal += Number(item.line_total);
        });

        const originalGlobalDiscount = Number(originalBill.discount_amount) || 0;

        // 2. Calculate the value of the items being returned
        const verifiedReturnItems = returnItemsData.map((returnItem) => {
            // Find the original item strictly typed as BillLineItem
            const originalLineItem = originalBill.bill_line_items.find(
                (i: BillLineItem) => i.id === returnItem.bill_line_item_id
            );

            if (!originalLineItem) {
                throw new Error(`Line item not found on original bill for ID: ${returnItem.bill_line_item_id}`);
            }

            const safeReturnQty = Math.min(
                Number(returnItem.return_qty) || 0,
                Number(originalLineItem.qty) || 0
            );

            // BACKEND GATEKEEPER FOR RETURN BATCH ALLOCATIONS
            let allocatedReturnQty = 0;
            const processedAllocations = (returnItem.return_batch_allocations || []).map(alloc => {
                allocatedReturnQty += Number(alloc.qty) || 0;
                return {
                    batch_id: alloc.batch_id,
                    qty: Number(alloc.qty) || 0,
                    buy_price: Number(alloc.buy_price) || 0,
                    batch_number: alloc.batch_number
                };
            });

            // Prevent API submission if the allocated batches don't match the return quantity
            if (safeReturnQty > 0 && Math.abs(allocatedReturnQty - safeReturnQty) > 0.001) {
                throw new Error(`Return quantity mismatch on "${returnItem.item_name}". Expected to return ${safeReturnQty}, but allocated ${allocatedReturnQty} to batches.`);
            }

            // Calculate return value based on the historical unit price & tax
            const historicalUnitPrice = Number(originalLineItem.unit_price) || 0;
            const historicalDiscPct = Number(originalLineItem.discount_pct) || 0;
            const historicalGst = Number(originalLineItem.gst_rate) || 0;

            const baseReturn = safeReturnQty * historicalUnitPrice;
            const afterLineDiscount = baseReturn - (baseReturn * (historicalDiscPct / 100));
            const taxReturn = afterLineDiscount * (historicalGst / 100);

            const lineRefundTotal = afterLineDiscount + taxReturn;

            rawRefundTotal += lineRefundTotal;

            let item_write_off_reverted = 0;
            const originalQty = Number(originalLineItem.qty) || 0;
            const originalRecovery = Number(originalLineItem.write_off_recovery) || 0;

            if (originalQty > 0 && originalRecovery > 0) {
                const ratio = safeReturnQty / originalQty;
                item_write_off_reverted = Number((originalRecovery * ratio).toFixed(2));
                total_write_off_reverted += item_write_off_reverted;
            }

            return {
                ...returnItem,
                return_qty: safeReturnQty,
                refund_total: Number(lineRefundTotal.toFixed(2)),
                return_batch_allocations: processedAllocations,
                write_off_recovery: item_write_off_reverted
            };
        });

        // 3. Proportional Discount Deduction
        let finalRefundAmount = rawRefundTotal;
        
        if (originalGlobalDiscount > 0 && originalGrossTotal > 0) {
            const refundWeight = rawRefundTotal / originalGrossTotal;
            const proportionalDiscountReduction = originalGlobalDiscount * refundWeight;
            finalRefundAmount = rawRefundTotal - proportionalDiscountReduction;
        }

        return {
            verifiedReturnItems,
            finalRefundAmount: Number(finalRefundAmount.toFixed(2)),
            total_write_off_reverted: Number(total_write_off_reverted.toFixed(2))
        };
    }
}