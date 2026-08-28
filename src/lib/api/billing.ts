import { BatchAllocation, BillDetail, BillWithCustomer, SalesReturnWithDetails } from "@/types/billing";
import { supabase } from "../supabase/client";
import { BillFormData } from "../validations/billSchema";
import { SalesReturnFormData } from "../validations/salesReturnSchema";
import { CalculationEngine } from "../services/CalculationEngine";
import { getLocalDateString } from "../utils";

export async function fetchAllBills(
    tenantId: string,
): Promise<BillWithCustomer[]> {
    const { data, error } = await supabase
        .from("bills")
        .select(
            `
            *,
            customers (
                name,
                type,
                phone,
                email,
                address,
                gstin
            )
        `,
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Database Error fetching bills:", error.message);
        throw new Error("Failed to fetch bills");
    }

    return data as unknown as BillWithCustomer[];
}

export async function fetchBillById(
    tenantId: string,
    billId: string,
): Promise<BillDetail | null> {
    console.log(`[DEBUG - API] Fetching Bill ID: ${billId} for Tenant: ${tenantId}`);

    const { data, error } = await supabase
        .from("bills")
        .select(
            `
            *,
            customers (
                name,
                type, 
                phone, 
                email, 
                address,
                gstin
            ),
            bill_line_items ( * ),
            sales_returns!sales_returns_original_bill_id_fkey (
                *,
                sales_return_items ( * )
            )
        `,
        )
        .eq("tenant_id", tenantId)
        .eq("id", billId)
        .single();

    console.log("[DEBUG - API] fetchBillById Supabase Result:", { data, error });

    if (error) {
        console.error("Database Error fetching single bill:", error.message);
        throw new Error("Failed to fetch bill details");
    }

    if (!data) return null;

    return data as unknown as BillDetail;
}

// Helper Function: Ensures every bill gets a valid customer ID
async function resolveCustomer(tenantId: string, data: BillFormData, isUpdateMode: boolean = false): Promise<string> {
    // 1. Registered Customer
    if (data.customer_type === 'registered') {
        if (!data.customer_id || data.customer_id.trim() === "") throw new Error("A registered customer must be selected.");
        return data.customer_id;
    }

    // 2. Flying Customer (Updating an existing bill's walk-in customer)
    if (isUpdateMode && data.customer_id && data.customer_id.trim() !== "") {
        // Safety Check: Ensure we don't accidentally overwrite a Registered customer if UI state leaked
        const { data: existingCust } = await supabase.from('customers').select('type').eq('id', data.customer_id).single();

        if (existingCust && existingCust.type === 'flying') {
            await supabase
                .from('customers')
                .update({
                    name: data.customer_name || 'Walk-in Customer',
                    phone: data.customer_phone || null,
                })
                .eq('id', data.customer_id)
                .eq('tenant_id', tenantId);
            return data.customer_id;
        }
    }

    // 3. Flying Customer (Brand new walk-in)
    const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
            tenant_id: tenantId,
            type: 'flying',
            name: (data.customer_name && data.customer_name.trim() !== "") ? data.customer_name : 'Walk-in Customer',
            phone: (data.customer_phone && data.customer_phone.trim() !== "") ? data.customer_phone : null,
        })
        .select('id')
        .single();

    if (error) {
        console.error("Error creating flying customer:", error.message);
        throw new Error("Failed to generate a walk-in customer record.");
    }

    return newCustomer.id;
}

async function syncBatchStock(allocations: BatchAllocation[] | undefined | null, multiplier: number, actionName: string) {
    if (!allocations || allocations.length === 0) return;

    for (const alloc of allocations) {
        if (!alloc.batch_id) continue;

        // Multiplier 1 = Add to stock (Returns)
        // Multiplier -1 = Remove from stock (Sales or Reverting Returns)
        const qtyChange = Number(alloc.qty) * multiplier;

        const { error } = await supabase.rpc('adjust_batch_stock', {
            p_batch_id: alloc.batch_id,
            p_qty_change: qtyChange
        });

        if (error) {
            console.error(`[DEBUG - INVENTORY] ${actionName} Sync Failed for Batch ${alloc.batch_id}:`, error.message);
        } else {
            console.log(`[DEBUG - INVENTORY] ${actionName} applied ${qtyChange} to batch ${alloc.batch_id}.`);
        }
    }
}

async function defensiveBillSync(tenantId: string, billId: string) {
    console.log(`\n=== [DEBUG - defensiveBillSync] ===`);
    console.log(`[DEBUG] Syncing Bill ID: ${billId}`);

    // 1. Fetch the original bill lines to get the base gross profit
    const { data: billLines } = await supabase.from('bill_line_items').select('line_profit').eq('bill_id', billId);
    const baseGrossProfit = billLines?.reduce((sum, item) => sum + Number(item.line_profit), 0) || 0;

    // 2. Fetch all active returns for this bill
    const { data: returns } = await supabase.from('sales_returns').select('id, refund_amount').eq('original_bill_id', billId).eq('tenant_id', tenantId);
    const returnIds = returns?.map(r => r.id) || [];

    let totalLostProfit = 0;

    // 3. If there are returns, calculate the exact profit lost from the returned inventory
    if (returnIds.length > 0) {
        const { data: returnedItems } = await supabase.from('sales_return_items')
            .select('return_qty, return_batch_allocations, bill_line_items(unit_price, discount_pct)')
            .in('sales_return_id', returnIds);

        returnedItems?.forEach(rt => {
            const qty = Number(rt.return_qty);

            // Supabase joins return objects/arrays based on relations. We extract the linked line item safely.
            const line = Array.isArray(rt.bill_line_items) ? rt.bill_line_items[0] : rt.bill_line_items;
            if (!line) return;

            const sellPrice = Number(line.unit_price);
            const discPct = Number(line.discount_pct);

            let costRecovered = 0;
            if (rt.return_batch_allocations && Array.isArray(rt.return_batch_allocations)) {
                rt.return_batch_allocations.forEach((alloc: BatchAllocation) => {
                    costRecovered += (Number(alloc.qty) * Number(alloc.buy_price));
                });
            }

            // Reconstruct what the revenue and cost were for the specific returned quantity
            const revenueLost = (qty * sellPrice) * (1 - (discPct / 100));

            totalLostProfit += (revenueLost - costRecovered);
        });
    }

    // 4. Fetch the current financial state of the bill
    const { data: currentBill } = await supabase.from('bills').select('grand_total, amount_paid, settlement_discount, discount_amount').eq('id', billId).single();
    console.log(`[DEBUG] Fetched Bill State:`, currentBill);

    if (currentBill) {
        const { data: allReturns } = await supabase.from('sales_returns').select('refund_amount').eq('original_bill_id', billId).eq('tenant_id', tenantId);

        const totalRet = allReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;
        console.log(`[DEBUG] Total historical returns for this bill: ₹${totalRet}`);

        // We do NOT alter amount_paid here. amount_paid is strictly the sum of the Payments table.
        const netBill = Number(currentBill.grand_total) - totalRet;
        const newDue = Math.max(0, netBill - Number(currentBill.amount_paid) - Number(currentBill.settlement_discount));

        const safeStatus = newDue <= 0 ? 'paid' : (Number(currentBill.amount_paid) > 0 ? 'partial' : 'issued');

        // 5. Calculate the True Net Profit (Base Profit - Lost Profit - Global Discounts)
        const trueNetProfit = baseGrossProfit - totalLostProfit - Number(currentBill.discount_amount) - Number(currentBill.settlement_discount);

        console.log(`[DEBUG] Evaluated Net Bill: ₹${netBill} | New Due: ₹${newDue} | New Status: ${safeStatus}`);
        await supabase.from('bills').update({ amount_due: newDue, status: safeStatus, total_profit: trueNetProfit }).eq('id', billId);
    }

    console.log(`=== [DEBUG - defensiveBillSync END] ===\n`);
}

async function applyReturnFinancials(tenantId: string, returnId: string, billId: string, refundAmount: number, refundMethod: string, recordedBy: string) {
    console.log(`\n=== [DEBUG - applyReturnFinancials] ===`);

    const { data: bill } = await supabase.from('bills').select('grand_total, amount_paid, settlement_discount, customer_id').eq('id', billId).single();
    if (!bill) return;

    // Fetch Base Returns (Excluding the one we are currently applying)
    const { data: otherReturns } = await supabase.from('sales_returns').select('refund_amount').eq('original_bill_id', billId).neq('id', returnId).eq('tenant_id', tenantId);
    const baseReturns = otherReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;

    const netBill = Number(bill.grand_total) - baseReturns;
    const currentDebt = Math.max(0, netBill - Number(bill.amount_paid) - Number(bill.settlement_discount));

    // 1. Calculate how much pays off the bill vs how much goes to the wallet
    const debtRelief = Math.min(refundAmount, currentDebt);
    const walletImpact = refundAmount - debtRelief;

    console.log(`[DEBUG] Pre-Return State -> Net Bill: ₹${netBill}, Current Debt: ₹${currentDebt}`);
    console.log(`[DEBUG] Return Amount: ₹${refundAmount} -> Debt Relief: ₹${debtRelief}, Wallet Impact: ₹${walletImpact}`);

    // 2. Apply impacts
    if (walletImpact > 0) {
        if (refundMethod === 'credit_note') {
            const { data: cust } = await supabase.from('customers').select('advance_balance').eq('id', bill.customer_id).single();
            const newAdvance = Number(cust?.advance_balance || 0) + walletImpact;

            console.log(`[DEBUG] Adding ₹${walletImpact} to Wallet. New Balance: ₹${newAdvance}`);

            await supabase.from('customers').update({ advance_balance: newAdvance }).eq('id', bill.customer_id);
            await supabase.from('credit_ledger').insert({
                tenant_id: tenantId,
                entity_type: 'customer',
                entity_id: bill.customer_id,
                flow_type: 'in',
                amount: walletImpact,
                balance_after: newAdvance,
                reference_type: 'sales_return',
                reference_id: returnId,
                description: 'Credit Note generated from Return.',
                created_by: recordedBy
            });
        } else {
            console.log(`[DEBUG] Paying out ₹${walletImpact} in Cash. Reducing bill amount_paid.`);
            await supabase.from('cash_book').insert({
                tenant_id: tenantId,
                recorded_by: recordedBy,
                type: 'out',
                amount: walletImpact,
                description: `Sales Refund Payout`,
                reference_type: 'sales_return',
                reference_id: returnId,
                payment_method: refundMethod
            });

            // Cash left the drawer, meaning the customer effectively paid us less. We must reduce amount_paid to maintain balance.
            await supabase.from('bills').update({ amount_paid: Math.max(0, Number(bill.amount_paid) - walletImpact) }).eq('id', billId);
        }
    }
    console.log(`=== [DEBUG - applyReturnFinancials END] ===\n`);
}


async function revertReturnFinancials(tenantId: string, returnId: string, billId: string) {
    console.log(`\n=== [DEBUG - revertReturnFinancials] ===`);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");

    const { data: bill } = await supabase.from('bills').select('grand_total, amount_paid, settlement_discount, customer_id').eq('id', billId).single();
    if (!bill) return;

    const { data: returnToDelete } = await supabase.from('sales_returns').select('refund_amount, refund_method').eq('id', returnId).single();
    if (!returnToDelete) return;

    const refundAmount = Number(returnToDelete.refund_amount);
    const refundMethod = returnToDelete.refund_method;

    // 1. Calculate Active Credit BEFORE deleting this return
    const { data: allReturns } = await supabase.from('sales_returns').select('refund_amount').eq('original_bill_id', billId).eq('tenant_id', tenantId);
    const totalReturnsBefore = allReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;
    const netBillBefore = Number(bill.grand_total) - totalReturnsBefore;
    const effectivePaid = Number(bill.amount_paid) + Number(bill.settlement_discount);

    const activeCreditBefore = Math.max(0, effectivePaid - netBillBefore);

    // 2. Calculate Active Credit AFTER deleting this return
    const netBillAfter = netBillBefore + refundAmount;
    const activeCreditAfter = Math.max(0, effectivePaid - netBillAfter);

    // 3. The true amount of wallet/cash that needs to be reversed
    const creditToReverse = activeCreditBefore - activeCreditAfter;
    console.log(`[DEBUG] Revert Analysis -> Active Before: ₹${activeCreditBefore}, Active After: ₹${activeCreditAfter}, Reversing: ₹${creditToReverse}`);

    if (creditToReverse > 0) {
        if (refundMethod === 'credit_note') {
            const { data: cust } = await supabase.from('customers').select('advance_balance').eq('id', bill.customer_id).single();
            let currentAdvance = Number(cust?.advance_balance || 0);
            let shortfall = 0;

            if (creditToReverse > currentAdvance) {
                shortfall = creditToReverse - currentAdvance;
                currentAdvance = 0;
            } else {
                currentAdvance -= creditToReverse;
            }

            console.log(`[DEBUG] Reverting Credit. New Advance: ₹${currentAdvance}. Shortfall: ₹${shortfall}`);
            await supabase.from('customers').update({ advance_balance: currentAdvance }).eq('id', bill.customer_id);

            // Insert an 'out' record to explicitly document the reversal
            await supabase.from('credit_ledger').insert({
                tenant_id: tenantId, entity_type: 'customer', entity_id: bill.customer_id,
                flow_type: 'out', amount: creditToReverse, balance_after: currentAdvance,
                reference_type: 'manual_adjustment', reference_id: crypto.randomUUID(),
                description: 'Reversal of Credit Note due to Return update/deletion.',
                created_by: currentUser.id
            });

            if (shortfall > 0) {
                await supabase.from('bills').update({ amount_paid: Number(bill.amount_paid) - shortfall }).eq('id', billId);
            }
        } else {
            console.log(`[DEBUG] Reverting Cash. Adding ₹${creditToReverse} to amount_paid.`);
            const { data: freshBill } = await supabase.from('bills').select('amount_paid').eq('id', billId).single();
            await supabase.from('bills').update({ amount_paid: Number(freshBill?.amount_paid || 0) + creditToReverse }).eq('id', billId);

            // Insert an 'in' cash book record
            await supabase.from('cash_book').insert({
                tenant_id: tenantId, recorded_by: currentUser.id,
                type: 'in', amount: creditToReverse, description: `Reversal of Cash Refund due to Return update/deletion.`,
                reference_type: 'manual', reference_id: crypto.randomUUID(), payment_method: 'cash'
            });
        }
    }
    console.log(`=== [DEBUG - revertReturnFinancials END] ===\n`);
}

export async function fetchNextBillNumberPreview(tenantId: string): Promise<string> {
    // Get local date YYYY-MM-DD
    const localDate = getLocalDateString(new Date().toISOString());

    const datePrefix = localDate.replace(/-/g, '/');
    const prefix = `INV-${datePrefix}-`;

    const { data: lastBill } = await supabase
        .from('bills')
        .select('bill_number')
        .eq('tenant_id', tenantId)
        .ilike('bill_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    let nextSeq = 1;
    if (lastBill && lastBill.bill_number) {
        const parts = lastBill.bill_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }

    return `${prefix}${nextSeq}`;
}

export async function createBill(tenantId: string, data: BillFormData) {
    console.log(`\n=== [DEBUG - createBill] ===`);
    console.log(`[DEBUG] Incoming Bill Data:`, JSON.stringify(data, null, 2));

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    // 1. Fetch current inventory prices for the items in the cart
    const itemIds = data.bill_line_items.map(item => item.item_id).filter(Boolean);

    const actualPricesMap: Record<string, number> = {};
    const activeBatchesMap: Record<string, { id: string; stock_qty: number; buy_price: number; sell_price: number; batch_number: string | null }[]> = {};

    if (itemIds.length > 0) {
        const { data: dbItems } = await supabase
            .from('inventory_summary')
            .select('id, default_sell_price, total_stock_qty, batches')
            .in('id', itemIds);

        if (dbItems) {
            for (const item of data.bill_line_items) {
                if (item.item_id) {
                    const dbItem = dbItems.find(i => i.id === item.item_id);
                    if (dbItem) {
                        actualPricesMap[item.item_id] = Number(dbItem.default_sell_price);

                        // Pass active batches to the Engine for safety fallback
                        if (dbItem.batches && Array.isArray(dbItem.batches)) {
                            activeBatchesMap[item.item_id] = dbItem.batches.filter((b: { stock_qty: number }) => Number(b.stock_qty) > 0);
                        } else {
                            activeBatchesMap[item.item_id] = [];
                        }

                        // SERVER-SIDE INVENTORY GATEKEEPER
                        if (item.qty > Number(dbItem.total_stock_qty)) {
                            throw new Error(`Transaction blocked: Requested quantity (${item.qty}) for "${item.item_name}" exceeds available database stock (${dbItem.total_stock_qty}).`);
                        }
                    }
                }
            }
        }
    }

    // 1. Run through the Calculation Engine
    const checkResult = CalculationEngine.verifyBill(data, actualPricesMap, activeBatchesMap);

    // 2. The Gatekeeper: Block if tampered or out of sync
    if (!checkResult.isValid) {
        console.error("[SECURITY] Bill Math Discrepancy in Create Bill:", checkResult.discrepancyDetails);

        // This throw will be caught by your frontend React Hook Form 
        // or API error boundary to show a toast notification.
        throw new Error(
            `Data sync error: The form total (₹${checkResult.discrepancyDetails?.submitted_total}) ` +
            `does not match the server verified total (₹${checkResult.discrepancyDetails?.expected_total}). ` +
            `Please refresh the page or review your cart.`
        );
    }

    // 3. Extract the clean data to continue saving
    const safeData = checkResult.sanitizedData;

    const finalCustomerId = await resolveCustomer(tenantId, safeData, false);

    let finalBillNumber = safeData.bill_number?.trim();

    if (!finalBillNumber) {
        // Convert '2026-07-18' to '2026/07/18'
        const datePrefix = safeData.bill_date.replace(/-/g, '/');
        const prefix = `INV-${datePrefix}-`;

        // Find the most recent bill for this specific day
        const { data: lastBill } = await supabase
            .from('bills')
            .select('bill_number')
            .eq('tenant_id', tenantId)
            .ilike('bill_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let nextSeq = 1;
        if (lastBill && lastBill.bill_number) {
            // Extract the last number after the final hyphen
            const parts = lastBill.bill_number.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }

        // Example output: INV-2026/07/18-11
        finalBillNumber = `${prefix}${nextSeq}`;
    }

    const { data: newBill, error: billError } = await supabase
        .from('bills')
        .insert({
            tenant_id: tenantId,
            customer_id: finalCustomerId,
            bill_number: finalBillNumber,
            bill_date: safeData.bill_date,
            due_date: safeData.due_date || null,
            vehicle_no: safeData.vehicle_no || null,
            reference_name: safeData.reference_name || null,
            terms_conditions: safeData.terms_conditions || null,
            status: safeData.status,
            is_gst_bill: safeData.is_gst_bill,
            is_interstate: safeData.is_interstate,
            subtotal: safeData.subtotal,
            round_off: safeData.round_off,
            discount_amount: safeData.discount_amount,
            cgst_total: safeData.cgst_total,
            sgst_total: safeData.sgst_total,
            igst_total: safeData.igst_total,
            grand_total: safeData.grand_total,
            amount_paid: safeData.amount_paid,
            amount_due: safeData.amount_due,
            total_profit: safeData.total_profit,
            payment_method: safeData.payment_method,
            notes: safeData.notes || null,
            created_by: currentUser.id,
        })
        .select()
        .single();

    if (billError) {
        console.error("Database Error creating bill:", billError.message);
        throw new Error(billError.message || "Failed to create bill.");
    }

    const accumulatedBillProfit = 0;

    // 2. Insert Line Items
    const lineItemsTOInsert = safeData.bill_line_items.map((item) => {
        const { id, ...itemData } = item;
        return {
            bill_id: newBill.id,
            ...itemData
        };
    });

    const { error: insertError } = await supabase
        .from('bill_line_items')
        .insert(lineItemsTOInsert);

    if (insertError) {
        console.error("Database Error inserting line items:", insertError.message);
        throw new Error(insertError.message || "Failed to save bill items.");
    }

    // 3. INVENTORY SYNC: Deduct purchased items from stock
    for (const item of safeData.bill_line_items) {
        // await syncInventoryStock(tenantId, item.item_id, -Math.abs(item.qty), "Create Bill");
        await syncBatchStock(item.batch_allocations, -1, "Create Bill");
    }

    if (checkResult.total_recovered_amount > 0) {
        const { data: custData } = await supabase
            .from('customers')
            .select('total_write_offs')
            .eq('id', finalCustomerId)
            .single();

        if (custData && Number(custData.total_write_offs) > 0) {
            // Deduct the recovered markup from the bad debt (preventing negative bad debt)
            const newWriteOffBalance = Math.max(0, Number(custData.total_write_offs) - checkResult.total_recovered_amount);

            await supabase
                .from('customers')
                .update({ total_write_offs: newWriteOffBalance })
                .eq('id', finalCustomerId);

            console.log(`[DEBUG] Recovered ₹${checkResult.total_recovered_amount} from extra pricing. New Write-off debt: ₹${newWriteOffBalance}`);
        }
    }

    await supabase.rpc('sync_customer_metrics', { p_customer_id: finalCustomerId });

    console.log(`[DEBUG] Bill successfully created with ID: ${newBill.id}`);
    console.log(`=== [DEBUG - createBill END] ===\n`);
    return newBill;
}

export async function updateBill(tenantId: string, billId: string, data: BillFormData) {
    console.log(`\n=== [DEBUG - updateBill] ===`);
    console.log(`[DEBUG] Updating Bill ID: ${billId}`);
    const finalCustomerId = await resolveCustomer(tenantId, data, true);

    // 1. Fetch CURRENT items held in this bill to prevent Gatekeeper double-counting
    const { data: oldItems } = await supabase
        .from('bill_line_items')
        .select('item_id, qty, batch_allocations, write_off_recovery')
        .eq('bill_id', billId);

    // Map old quantities for fast lookup
    const oldQtyMap: Record<string, number> = {};
    const heldBatchesMap: Record<string, number> = {};
    let oldRecoveryTotal = 0;

    if (oldItems) {
        oldItems.forEach(i => {
            if (i.item_id) oldQtyMap[i.item_id] = Number(i.qty);
            oldRecoveryTotal += Number(i.write_off_recovery || 0);

            if (i.batch_allocations && Array.isArray(i.batch_allocations)) {
                i.batch_allocations.forEach((alloc) => {
                    if (alloc.batch_id) {
                        heldBatchesMap[alloc.batch_id] = (heldBatchesMap[alloc.batch_id] || 0) + Number(alloc.qty);
                    }
                });
            }
        });
    }

    console.log("[DEBUG - updateBill] Held Batches Map calculated:", heldBatchesMap);

    // 1. Fetch current inventory prices for the items in the cart
    const itemIds = data.bill_line_items.map(item => item.item_id).filter(Boolean);
    const actualPricesMap: Record<string, number> = {};
    const activeBatchesMap: Record<string, { id: string; stock_qty: number; buy_price: number; sell_price: number; batch_number: string | null }[]> = {};

    if (itemIds.length > 0) {
        const { data: dbItems } = await supabase
            .from('inventory_summary')
            .select('id, default_sell_price, total_stock_qty, batches')
            .in('id', itemIds);

        if (dbItems) {
            for (const item of data.bill_line_items) {
                if (item.item_id) {
                    const dbItem = dbItems.find(i => i.id === item.item_id);
                    if (dbItem) {
                        actualPricesMap[item.item_id] = Number(dbItem.default_sell_price);
                        if (dbItem.batches && Array.isArray(dbItem.batches)) {
                            activeBatchesMap[item.item_id] = dbItem.batches.map((b) => {
                                const heldQty = heldBatchesMap[b.id] || 0;
                                return {
                                    ...b,
                                    stock_qty: Number(b.stock_qty) + heldQty // Inject held stock back into the batch
                                };
                            }).filter(b => b.stock_qty > 0);
                        } else {
                            activeBatchesMap[item.item_id] = [];
                        }

                        // Add the quantity they ALREADY hold back to the database stock for this check
                        const currentlyHeldQty = oldQtyMap[item.item_id] || 0;
                        const trueAvailableStock = Number(dbItem.total_stock_qty) + currentlyHeldQty;

                        if (item.qty > trueAvailableStock) {
                            throw new Error(`Transaction blocked: Requested quantity (${item.qty}) for "${item.item_name}" exceeds available stock (${trueAvailableStock}).`);
                        }
                    }
                }
            }
        }
    }

    console.log("[DEBUG - updateBill] Active Batches Map sent to Engine:", JSON.stringify(activeBatchesMap, null, 2));

    // 2. Pass Maps to the Engine (Automatically types the returned sanitizedData)
    const checkResult = CalculationEngine.verifyBill(data, actualPricesMap, activeBatchesMap);
    if (!checkResult.isValid) {
        console.error("[SECURITY] Bill Math Discrepancy in Update Bill:", checkResult.discrepancyDetails);

        // This throw will be caught by your frontend React Hook Form 
        // or API error boundary to show a toast notification.
        throw new Error(
            `Data sync error: The form total (₹${checkResult.discrepancyDetails?.submitted_total}) ` +
            `does not match the server verified total (₹${checkResult.discrepancyDetails?.expected_total}). ` +
            `Please refresh the page or review your cart.`
        );
    }
    const safeData = checkResult.sanitizedData;

    const { data: oldBill } = await supabase
        .from('bills')
        .select('grand_total, amount_due, amount_paid, settlement_discount, customer_id')
        .eq('id', billId)
        .single();

    if (!oldBill) throw new Error("Original bill not found.");

    // Fetch active returns to prevent due mismatches on updates
    const { data: returns } = await supabase
        .from('sales_returns')
        .select('refund_amount, refund_method')
        .eq('original_bill_id', billId)
        .eq('tenant_id', tenantId);

    const totalReturned = returns?.reduce((sum, r) => sum + Number(r.refund_amount), 0) || 0;
    const cashRefunded = returns?.filter(r => r.refund_method !== 'credit_note').reduce((sum, r) => sum + Number(r.refund_amount), 0) || 0;

    const currentPaid = Number(oldBill.amount_paid || 0);
    const currentDiscount = Number(oldBill.settlement_discount || 0);

    const effectivePaid = currentPaid - cashRefunded;
    const netBill = data.grand_total - totalReturned;

    const safeAmountDue = Math.max(0, netBill - effectivePaid - currentDiscount);
    const safeStatus = safeAmountDue <= 0 ? 'paid' : (currentPaid > 0 || currentDiscount > 0 ? 'partial' : data.status);

    const { data: updatedBill, error: billError } = await supabase
        .from('bills')
        .update({
            customer_id: finalCustomerId,
            bill_number: data.bill_number,
            bill_date: data.bill_date,
            due_date: data.due_date || null,
            vehicle_no: data.vehicle_no || null,
            reference_name: data.reference_name || null,
            terms_conditions: data.terms_conditions || null,
            status: safeStatus,
            is_gst_bill: data.is_gst_bill,
            is_interstate: data.is_interstate,
            subtotal: data.subtotal,
            round_off: data.round_off,
            discount_amount: data.discount_amount,
            cgst_total: data.cgst_total,
            sgst_total: data.sgst_total,
            igst_total: data.igst_total,
            grand_total: data.grand_total,
            amount_paid: currentPaid,
            amount_due: safeAmountDue,
            total_profit: safeData.total_profit,
            payment_method: data.payment_method,
            notes: data.notes || null,
        })
        .eq('tenant_id', tenantId)
        .eq('id', billId)
        .select()
        .single();

    if (billError) {
        throw new Error(billError.message || "Failed to update bill.");
    }

    // 1. INVENTORY SYNC: Restore old items back to stock before deleting them
    // const { data: oldItems } = await supabase
    //     .from('bill_line_items')
    //     .select('item_id, qty')
    //     .eq('bill_id', billId);

    if (oldItems) {
        for (const old of oldItems) {
            // await syncInventoryStock(tenantId, old.item_id, Math.abs(old.qty), "Update Bill (Revert)");
            await syncBatchStock(old.batch_allocations as BatchAllocation[], 1, "Update Bill (Revert)");
        }
    }

    // 2. Wipe old line items
    const { error: deleteError } = await supabase
        .from('bill_line_items')
        .delete()
        .eq('bill_id', billId);

    if (deleteError) {
        if (deleteError.code === '23503') {
            throw new Error("Cannot edit this bill because a Sales Return has already been processed against it. You must void the return first.");
        }
        throw new Error("Failed to clear old bill items.");
    }

    // 3. Insert fresh line items
    const lineItemsTOInsert = data.bill_line_items.map((item) => {
        const { id, ...itemData } = item;
        return { bill_id: billId, ...itemData };
    });

    const { error: insertError } = await supabase.from('bill_line_items').insert(lineItemsTOInsert);
    if (insertError) throw new Error("Failed to save updated items.");

    // 4. INVENTORY SYNC: Deduct the newly updated item quantities from stock
    for (const newItem of data.bill_line_items) {
        // await syncInventoryStock(tenantId, newItem.item_id, -Math.abs(newItem.qty), "Update Bill (Apply)");
        await syncBatchStock(newItem.batch_allocations, -1, "Update Bill (Apply)");
    }

    const newRecoveryTotal = checkResult.total_recovered_amount || 0;
    const recoveryDelta = newRecoveryTotal - oldRecoveryTotal;

    if (recoveryDelta !== 0) {
        const { data: custData } = await supabase
            .from('customers')
            .select('total_write_offs')
            .eq('id', finalCustomerId)
            .single();

        if (custData) {
            // Subtract the delta (If positive, reduces debt further. If negative, restores debt).
            const newWriteOffBalance = Math.max(0, Number(custData.total_write_offs) - recoveryDelta);
            await supabase
                .from('customers')
                .update({ total_write_offs: newWriteOffBalance })
                .eq('id', finalCustomerId);
        }
    }

    await supabase.rpc('sync_customer_metrics', { p_customer_id: finalCustomerId });

    console.log(`[DEBUG] Bill successfully updated.`);
    console.log(`=== [DEBUG - updateBill END] ===\n`);
    return updatedBill;
}

export async function deleteBill(tenantId: string, billId: string, forceHardDelete: boolean = false) {
    console.log(`\n=== [DEBUG - deleteBill] ===`);
    console.log(`[DEBUG] Attempting to delete Bill ID: ${billId}`);

    const { data: billToDelete } = await supabase
        .from('bills')
        .select('status, grand_total, amount_due, customer_id')
        .eq('id', billId)
        .single();

    if (!billToDelete) return true;

    const isAlreadyCancelled = billToDelete.status === 'cancelled';

    const revertSideEffects = async () => {
        // Step A: INVENTORY SYNC (Restore the sold items back to inventory)
        const { data: lineItems } = await supabase
            .from('bill_line_items')
            .select('item_id, qty, batch_allocations, write_off_recovery')
            .eq('bill_id', billId);

        let totalRecoveryToRevert = 0;

        if (lineItems) {
            for (const item of lineItems) {
                // await syncInventoryStock(tenantId, item.item_id, Math.abs(item.qty), "Delete Bill (Restore)");
                totalRecoveryToRevert += Number(item.write_off_recovery || 0);
                await syncBatchStock(item.batch_allocations as BatchAllocation[], 1, "Delete Bill (Restore)");
            }
        }

        if (totalRecoveryToRevert > 0) {
            const { data: custData } = await supabase
                .from('customers')
                .select('total_write_offs')
                .eq('id', billToDelete.customer_id)
                .single();

            if (custData) {
                const restoredWriteOff = Number(custData.total_write_offs) + totalRecoveryToRevert;
                await supabase
                    .from('customers')
                    .update({ total_write_offs: restoredWriteOff })
                    .eq('id', billToDelete.customer_id);
            }
        }
    };

    // CASE A: Hard Delete (If it's already cancelled OR user forces delete)
    if (isAlreadyCancelled || forceHardDelete) {
        if (!isAlreadyCancelled) {
            await revertSideEffects();
        }

        const { error } = await supabase
            .from('bills')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('id', billId);

        if (error) {
            // Block deletion if a return exists for this bill
            if (error.code === '23503') {
                throw new Error("Cannot delete this bill because a Sales Return is attached to it. Please delete the Sales Return first.");
            }
            console.error("Database Error deleting bill:", error.message);
            throw new Error(error.message || "Failed to delete bill.");
        }

        await supabase.rpc('sync_customer_metrics', { p_customer_id: billToDelete.customer_id });
        return true;
    }

    // CASE B: Normal Cancellation (Soft Delete - First Click)
    await revertSideEffects();

    await supabase
        .from('bills')
        .update({ status: 'cancelled' })
        .eq('id', billId)
        .eq('tenant_id', tenantId);

    await supabase.rpc('sync_customer_metrics', { p_customer_id: billToDelete.customer_id });

    console.log(`=== [DEBUG - deleteBill END] ===\n`);
    return true;
}

// Sales Return 

export async function fetchSalesReturns(tenantId: string): Promise<SalesReturnWithDetails[]> {
    const { data, error } = await supabase
        .from('sales_returns')
        .select(`
            *,
            bills!sales_returns_original_bill_id_fkey (
                bill_number,
                customers (
                    name,
                    type
                )
            ),
            sales_return_items ( * )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Database Error fetching sales returns:", error.message);
        throw new Error("Failed to fetch sales returns");
    }

    console.log("[DEBUG - API] fetchSalesReturns Result:", data);
    return data as unknown as SalesReturnWithDetails[];
}

export async function createSalesReturn(tenantId: string, data: SalesReturnFormData) {
    console.log(`\n=== [DEBUG - createSalesReturn] ===`);

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    // console.log("[DEBUG - API] createSalesReturn Received Payload:", data);

    // 1. Fetch Original PO for Engine Verification
    const originalBill = await fetchBillById(tenantId, data.original_bill_id);
    if (!originalBill) throw new Error("Original Bill not found.");

    // 2. Calculate Fair Refund using Engine
    const { verifiedReturnItems, finalRefundAmount, total_write_off_reverted } = CalculationEngine.calculateRefund(originalBill, data.return_items);

    // Insert Parent Return
    const { data: newReturn, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
            tenant_id: tenantId,
            original_bill_id: data.original_bill_id,
            reason: data.reason || null,
            refund_amount: finalRefundAmount,
            refund_method: data.refund_method,
            created_by: currentUser.id,
        })
        .select()
        .single();

    // console.log("[DEBUG - API] Parent Return Insert Result:", { newReturn, returnError });

    if (returnError) {
        console.error("Database Error creating sales return:", returnError.message);
        throw new Error(returnError.message || "Failed to process return.");
    }

    //Insert valid return items (only those with return_qty > 0)
    const validReturnItems = verifiedReturnItems.filter(item => item.return_qty > 0);

    // console.log("[DEBUG - API] Valid Return Items to Insert:", validReturnItems);

    if (validReturnItems.length > 0) {
        const itemToInsert = validReturnItems.map(item => ({
            sales_return_id: newReturn.id,
            bill_line_item_id: item.bill_line_item_id,
            item_id: item.item_id,
            return_qty: item.return_qty,
            refund_amount: item.refund_total,
            return_batch_allocations: item.return_batch_allocations || [],
            write_off_recovery: item.write_off_recovery || 0
        }));

        const { error: itemsError } = await supabase
            .from('sales_return_items')
            .insert(itemToInsert);

        // console.log("[DEBUG - API] Child Items Insert Error:", itemsError);

        if (itemsError) {
            console.error("Database Error saving returned items:", itemsError.message);
            throw new Error(itemsError.message || "Failed to log specific returned items.");
        }

        //Update inventory stock by increasing the stock
        for (const item of validReturnItems) {
            // await syncInventoryStock(tenantId, item.item_id, Math.abs(item.return_qty), "Create Return (Restore)");
            await syncBatchStock(item.return_batch_allocations, 1, "Create Return (Restore)");
        }
    }

    // ==========================================
    // 2. THE STRICT LEDGER MATH
    // ==========================================
    // Process Ledger
    await applyReturnFinancials(tenantId, newReturn.id, originalBill.id, finalRefundAmount, data.refund_method, currentUser.id);

    // Sync UI States
    await defensiveBillSync(tenantId, data.original_bill_id);

    if (total_write_off_reverted > 0) {
        const { data: custData } = await supabase
            .from('customers')
            .select('total_write_offs')
            .eq('id', originalBill.customer_id)
            .single();

        if (custData) {
            const restoredWriteOff = Number(custData.total_write_offs) + total_write_off_reverted;
            await supabase
                .from('customers')
                .update({ total_write_offs: restoredWriteOff })
                .eq('id', originalBill.customer_id);
        }
    }

    await supabase.rpc('sync_customer_metrics', { p_customer_id: originalBill.customer_id });

    console.log(`=== [DEBUG - createSalesReturn END] ===\n`);
    return newReturn;

}

export async function updateSalesReturn(tenantId: string, returnId: string, data: SalesReturnFormData) {
    // console.log("[DEBUG - API] updateSalesReturn Received Data:", { returnId, data });
    console.log(`\n=== [DEBUG - updateSalesReturn] ===`);
    console.log(`[DEBUG] Updating Return ID: ${returnId}`);

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    const { data: oldReturn } = await supabase
        .from('sales_returns')
        .select('refund_amount, refund_method, original_bill_id')
        .eq('id', returnId)
        .single();
    if (!oldReturn) throw new Error("Return not found.");

    const originalBill = await fetchBillById(tenantId, oldReturn.original_bill_id);
    if (!originalBill) throw new Error("Original PO not found.");

    const { verifiedReturnItems, finalRefundAmount, total_write_off_reverted } = CalculationEngine.calculateRefund(originalBill, data.return_items);

    // 1. INVENTORY SYNC: Revert the OLD return quantities (Subtract them back out of inventory)
    const { data: oldReturnItems } = await supabase
        .from('sales_return_items')
        .select('item_id, return_qty, return_batch_allocations, write_off_recovery')
        .eq('sales_return_id', returnId);

    let oldRevertedTotal = 0;

    if (oldReturnItems) {
        for (const oldItem of oldReturnItems) {
            // await syncInventoryStock(tenantId, oldItem.item_id, -Math.abs(oldItem.return_qty), "Update Return (Revert)");
            oldRevertedTotal += Number(oldItem.write_off_recovery || 0);
            await syncBatchStock(oldItem.return_batch_allocations as BatchAllocation[], -1, "Update Return (Revert)");
        }
    }

    // 2. Update Parent Record
    const { data: updatedReturn, error: returnError } = await supabase
        .from('sales_returns')
        .update({
            reason: data.reason || null,
            refund_amount: finalRefundAmount,
            refund_method: data.refund_method,
        })
        .eq('tenant_id', tenantId)
        .eq('id', returnId)
        .select()
        .single();

    if (returnError) {
        console.error("Database Error updating sales return:", returnError.message);
        throw new Error(returnError.message || "Failed to update return.");
    }

    // 3. Wipe old return items
    const { error: deleteError } = await supabase
        .from('sales_return_items')
        .delete()
        .eq('sales_return_id', returnId);

    if (deleteError) {
        console.error("Database Error clearing old return items:", deleteError.message);
        throw new Error("Failed to clear old returned items.");
    }

    // 4. Insert fresh items where return_qty > 0
    const validReturnItems = verifiedReturnItems.filter(item => item.return_qty > 0);

    if (validReturnItems.length > 0) {
        const itemsToInsert = validReturnItems.map(item => ({
            sales_return_id: returnId,
            bill_line_item_id: item.bill_line_item_id,
            item_id: item.item_id,
            return_qty: item.return_qty,
            refund_amount: item.refund_total,
            return_batch_allocations: item.return_batch_allocations || [],
            write_off_recovery: item.write_off_recovery || 0
        }));

        const { error: insertError } = await supabase
            .from('sales_return_items')
            .insert(itemsToInsert);

        if (insertError) {
            console.error("Database Error inserting updated return items:", insertError.message);
            throw new Error(insertError.message || "Failed to save updated returned items.");
        }

        // 5. INVENTORY SYNC: Add the NEW return quantities back into inventory
        for (const newItem of validReturnItems) {
            // await syncInventoryStock(tenantId, newItem.item_id, Math.abs(newItem.return_qty), "Update Return (Apply)");
            await syncBatchStock(newItem.return_batch_allocations, 1, "Update Return (Apply)");
        }
    }

    // 4. FINANCIAL APPLY: Push the new ledger footprint
    await applyReturnFinancials(tenantId, returnId, originalBill.id, finalRefundAmount, data.refund_method, currentUser.id);

    // Sync UI States
    await defensiveBillSync(tenantId, oldReturn.original_bill_id);

    const recoveryDelta = (total_write_off_reverted || 0) - oldRevertedTotal;

    if (recoveryDelta !== 0) {
        const { data: custData } = await supabase
            .from('customers')
            .select('total_write_offs')
            .eq('id', originalBill.customer_id)
            .single();

        if (custData) {
            // Add delta (Positive = More returned items, so add debt back. Negative = Kept items, so reduce debt).
            const newWriteOffBalance = Math.max(0, Number(custData.total_write_offs) + recoveryDelta);
            await supabase
                .from('customers')
                .update({ total_write_offs: newWriteOffBalance })
                .eq('id', originalBill.customer_id);
        }
    }

    await supabase.rpc('sync_customer_metrics', { p_customer_id: originalBill.customer_id });

    console.log(`=== [DEBUG - updateSalesReturn END] ===\n`);
    return updatedReturn;
}

export async function deleteSalesReturn(tenantId: string, returnId: string) {

    console.log(`\n=== [DEBUG - deleteSalesReturn] ===`);
    console.log(`[DEBUG] Deleting Return ID: ${returnId}`);

    const { data: returnToDelete } = await supabase
        .from('sales_returns')
        .select('refund_amount, refund_method, original_bill_id')
        .eq('id', returnId)
        .single();
    if (!returnToDelete) return true;

    // Step A: INVENTORY SYNC (Remove the returned items back OUT of inventory)
    const { data: returnItems } = await supabase
        .from('sales_return_items')
        .select('item_id, return_qty, return_batch_allocations, write_off_recovery')
        .eq('sales_return_id', returnId);

    let totalRecoveryToUndo = 0;

    if (returnItems) {
        for (const item of returnItems) {
            // await syncInventoryStock(tenantId, item.item_id, -Math.abs(item.return_qty), "Delete Return (Revert)");
            totalRecoveryToUndo += Number(item.write_off_recovery || 0);
            await syncBatchStock(item.return_batch_allocations as BatchAllocation[], -1, "Delete Return (Revert)");
        }
    }

    const bill = await fetchBillById(tenantId, returnToDelete.original_bill_id);
    if (!bill) throw new Error("Original bill not found.");

    // --- STRICT LEDGER MATH (No RPCs) ---
    await revertReturnFinancials(tenantId, returnId, bill.id);

    const { error } = await supabase.from('sales_returns').delete().eq('tenant_id', tenantId).eq('id', returnId);
    if (error) throw new Error(error.message || "Failed to delete return.");

    // Sync UI States
    await defensiveBillSync(tenantId, returnToDelete.original_bill_id);

    if (totalRecoveryToUndo > 0) {
        const { data: custData } = await supabase
            .from('customers')
            .select('total_write_offs')
            .eq('id', bill.customer_id)
            .single();

        if (custData) {
            // Subtract the restored debt back off since the return is voided
            const newWriteOffBalance = Math.max(0, Number(custData.total_write_offs) - totalRecoveryToUndo);
            await supabase
                .from('customers')
                .update({ total_write_offs: newWriteOffBalance })
                .eq('id', bill.customer_id);
        }
    }

    await supabase.rpc('sync_customer_metrics', { p_customer_id: bill.customer_id });

    console.log(`=== [DEBUG - deleteSalesReturn END] ===\n`);
    return true;
}