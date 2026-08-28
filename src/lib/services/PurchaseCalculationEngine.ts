import { POLineItem, PurchaseOrderDetail } from "@/types/purchases";
import { PurchaseOrderFormData } from "../validations/purchaseOrderSchema";
import { PurchaseReturnFormData } from "../validations/purchaseReturnSchema";

export const PurchaseCalculationEngine = {
    /**
     * 1. VERIFY PURCHASE ORDER CALCULATIONS
     * Re-runs all math strictly based on quantities and unit costs.
     */
    verifyPurchaseOrder(data: PurchaseOrderFormData) {
        let subtotal = 0;
        let cgst_total = 0;
        let sgst_total = 0;
        let igst_total = 0;

        const isFulfilling = data.status === "partial" || data.status === "received";

        const verifiedLineItems = data.po_line_items.map((item) => {

            const orderedQty = Number(item.qty_ordered) || 0; 
            const receivedQty = Number(item.qty_received) || 0;

            const calculationQty = isFulfilling ? receivedQty : orderedQty;

            // const qty = Number(item.qty_ordered) || 0; // POs calculate based on ordered qty
            const cost = Number(item.unit_cost) || 0;
            const discPct = Number(item.discount_pct) || 0;
            const gstRate = data.is_gst_supply ? (Number(item.gst_rate) || 0) : 0;

            const safeBatchSellPrice = Number(item.batch_sell_price) || cost;
            
            // const baseTotal = qty * cost;
            const baseTotal = calculationQty * cost;
            const discountAmt = baseTotal * (discPct / 100);
            const taxableValue = Number((baseTotal - discountAmt).toFixed(2));

            let cgst = 0, sgst = 0, igst = 0;
            if (data.is_gst_supply && gstRate > 0) {
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
                // qty_ordered: qty,
                qty_ordered: orderedQty,
                qty_received: receivedQty,
                unit_cost: cost,
                batch_sell_price: safeBatchSellPrice,
                gst_rate: gstRate, 
                cgst, 
                sgst, 
                igst, 
                line_total 
            };
        });

        const safeGlobalDiscount = Number(data.discount_amount) || 0;
        const safeRoundOff = Number(data.round_off) || 0;

        const discountedSubtotal = Number((subtotal - safeGlobalDiscount).toFixed(2));
        const raw_total_amount = discountedSubtotal + cgst_total + sgst_total + igst_total;
        const backendTotalAmount = Number((raw_total_amount + safeRoundOff).toFixed(2));

        const safeAmountPaid = Number(data.amount_paid) || 0;
        const backendAmountDue = Number(Math.max(0, backendTotalAmount - safeAmountPaid).toFixed(2));

        // AUDIT CHECK
        const frontendTotal = Number(data.total_amount) || 0;
        const frontendTax = Number(data.cgst_total || 0) + Number(data.sgst_total || 0) + Number(data.igst_total || 0);
        const backendTax = Number((cgst_total + sgst_total + igst_total).toFixed(2));
        
        const TOLERANCE = 0.02;
        const hasDiscrepancy = Math.abs(backendTotalAmount - frontendTotal) > TOLERANCE || 
                               Math.abs(backendTax - frontendTax) > TOLERANCE;

        return {
            isValid: !hasDiscrepancy,
            discrepancyDetails: hasDiscrepancy ? {
                expected_total: backendTotalAmount,
                submitted_total: frontendTotal
            } : null,
            sanitizedData: {
                ...data,
                po_line_items: verifiedLineItems,
                subtotal: discountedSubtotal,
                cgst_total: Number(cgst_total.toFixed(2)),
                sgst_total: Number(sgst_total.toFixed(2)),
                igst_total: Number(igst_total.toFixed(2)),
                total_amount: backendTotalAmount,
                amount_due: backendAmountDue,
                discount_amount: safeGlobalDiscount,
                round_off: safeRoundOff
            }
        };
    },

    /**
     * 2. CALCULATE FAIR PURCHASE REFUND
     */
    calculatePurchaseRefund(originalPO: PurchaseOrderDetail, returnItemsData: PurchaseReturnFormData["return_items"]) {
        let rawRefundTotal = 0;
        let originalGrossTotal = 0;

        originalPO.po_line_items.forEach((item: POLineItem) => {
            originalGrossTotal += Number(item.line_total);
        });

        const originalGlobalDiscount = Number(originalPO.discount_amount) || 0;

        const verifiedReturnItems = returnItemsData.map((returnItem) => {
            const originalLineItem = originalPO.po_line_items.find(
                (i: POLineItem) => i.id === returnItem.po_line_item_id
            );

            if (!originalLineItem) throw new Error(`Line item not found: ${returnItem.po_line_item_id}`);

            // Safety: Cannot return more than what was received
            const safeReturnQty = Math.min(Number(returnItem.return_qty) || 0, Number(originalLineItem.qty_received) || 0);

            const historicalCost = Number(originalLineItem.unit_cost) || 0;
            const historicalDisc = Number(originalLineItem.discount_pct) || 0;
            const historicalGst = Number(originalLineItem.gst_rate) || 0;

            const baseReturn = safeReturnQty * historicalCost;
            const afterLineDiscount = baseReturn - (baseReturn * (historicalDisc / 100));
            const taxReturn = afterLineDiscount * (historicalGst / 100);
            const lineRefundTotal = afterLineDiscount + taxReturn;
            
            rawRefundTotal += lineRefundTotal;

            return {
                ...returnItem,
                return_qty: safeReturnQty,
                refund_total: Number(lineRefundTotal.toFixed(2))
            };
        });

        let finalRefundAmount = rawRefundTotal;
        if (originalGlobalDiscount > 0 && originalGrossTotal > 0) {
            const refundWeight = rawRefundTotal / originalGrossTotal;
            finalRefundAmount = rawRefundTotal - (originalGlobalDiscount * refundWeight);
        }

        return {
            verifiedReturnItems,
            finalRefundAmount: Number(finalRefundAmount.toFixed(2))
        };
    }
};