import { PurchaseOrderDetail, PurchaseOrderWithSupplier, PurchaseReturnWithDetails, ToPurchaseItem } from "@/types/purchases";
import { supabase } from "../supabase/client";
import { ToPurchaseFormData } from "../validations/toPurchaseSchema";
import { POLineItemFormData, PurchaseOrderFormData } from "../validations/purchaseOrderSchema";
import { PurchaseReturnFormData } from "../validations/purchaseReturnSchema";
import { PurchaseCalculationEngine } from "../services/PurchaseCalculationEngine";
import { getLocalDateString } from "../utils";

// 1. Fetch the To Purchase List (with Supplier names)
export async function fetchToPurchaseList(tenantId: string): Promise<ToPurchaseItem[]> {
    const { data, error } = await supabase
        .from('to_purchase_list')
        .select(`
            *,
            suppliers (name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Database Error fetching purchases:", error.message);
        throw new Error("Failed to fetch purchases");
    }

    return data as unknown as ToPurchaseItem[];
}

// 3. Add an item to the list
export async function addToPurchaseList(tenantId: string, data: ToPurchaseFormData) {

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    const payload = {
        tenant_id: tenantId,
        item_id: data.item_id || null, // Convert empty to null
        item_name: data.item_name,
        supplier_id: data.supplier_id || null, // Prevents UUID crash if "Unassigned" ("") is selected
        qty_needed: data.qty_needed,
        notes: data.notes || null,
        created_by: currentUser.id,
    };

    const { data: result, error } = await supabase
        .from('to_purchase_list')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Database Error adding to purchase list:", error.message);
        throw new Error("Failed to add item to purchase list");
    }

    return result;
}

export async function updateToPurchaseListItem(tenantId: string, id: string, data: ToPurchaseFormData) {
    const payload = {
        item_id: data.item_id || null,
        item_name: data.item_name,
        supplier_id: data.supplier_id || null,
        qty_needed: data.qty_needed,
        notes: data.notes || null,
    };

    const { data: result, error } = await supabase
        .from('to_purchase_list')
        .update(payload)
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating purchase list item:", error.message);
        throw new Error("Failed to update item.");
    }

    return result;
}

// 4. Remove items from the list (When "Logged")
export async function removeFromPurchaseList(tenantId: string, itemIds: string[]) {
    const { error } = await supabase
        .from('to_purchase_list')
        .delete()
        .eq('tenant_id', tenantId)
        .in('id', (itemIds));

    if (error) {
        console.error("Database Error removing from purchase list:", error.message);
        throw new Error("Failed to remove item from purchase list");
    }

    return true;
}

//5. PurchaseOrders (with Supplier names) 

// async function syncInventoryStock(tenantId: string, itemId: string | null | undefined, qtyChange: number, actionName: string) {
//     if (!itemId || String(itemId).trim() === "" || String(itemId) === "undefined") return;

//     const { error } = await supabase.rpc('adjust_inventory_stock', {
//         p_item_id: itemId,
//         p_qty_change: qtyChange
//     });

//     if (error) {
//         console.error(`[DEBUG - INVENTORY] Sync Failed for ${itemId}:`, error.message);
//     } else {
//         console.log(`[DEBUG - INVENTORY] ${actionName} applied ${qtyChange} to item ${itemId}.`);
//     }
// }

// ==========================================
// BATCH INVENTORY HELPERS
// ==========================================

// 1. PO BATCH SYNC: Dynamically Generates or Updates Batches based on PO Lines
async function syncPOBatches(
    tenantId: string,
    poId: string,
    poNumber: string,
    oldItems: Pick<POLineItemFormData, "item_id" | "qty_received">[],
    newItems: Pick<POLineItemFormData, "item_id" | "qty_received" | "unit_cost" | "batch_sell_price">[]
) {
    // Fetch all batches currently tied to this Purchase Order
    const { data: existingBatches } = await supabase.from('item_batches').select('*').eq('po_id', poId);

    const oldQtyMap: Record<string, number> = {};
    oldItems.forEach(i => { if (i.item_id) oldQtyMap[i.item_id] = (oldQtyMap[i.item_id] || 0) + Number(i.qty_received); });

    const newQtyMap: Record<string, number> = {};
    const newCostMap: Record<string, number> = {};
    const newSellMap: Record<string, number> = {};

    newItems.forEach(i => {
        if (i.item_id) {
            newQtyMap[i.item_id] = (newQtyMap[i.item_id] || 0) + Number(i.qty_received);
            newCostMap[i.item_id] = Number(i.unit_cost) || 0;
            newSellMap[i.item_id] = Number(i.batch_sell_price) || Number(i.unit_cost) || 0;
        }
    });

    const allItemIds = Array.from(new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]));

    for (const itemId of allItemIds) {
        const oldQty = oldQtyMap[itemId] || 0;
        const newQty = newQtyMap[itemId] || 0;
        const difference = newQty - oldQty;

        const batch = existingBatches?.find(b => b.item_id === itemId);

        if (batch) {
            // Update existing batch
            const newStockQty = Number(batch.stock_qty) + difference;

            // Security Gatekeeper: Prevent negative stock if they sold items and then reduced the PO
            if (newStockQty < 0) {
                throw new Error(`Cannot update PO: Reducing the received quantity of an item that has already been sold would result in negative batch stock.`);
            }

            await supabase.from('item_batches').update({
                stock_qty: newStockQty,
                buy_price: newCostMap[itemId] !== undefined ? newCostMap[itemId] : batch.buy_price,
                sell_price: newSellMap[itemId] !== undefined ? newSellMap[itemId] : batch.sell_price
            }).eq('id', batch.id);

        } else if (newQty > 0) {
            // Insert entirely new batch
            await supabase.from('item_batches').insert({
                tenant_id: tenantId,
                item_id: itemId,
                po_id: poId,
                batch_number: poNumber,
                buy_price: newCostMap[itemId],
                sell_price: newSellMap[itemId],
                stock_qty: newQty
            });
        }
    }
}

// 2. PR BATCH SYNC: Deducts stock straight from the specific PO's Batch
async function syncPRBatchStock(tenantId: string, poId: string, itemId: string, qtyChange: number, actionName: string) {
    if (!itemId) return;

    // Find the specific batch generated by the original PO
    const { data: batch } = await supabase
        .from('item_batches')
        .select('id')
        .eq('po_id', poId)
        .eq('item_id', itemId)
        .limit(1)
        .single();

    if (batch) {
        const { error } = await supabase.rpc('adjust_batch_stock', { p_batch_id: batch.id, p_qty_change: qtyChange });
        if (error) console.error(`[DEBUG] ${actionName} Sync Failed:`, error.message);
        else console.log(`[DEBUG] ${actionName} applied ${qtyChange} to batch ${batch.id}.`);
    } else {
        console.error(`[DEBUG] ${actionName} Failed: No batch found for PO ${poId} and Item ${itemId}.`);
    }
}

// ==========================================
// STRICT LEDGER MATH HELPERS (Purchases)
// ==========================================

async function defensivePOSync(tenantId: string, poId: string) {
    console.log(`\n=== [DEBUG - defensivePOSync] ===`);
    console.log(`[DEBUG] Syncing PO ID: ${poId}`);

    const { data: currentPO } = await supabase.from('purchase_orders').select('total_amount, amount_paid, settlement_discount').eq('id', poId).single();
    console.log(`[DEBUG] Fetched PO State:`, currentPO);

    if (currentPO) {
        const { data: allReturns } = await supabase.from('purchase_returns').select('refund_amount').eq('original_po_id', poId).eq('tenant_id', tenantId);

        const totalRet = allReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;
        console.log(`[DEBUG] Total historical returns for this PO: ₹${totalRet}`);

        const netPO = Number(currentPO.total_amount) - totalRet;
        const newDue = Math.max(0, netPO - Number(currentPO.amount_paid) - Number(currentPO.settlement_discount));

        const safeStatus = newDue <= 0 ? 'paid' : (Number(currentPO.amount_paid) > 0 || Number(currentPO.settlement_discount) > 0 ? 'partial' : 'unpaid');

        console.log(`[DEBUG] Evaluated Net PO: ₹${netPO} | New Due: ₹${newDue} | New Status: ${safeStatus}`);
        await supabase.from('purchase_orders').update({ amount_due: newDue, payment_status: safeStatus }).eq('id', poId);
    }

    console.log(`=== [DEBUG - defensivePOSync END] ===\n`);
}

async function applyPurchaseReturnFinancials(tenantId: string, returnId: string, poId: string, refundAmount: number, refundMethod: string, recordedBy: string) {
    console.log(`\n=== [DEBUG - applyPurchaseReturnFinancials] ===`);

    const { data: po } = await supabase.from('purchase_orders').select('total_amount, amount_paid, settlement_discount, supplier_id').eq('id', poId).single();
    if (!po) return;

    const { data: otherReturns } = await supabase.from('purchase_returns').select('refund_amount').eq('original_po_id', poId).neq('id', returnId).eq('tenant_id', tenantId);
    const baseReturns = otherReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;

    const netPO = Number(po.total_amount) - baseReturns;
    const currentDebt = Math.max(0, netPO - Number(po.amount_paid) - Number(po.settlement_discount));

    const debtRelief = Math.min(refundAmount, currentDebt);
    const walletImpact = refundAmount - debtRelief;

    console.log(`[DEBUG] Pre-Return State -> Net PO: ₹${netPO}, Current Debt: ₹${currentDebt}`);
    console.log(`[DEBUG] Return Amount: ₹${refundAmount} -> Debt Relief: ₹${debtRelief}, Wallet Impact: ₹${walletImpact}`);

    if (walletImpact > 0) {
        if (refundMethod === 'credit_note') {
            const { data: supp } = await supabase.from('suppliers').select('advance_balance').eq('id', po.supplier_id).single();
            const newAdvance = Number(supp?.advance_balance || 0) + walletImpact;

            console.log(`[DEBUG] Adding ₹${walletImpact} to Supplier Wallet. New Balance: ₹${newAdvance}`);

            await supabase.from('suppliers').update({ advance_balance: newAdvance }).eq('id', po.supplier_id);
            await supabase.from('credit_ledger').insert({
                tenant_id: tenantId,
                entity_type: 'supplier',
                entity_id: po.supplier_id,
                flow_type: 'in',
                amount: walletImpact,
                balance_after: newAdvance,
                reference_type: 'purchase_return',
                reference_id: returnId,
                description: 'Credit Note generated from Purchase Return.',
                created_by: recordedBy
            });
        } else {
            console.log(`[DEBUG] Receiving ₹${walletImpact} in ${refundMethod}. Reducing PO amount_paid.`);
            await supabase.from('cash_book').insert({
                tenant_id: tenantId,
                recorded_by: recordedBy,
                type: 'in',
                amount: walletImpact,
                description: `Purchase Refund Received`,
                reference_type: 'purchase_return',
                reference_id: returnId,
                payment_method: refundMethod
            });

            // Allow negative amount_paid if over-refunded
            await supabase.from('purchase_orders').update({ amount_paid: Number(po.amount_paid) - walletImpact }).eq('id', poId);
        }
    }
    console.log(`=== [DEBUG - applyPurchaseReturnFinancials END] ===\n`);
}

async function revertPurchaseReturnFinancials(tenantId: string, returnId: string, poId: string) {
    console.log(`\n=== [DEBUG - revertPurchaseReturnFinancials] ===`);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");

    const { data: po } = await supabase.from('purchase_orders').select('total_amount, amount_paid, settlement_discount, supplier_id').eq('id', poId).single();
    if (!po) return;

    const { data: returnToDelete } = await supabase.from('purchase_returns').select('refund_amount, refund_method').eq('id', returnId).single();
    if (!returnToDelete) return;

    const refundAmount = Number(returnToDelete.refund_amount);
    const refundMethod = returnToDelete.refund_method;

    // 1. Calculate Active Credit BEFORE deleting this return
    const { data: allReturns } = await supabase.from('purchase_returns').select('refund_amount').eq('original_po_id', poId).eq('tenant_id', tenantId);
    const totalReturnsBefore = allReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;
    const netPoBefore = Number(po.total_amount) - totalReturnsBefore;
    const effectivePaid = Number(po.amount_paid) + Number(po.settlement_discount);

    const activeCreditBefore = Math.max(0, effectivePaid - netPoBefore);

    // 2. Calculate Active Credit AFTER deleting this return
    const netPoAfter = netPoBefore + refundAmount;
    const activeCreditAfter = Math.max(0, effectivePaid - netPoAfter);

    // 3. The true amount of wallet/cash that needs to be reversed
    const creditToReverse = activeCreditBefore - activeCreditAfter;
    console.log(`[DEBUG] Revert Analysis -> Active Before: ₹${activeCreditBefore}, Active After: ₹${activeCreditAfter}, Reversing: ₹${creditToReverse}`);

    // Clean up the old exact ledger records just to keep the DB tidy
    // if (refundMethod === 'credit_note') {
    //     await supabase.from('credit_ledger').delete().eq('reference_id', returnId).eq('tenant_id', tenantId);
    // } else {
    //     await supabase.from('cash_book').delete().eq('reference_id', returnId).eq('tenant_id', tenantId);
    // }

    if (creditToReverse > 0) {
        if (refundMethod === 'credit_note') {
            const { data: supp } = await supabase.from('suppliers').select('advance_balance').eq('id', po.supplier_id).single();
            let currentAdvance = Number(supp?.advance_balance || 0);
            let shortfall = 0;

            if (creditToReverse > currentAdvance) {
                shortfall = creditToReverse - currentAdvance;
                currentAdvance = 0;
            } else {
                currentAdvance -= creditToReverse;
            }

            console.log(`[DEBUG] Reverting Credit. New Advance: ₹${currentAdvance}. Shortfall: ₹${shortfall}`);
            await supabase.from('suppliers').update({ advance_balance: currentAdvance }).eq('id', po.supplier_id);

            // Insert an 'out' record to explicitly document the reversal instead of deleting history
            await supabase.from('credit_ledger').insert({
                tenant_id: tenantId, entity_type: 'supplier', entity_id: po.supplier_id,
                flow_type: 'out', amount: creditToReverse, balance_after: currentAdvance,
                reference_type: 'manual_adjustment', reference_id: crypto.randomUUID(),
                description: 'Reversal of Credit Note due to Return update/deletion.',
                created_by: currentUser.id
            });

            if (shortfall > 0) {
                await supabase.from('purchase_orders').update({ amount_paid: Number(po.amount_paid) - shortfall }).eq('id', poId);
            }
        } else {
            console.log(`[DEBUG] Reverting Cash. Adding ₹${creditToReverse} to amount_paid.`);
            const { data: freshPO } = await supabase.from('purchase_orders').select('amount_paid').eq('id', poId).single();
            await supabase.from('purchase_orders').update({ amount_paid: Number(freshPO?.amount_paid || 0) + creditToReverse }).eq('id', poId);

            // Insert an 'out' cash book record
            await supabase.from('cash_book').insert({
                tenant_id: tenantId, recorded_by: currentUser.id,
                type: 'out', amount: creditToReverse, description: `Reversal of Cash Refund due to Return update/deletion.`,
                reference_type: 'manual', reference_id: crypto.randomUUID(), payment_method: 'cash'
            });
        }
    }
    console.log(`=== [DEBUG - revertPurchaseReturnFinancials END] ===\n`);
}

export async function fetchPurchaseOrders(tenantId: string): Promise<PurchaseOrderWithSupplier[]> {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            suppliers ( name )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Database Error fetching purchase orders:", error.message);
        throw new Error("Failed to fetch purchase orders");
    }

    return data as unknown as PurchaseOrderWithSupplier[];
}

export async function fetchPurchaseOrderById(tenantId: string, poId: string): Promise<PurchaseOrderDetail | null> {
    console.log(`[API Fetch] Calling Supabase for PO: ${poId}`);

    const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            suppliers (
                name,
                phone,
                email,
                address,
                gstin
            ),
            po_line_items ( * ),
            purchase_returns (
                *,
                return_items:purchase_return_items(*)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', poId)
        .single();

    if (error) {
        console.error("[API Error] Failed to fetch single PO:", error.message);
        throw new Error("Failed to fetch purchase order details");
    }

    console.log("[API Fetch] Raw Supabase Response Data:", data); // Check if payment_status is here!
    return data as unknown as PurchaseOrderDetail;
}

export async function fetchNextPONumberPreview(tenantId: string): Promise<string> {
    const localDate = getLocalDateString(new Date().toISOString());

    const datePrefix = localDate.replace(/-/g, '/');
    const prefix = `PO-${datePrefix}-`;

    const { data: lastPO } = await supabase
        .from('purchase_orders')
        .select('po_number')
        .eq('tenant_id', tenantId)
        .ilike('po_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    let nextSeq = 1;
    if (lastPO && lastPO.po_number) {
        const parts = lastPO.po_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }

    return `${prefix}${nextSeq}`;
}

export async function createPurchaseOrder(tenantId: string, data: PurchaseOrderFormData) {
    console.log(`\n=== [DEBUG - createPurchaseOrder] ===`);
    console.log(`[DEBUG] Incoming PO Data:`, JSON.stringify(data, null, 2));
    // In production, fetch from Supabase Auth
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    // 1. Run through the Calculation Engine
    const checkResult = PurchaseCalculationEngine.verifyPurchaseOrder(data);

    if (!checkResult.isValid) {
        console.error("[DEBUG] PO Math Discrepancy:", checkResult.discrepancyDetails);
        throw new Error(
            `Data sync error: Form total (₹${checkResult.discrepancyDetails?.submitted_total}) ` +
            `does not match server verified total (₹${checkResult.discrepancyDetails?.expected_total}).`
        );
    }

    const safeData = checkResult.sanitizedData;

    // --- SEQUENTIAL PO NUMBER GENERATOR ---
    let finalPoNumber = safeData.po_number?.trim();

    if (!finalPoNumber) {
        // Convert '2026-07-18' to '2026/07/18'
        const datePrefix = safeData.order_date.replace(/-/g, '/');
        const prefix = `PO-${datePrefix}-`;

        // Find the most recent PO for this specific day
        const { data: lastPO } = await supabase
            .from('purchase_orders')
            .select('po_number')
            .eq('tenant_id', tenantId)
            .ilike('po_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let nextSeq = 1;
        if (lastPO && lastPO.po_number) {
            const parts = lastPO.po_number.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }

        finalPoNumber = `${prefix}${nextSeq}`;
    }

    console.log(`[DEBUG] Final PO Number: ${finalPoNumber}`);

    // Step A: Insert Parent PO
    const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
            tenant_id: tenantId,
            supplier_id: safeData.supplier_id,
            created_by: currentUser.id,
            po_number: finalPoNumber,
            status: safeData.status,
            order_date: safeData.order_date,
            expected_date: safeData.expected_date || null,
            received_date: safeData.received_date || null,
            notes: safeData.notes || null,

            vehicle_no: safeData.vehicle_no || null,
            reference_name: safeData.reference_name || null,
            terms_conditions: safeData.terms_conditions || null,

            payment_status: safeData.payment_status,
            payment_method: safeData.payment_method,
            is_gst_supply: safeData.is_gst_supply,
            is_interstate: safeData.is_interstate,
            subtotal: safeData.subtotal,
            round_off: safeData.round_off,
            discount_amount: safeData.discount_amount,
            cgst_total: safeData.cgst_total,
            sgst_total: safeData.sgst_total,
            igst_total: safeData.igst_total,
            total_amount: safeData.total_amount,
            amount_paid: safeData.amount_paid,
            amount_due: safeData.amount_due,
        })
        .select()
        .single();

    if (poError) throw new Error(poError.message || "Failed to create Purchase Order.");

    // Step B: Insert Line Items
    const lineItemsToInsert = safeData.po_line_items.map((item) => {
        const { id, ...itemData } = item;
        return { po_id: newPO.id, ...itemData };
    });

    const { error: insertError } = await supabase
        .from('po_line_items')
        .insert(lineItemsToInsert);

    if (insertError) throw new Error(insertError.message || "Failed to save PO line items.");

    // Step C: INVENTORY SYNC (Add RECEIVED items to stock)
    if (safeData.status !== 'draft') {
        // for (const item of safeData.po_line_items) {
        //     if (item.qty_received > 0) {
        //         await syncInventoryStock(tenantId, item.item_id, Math.abs(item.qty_received), "Create PO (Receive)");
        //     }
        // }
        await syncPOBatches(tenantId, newPO.id, finalPoNumber, [], safeData.po_line_items);

        await supabase.rpc('sync_supplier_metrics', { p_supplier_id: safeData.supplier_id });
    }

    console.log(`[DEBUG] Purchase Order successfully created with ID: ${newPO.id}`);
    console.log(`=== [DEBUG - createPurchaseOrder END] ===\n`);
    return newPO;
}

export async function updatePurchaseOrder(tenantId: string, poId: string, data: PurchaseOrderFormData) {
    console.log(`\n=== [DEBUG - updatePurchaseOrder] ===`);
    console.log(`[DEBUG] Updating PO ID: ${poId}`);

    const { count, error: checkError } = await supabase
        .from('purchase_returns')
        .select('*', { count: 'exact', head: true })
        .eq('original_po_id', poId)
        .eq('tenant_id', tenantId);

    if (checkError) throw new Error(checkError.message);
    if (count && count > 0) {
        throw new Error("Cannot edit this Purchase Order because a Purchase Return is attached to it. Please delete the return first.");
    }

    // 1. Fetch existing PO to calculate differences
    const { data: oldPO } = await supabase
        .from('purchase_orders')
        .select('po_number, total_amount, amount_due, amount_paid, settlement_discount, supplier_id')
        .eq('id', poId)
        .single();

    if (!oldPO) throw new Error("Original PO not found.");
    const { data: oldItems } = await supabase.from('po_line_items').select('item_id, qty_received').eq('po_id', poId);

    // 2. Run Engine
    const checkResult = PurchaseCalculationEngine.verifyPurchaseOrder(data);
    if (!checkResult.isValid) throw new Error(`Data sync error. Form total does not match server total.`);

    const safeData = checkResult.sanitizedData;

    // Step A: INVENTORY SYNC (Subtract old received items back out of stock before deleting)
    // const { data: oldItems } = await supabase.from('po_line_items').select('item_id, qty_received').eq('po_id', poId);
    // if (oldItems) {
    //     for (const old of oldItems) {
    //         if (old.qty_received > 0) {
    //             await syncInventoryStock(tenantId, old.item_id, -Math.abs(old.qty_received), "Update PO (Revert)");
    //         }
    //     }
    // }

    // // Step B: Update Parent PO
    const currentPaid = Number(oldPO.amount_paid || 0);
    const currentDiscount = Number(oldPO.settlement_discount || 0);
    const finalAmountDue = Math.max(0, safeData.amount_due - currentPaid - currentDiscount);
    const safePaymentStatus = finalAmountDue <= 0 ? 'paid' : (currentPaid > 0 || currentDiscount > 0 ? 'partial' : safeData.payment_status);

    const { data: updatedPO, error: poError } = await supabase
        .from('purchase_orders')
        .update({
            supplier_id: safeData.supplier_id,
            po_number: safeData.po_number,
            status: safeData.status,
            payment_status: safePaymentStatus,
            payment_method: safeData.payment_method,
            is_gst_supply: safeData.is_gst_supply,
            is_interstate: safeData.is_interstate,
            subtotal: safeData.subtotal,
            round_off: safeData.round_off,
            discount_amount: safeData.discount_amount,
            cgst_total: safeData.cgst_total,
            sgst_total: safeData.sgst_total,
            igst_total: safeData.igst_total,
            total_amount: safeData.total_amount,
            amount_paid: currentPaid,
            amount_due: finalAmountDue,
            order_date: safeData.order_date,
            expected_date: safeData.expected_date || null,
            received_date: safeData.received_date || null,
            notes: safeData.notes || null,
            vehicle_no: safeData.vehicle_no || null,
            reference_name: safeData.reference_name || null,
            terms_conditions: safeData.terms_conditions || null,
        })
        .eq('tenant_id', tenantId)
        .eq('id', poId)
        .select()
        .single();

    if (poError) {
        console.error("[API Update] Error updating parent PO:", poError);
        throw new Error(poError.message || "Failed to update Purchase Order.");
    }

    // Step C: Wipe & Replace Line Items
    await supabase.from('po_line_items').delete().eq('po_id', poId);

    const lineItemsToInsert = safeData.po_line_items.map((item) => {
        const { id, ...itemData } = item;
        return { po_id: poId, ...itemData };
    });

    // console.log("[API Update] Sending Line Items to DB:", lineItemsToInsert);
    const { error: itemsError } = await supabase.from('po_line_items').insert(lineItemsToInsert);

    if (itemsError) {
        console.error("[API Update] Error updating Line Items:", itemsError);
        throw new Error("Failed to insert new line items.");
    }

    // Step D: INVENTORY SYNC
    // for (const newItem of safeData.po_line_items) {
    //     if (newItem.qty_received > 0) {
    //         await syncInventoryStock(tenantId, newItem.item_id, Math.abs(newItem.qty_received), "Update PO (Apply)");
    //     }
    // }

    const newItemsPayload = safeData.status === 'draft' ? [] : safeData.po_line_items;
    if (safeData.status !== 'draft') {
        // NEW: Passes old state and new state to intelligently update batches
        await syncPOBatches(tenantId, poId, safeData.po_number || oldPO.po_number, oldItems || [], newItemsPayload);
    }

    // Step E: SUPPLIER METRICS
    await supabase.rpc('sync_supplier_metrics', { p_supplier_id: safeData.supplier_id });

    console.log(`[DEBUG] PO successfully updated.`);
    console.log(`=== [DEBUG - updatePurchaseOrder END] ===\n`);
    return updatedPO;
}

export async function deletePurchaseOrder(tenantId: string, poId: string, forceHardDelete: boolean = false) {
    console.log(`\n=== [DEBUG - deletePurchaseOrder] ===`);
    console.log(`[DEBUG] Attempting to delete PO ID: ${poId}`);

    const { count, error: checkError } = await supabase
        .from('purchase_returns')
        .select('*', { count: 'exact', head: true })
        .eq('original_po_id', poId)
        .eq('tenant_id', tenantId);

    if (checkError) throw new Error(checkError.message);
    if (count && count > 0) {
        throw new Error("Cannot delete this Purchase Order because a Purchase Return is attached to it. Please delete the return first.");
    }

    const { data: poToDelete } = await supabase
        .from('purchase_orders')
        .select('po_number, status, total_amount, amount_due, supplier_id')
        .eq('id', poId)
        .single();

    // if (!poToDelete) {
    //     console.error("[API Update] Error fetching the purchase order");
    //     throw new Error("Failed to insert new line items.");
    // }
    if (!poToDelete) return true;

    const isAlreadyCancelled = poToDelete.status === 'cancelled';

    const revertSideEffects = async () => {
        // Step A: INVENTORY SYNC (PO is canceled, subtract received items back out of stock)
        const { data: lineItems } = await supabase
            .from('po_line_items')
            .select('item_id, qty_received ')
            .eq('po_id', poId);

        if (lineItems) {
            await syncPOBatches(tenantId, poId, poToDelete.po_number, lineItems, []);
        }
    }

    // if (lineItems) {
    //     for (const item of lineItems) {
    //         if (item.qty_received > 0) {
    //             await syncInventoryStock(tenantId, item.item_id, -Math.abs(item.qty_received), "Delete PO (Revert)");
    //         }
    //     }
    // }

    // CASE A: Hard Delete (Already Cancelled OR Force Delete)
    if (isAlreadyCancelled || forceHardDelete) {
        if (!isAlreadyCancelled) {
            await revertSideEffects();
        }

        // Step B: Delete the PO record
        const { error } = await supabase.from('purchase_orders').delete().eq('tenant_id', tenantId).eq('id', poId);

        if (error) {
            if (error.code === '23503') throw new Error("Cannot delete this PO because a Purchase Return is attached to it.");
            throw new Error(error.message || "Failed to delete Purchase Order.");
        }


        await supabase.rpc('sync_supplier_metrics', { p_supplier_id: poToDelete.supplier_id });
        return true;
    }

    // CASE B: Normal Cancellation (Soft Delete - First Click)
    await revertSideEffects();

    await supabase
        .from('purchase_orders')
        .update({ status: 'cancelled', payment_status: 'cancelled' })
        .eq('id', poId)
        .eq('tenant_id', tenantId);

    await supabase.rpc('sync_supplier_metrics', { p_supplier_id: poToDelete.supplier_id });

    console.log(`=== [DEBUG - deletePurchaseOrder END] ===\n`);
    return true;
}

export async function fetchPurchaseReturns(tenantId: string): Promise<PurchaseReturnWithDetails[]> {
    const { data, error } = await supabase
        .from('purchase_returns')
        .select(`
            *,
            purchase_orders (
                po_number,
                suppliers ( name )
            ),
            return_items:purchase_return_items ( * )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Database Error fetching purchase returns:", error.message);
        throw new Error("Failed to fetch purchase returns");
    }

    // Cast to our strict nested interface
    return data as unknown as PurchaseReturnWithDetails[];
}

export async function createPurchaseReturn(tenantId: string, data: PurchaseReturnFormData) {
    console.log(`\n=== [DEBUG - createPurchaseReturn] ===`);
    console.log(`[DEBUG] Incoming PR Data:`, JSON.stringify(data, null, 2));

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    // SERVER-SIDE INVENTORY GATEKEEPER
    // Because returning to a supplier deducts stock, we must verify we have enough to return
    const itemIds = data.return_items.map(item => item.item_id).filter(Boolean);
    if (itemIds.length > 0) {
        const { data: dbItems } = await supabase
            .from('inventory_summary')
            .select('id, total_stock_qty')
            .in('id', itemIds);

        if (dbItems) {
            for (const item of data.return_items) {
                if (item.item_id && item.return_qty > 0) {
                    const dbItem = dbItems.find(i => i.id === item.item_id);
                    if (dbItem && item.return_qty > Number(dbItem.total_stock_qty)) {
                        throw new Error(`Transaction blocked: Return quantity (${item.return_qty}) for "${item.item_name}" exceeds available database stock (${dbItem.total_stock_qty}).`);
                    }
                }
            }
        }
    }

    // 1. Fetch Original PO for Engine Verification
    const originalPO = await fetchPurchaseOrderById(tenantId, data.original_po_id);
    if (!originalPO) throw new Error("Original PO not found.");

    // 2. Calculate Fair Refund using Engine
    const { verifiedReturnItems, finalRefundAmount } = PurchaseCalculationEngine.calculatePurchaseRefund(originalPO, data.return_items);

    // 3. Insert Parent Return
    const { data: newReturn, error: returnError } = await supabase
        .from('purchase_returns')
        .insert({
            tenant_id: tenantId,
            original_po_id: data.original_po_id,
            reason: data.reason || null,
            refund_amount: finalRefundAmount, // Use verified amount
            refund_method: data.refund_method,
            created_by: currentUser.id
        })
        .select()
        .single();

    if (returnError) throw new Error(returnError.message || "Failed to create Purchase Return");

    const validReturnItems = verifiedReturnItems.filter(item => item.return_qty > 0);

    if (validReturnItems.length > 0) {
        const lineItemsPayload = validReturnItems.map(item => ({
            purchase_return_id: newReturn.id,
            po_line_item_id: item.po_line_item_id,
            item_id: item.item_id || null,
            item_name: item.item_name,
            return_qty: item.return_qty,
            refund_amount: item.refund_total
        }));

        const { error: itemsError } = await supabase.from('purchase_return_items').insert(lineItemsPayload);
        if (itemsError) throw new Error(itemsError.message || "Failed to save return items");

        // INVENTORY SYNC: Subtract returned items from warehouse stock
        for (const item of validReturnItems) {
            if (item.item_id) {
                await syncPRBatchStock(tenantId, data.original_po_id, item.item_id, -Math.abs(item.return_qty), "Create PR (Outbound)");
                // await syncInventoryStock(tenantId, item.item_id, -Math.abs(item.return_qty), "Purchase Return (Outbound)");
            }
        }
    }

    // STRICT LEDGER MATH
    await applyPurchaseReturnFinancials(tenantId, newReturn.id, originalPO.id, finalRefundAmount, data.refund_method, currentUser.id);

    await defensivePOSync(tenantId, data.original_po_id);
    await supabase.rpc('sync_supplier_metrics', { p_supplier_id: originalPO.supplier_id });

    console.log(`=== [DEBUG - createPurchaseReturn END] ===\n`);
    return newReturn;
}

export async function updatePurchaseReturn(tenantId: string, returnId: string, data: PurchaseReturnFormData) {
    console.log(`\n=== [DEBUG - updatePurchaseReturn] ===`);
    console.log(`[DEBUG] Updating PR ID: ${returnId}`);

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    // 1. Fetch old items FIRST to calculate effective stock for the gatekeeper
    const { data: oldItems } = await supabase
        .from('purchase_return_items')
        .select('*')
        .eq('purchase_return_id', returnId);

    // 2. SERVER-SIDE INVENTORY GATEKEEPER
    const itemIds = data.return_items.map(item => item.item_id).filter(Boolean);
    if (itemIds.length > 0) {
        const { data: dbItems } = await supabase.from('items').select('id, total_stock_qty').in('id', itemIds);
        if (dbItems) {
            for (const item of data.return_items) {
                if (item.item_id && item.return_qty > 0) {
                    const dbItem = dbItems.find(i => i.id === item.item_id);
                    if (dbItem) {
                        // Find out how many of this item were ALREADY returned in this specific PR
                        const oldItemRecord = oldItems?.find(old => old.item_id === item.item_id);
                        const oldReturnQty = oldItemRecord ? Number(oldItemRecord.return_qty) : 0;

                        // The "effective" stock is the current DB stock PLUS the stock that is about to be reverted
                        const effectiveStock = Number(dbItem.total_stock_qty) + oldReturnQty;

                        if (item.return_qty > effectiveStock) {
                            throw new Error(`Transaction blocked: Updated return qty (${item.return_qty}) for "${item.item_name}" exceeds available database stock (${effectiveStock}).`);
                        }
                    }
                }
            }
        }
    }

    const { data: oldReturn } = await supabase.from('purchase_returns').select('refund_amount, refund_method, original_po_id').eq('id', returnId).single();
    if (!oldReturn) throw new Error("Return not found.");

    const originalPO = await fetchPurchaseOrderById(tenantId, oldReturn.original_po_id);
    if (!originalPO) throw new Error("Original PO not found.");

    const { verifiedReturnItems, finalRefundAmount } = PurchaseCalculationEngine.calculatePurchaseRefund(originalPO, data.return_items);

    // 1. Revert Old Inventory (Add stock back temporarily)
    // const { data: oldItems } = await supabase
    //     .from('purchase_return_items')
    //     .select('*')
    //     .eq('purchase_return_id', returnId);

    if (oldItems) {
        for (const item of oldItems) {
            if (item.item_id) {
                // await syncInventoryStock(tenantId, item.item_id, Math.abs(item.return_qty), "Update PR (Revert)");
                await syncPRBatchStock(tenantId, oldReturn.original_po_id, item.item_id, Math.abs(item.return_qty), "Update PR (Revert)");
            }
        }
    }

    // FINANCIAL REVERT
    await revertPurchaseReturnFinancials(tenantId, returnId, oldReturn.original_po_id);

    const { data: updatedReturn, error: updateError } = await supabase
        .from('purchase_returns')
        .update({
            reason: data.reason || null,
            refund_amount: finalRefundAmount,
            refund_method: data.refund_method,
        })
        .eq('id', returnId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

    if (updateError) throw new Error(updateError.message || "Failed to update return.");

    await supabase.from('purchase_return_items').delete().eq('purchase_return_id', returnId);

    const validReturnItems = verifiedReturnItems.filter(item => item.return_qty > 0);
    if (validReturnItems.length > 0) {
        const lineItemsPayload = validReturnItems.map(item => ({
            purchase_return_id: returnId,
            po_line_item_id: item.po_line_item_id,
            item_id: item.item_id || null,
            item_name: item.item_name,
            return_qty: item.return_qty,
            refund_amount: item.refund_total
        }));

        const { error: insertError } = await supabase.from('purchase_return_items').insert(lineItemsPayload);
        if (insertError) throw new Error(insertError.message || "Failed to save updated returned items.");

        for (const item of validReturnItems) {
            // if (item.item_id) await syncInventoryStock(tenantId, item.item_id, -Math.abs(item.return_qty), "Update PR (Apply)");
            if (item.item_id) {
                await syncPRBatchStock(tenantId, originalPO.id, item.item_id, -Math.abs(item.return_qty), "Update PR (Apply)");
            }
        }
    }

    // FINANCIAL APPLY
    await applyPurchaseReturnFinancials(tenantId, returnId, originalPO.id, finalRefundAmount, data.refund_method, currentUser.id);

    await defensivePOSync(tenantId, oldReturn.original_po_id);
    await supabase.rpc('sync_supplier_metrics', { p_supplier_id: originalPO.supplier_id });

    console.log(`=== [DEBUG - updatePurchaseReturn END] ===\n`);
    return updatedReturn;
}

export async function deletePurchaseReturn(tenantId: string, returnId: string) {
    console.log(`\n=== [DEBUG - deletePurchaseReturn] ===`);
    console.log(`[DEBUG] Deleting PR ID: ${returnId}`);

    const { data: returnToDelete } = await supabase.from('purchase_returns').select('refund_amount, refund_method, original_po_id').eq('id', returnId).single();
    if (!returnToDelete) return true;

    // 1. Revert Inventory (Add stock back because the return was cancelled)
    const { data: oldItems } = await supabase
        .from('purchase_return_items')
        .select('*')
        .eq('purchase_return_id', returnId);

    if (oldItems) {
        for (const item of oldItems) {
            if (item.item_id) {
                await syncPRBatchStock(tenantId, returnToDelete.original_po_id, item.item_id, Math.abs(item.return_qty), "Delete PR (Revert)");
                // await syncInventoryStock(tenantId, item.item_id, Math.abs(item.return_qty), "Delete PR (Revert)");
            }
        }
    }

    // 2. Update PO Balance & Supplier Metrics
    const originalPO = await fetchPurchaseOrderById(tenantId, returnToDelete.original_po_id);
    if (!originalPO) throw new Error("Original PO not found.");

    // STRICT LEDGER MATH
    await revertPurchaseReturnFinancials(tenantId, returnId, originalPO.id);

    const { error } = await supabase.from('purchase_returns').delete().eq('id', returnId).eq('tenant_id', tenantId);
    if (error) throw new Error(error.message || "Failed to delete purchase return.");

    await defensivePOSync(tenantId, returnToDelete.original_po_id);
    await supabase.rpc('sync_supplier_metrics', { p_supplier_id: originalPO.supplier_id });

    console.log(`=== [DEBUG - deletePurchaseReturn END] ===\n`);
    return true;
}