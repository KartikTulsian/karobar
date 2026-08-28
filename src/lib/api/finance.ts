import { BillProfitability, CashEntry, CreditLedgerEntry, CustomerPaymentWithBill, CustomerProfitability, DailyCashSummary, DailySummary, DocumentState, Expense, ExpenseCategory, ExpenseWithCategory, GSTDashboardData, ItemProfitability, OldPaymentRecord, PaymentBatchSummary, PnLDashboardData, SupplierCostInsight, SupplierItcAuditRow, SupplierPaymentWithPO, UnpaidDocument } from "@/types/finance";
import { supabase } from "../supabase/client";
import { ExpenseFormData } from "../validations/expenseSchema";
import { CashBookFormData } from "../validations/cashBookSchema";
import { PaymentFormData } from "../validations/paymentSchema";

// Helper function to validate UUIDs before querying Supabase
const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

export async function fetchDailySummaries(tenantId: string, startDate: string, endDate: string): Promise<DailySummary[]> {
    const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('summary_date', startDate)
        .lte('summary_date', endDate)
        .order('summary_date', { ascending: true });

    if (error) {
        console.error("Database Error fetching daily summaries:", error.message);
        throw new Error("Failed to fetch daily summaries");
    }

    return data as DailySummary[];
}

export async function fetchExpenses(tenantId: string, startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

    if (error) {
        console.error("Database Error fetching expenses:", error.message);
        throw new Error("Failed to fetch expenses");
    }

    return data as Expense[];
}

export async function fetchExpenseCategories(tenantId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Database Error fetching expense categories:", error.message);
        throw new Error("Failed to fetch expense categories");
    }
    return data as ExpenseCategory[];
}

export async function fetchExpensesWithCategories(tenantId: string): Promise<ExpenseWithCategory[]> {
    const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            expense_categories (
                id,
                name,
                is_default
            )
        `)
        .eq('tenant_id', tenantId)
        .order('expense_date', { ascending: false });

    if (error) {
        console.error("Database Error fetching expenses:", error.message);
        throw new Error("Failed to fetch expenses");
    }

    return data as ExpenseWithCategory[];
}

export async function createExpenseCategory(tenantId: string, name: string): Promise<ExpenseCategory> {
    const { data, error } = await supabase
        .from('expense_categories')
        .insert({ tenant_id: tenantId, name, is_default: false })
        .select()
        .single();

    if (error) {
        console.error("Database Error creating expense category:", error.message);
        throw new Error("Failed to create new category.");
    }
    return data as ExpenseCategory;
}

export async function createExpense(tenantId: string, data: ExpenseFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
        throw new Error("Not authenticated");
    }
    
    let finalCategoryId = data.category_id;

    if (data.category_id === "other" && data.new_category_name) {
        const newCategory = await createExpenseCategory(tenantId, data.new_category_name);
        finalCategoryId = newCategory.id;
    }

    const { data: result, error } = await supabase
        .from('expenses')
        .insert({
            id: data.id,
            tenant_id: tenantId,
            recorded_by: currentUser.id,
            category_id: finalCategoryId,
            amount: data.amount,
            payment_method: data.payment_method,
            expense_date: data.expense_date,
            description: data.description || null,
            receipt_url: data.receipt_url || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Database Error creating expense:", error.message);
        throw new Error(error.message);
    }

    const { error: cashError } = await supabase
        .from('cash_book')
        .insert({
            tenant_id: tenantId,
            recorded_by: currentUser.id,
            entry_date: data.expense_date,
            type: 'out',
            amount: data.amount,
            description: `Expense: ${data.description || 'General'}`,
            reference_type: 'expense',
            reference_id: result.id,
            payment_method: data.payment_method
        });

    if (cashError) {
        console.error("Database Error logging cash book for expense:", cashError.message);
    }

    return result;
}

export async function updateExpense(tenantId: string, expenseId: string, data: ExpenseFormData) {

    const { id, new_category_name, ...updateData } = data;

    let finalCategoryId = updateData.category_id;

    if (updateData.category_id === "other" && new_category_name) {
        const newCategory = await createExpenseCategory(tenantId, new_category_name);
        finalCategoryId = newCategory.id;
    }

    // 1. Fetch current receipt before updating
    const { data: currentExpense } = await supabase
        .from('expenses')
        .select('receipt_url')
        .eq('tenant_id', tenantId)
        .eq('id', expenseId)
        .single<{ receipt_url: string | null }>();

    // 2. Update database row
    const { data: result, error } = await supabase
        .from('expenses')
        .update({
            category_id: finalCategoryId,
            amount: updateData.amount,
            payment_method: updateData.payment_method,
            expense_date: updateData.expense_date,
            description: updateData.description || null,
            receipt_url: updateData.receipt_url || null,
        })
        .eq('tenant_id', tenantId)
        .eq('id', expenseId)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating expense:", error.message);
        throw new Error(error.message);
    }

    await supabase
        .from('cash_book')
        .update({
            amount: updateData.amount,
            payment_method: updateData.payment_method,
            entry_date: updateData.expense_date,
            description: `Expense: ${updateData.description || 'General'}`
        })
        .eq('tenant_id', tenantId)
        .eq('reference_id', expenseId)
        .eq('reference_type', 'expense');

    // 3. Clean up old receipt in R2 if it was replaced or removed
    const oldReceipt = currentExpense?.receipt_url;
    const newReceipt = updateData.receipt_url || null;

    if (oldReceipt && oldReceipt !== newReceipt) {
        fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: [oldReceipt] }),
        }).catch(console.error);
    }

    return result;
}

export async function deleteExpense(expenseId: string, tenantId: string) {
    
    // 1. Fetch receipt URL before deleting the row
    const { data: currentExpense } = await supabase
        .from('expenses')
        .select('receipt_url')
        .eq('id', expenseId)
        .eq('tenant_id', tenantId)
        .single<{ receipt_url: string | null }>();

    await supabase
        .from('cash_book')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('reference_id', expenseId)
        .eq('reference_type', 'expense');
    
    // 2. Delete the record
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('tenant_id', tenantId);

    if (error) {
        console.error("Database Error deleting expense:", error.message);
        throw new Error(error.message);
    }

    // 3. Clean up receipt from Cloudflare R2
    if (currentExpense?.receipt_url) {
        fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: [currentExpense.receipt_url] }),
        }).catch(console.error);
    }
    
    return true;
}

// Cash Book related API functions

export async function fetchDailyCashSummaries(tenantId: string): Promise<DailyCashSummary[]> {
    const { data, error } = await supabase.rpc('get_daily_cash_summaries', {
        p_tenant_id: tenantId
    });

    if (error) {
        console.error("Database Error fetching daily cash summaries:", error.message);
        throw new Error(error.message);
    }

    // Inline typing acts as a strict bridge without cluttering the file
    const rpcData = (data as {
        summary_date: string;
        total_in: number;
        total_out: number;
        closing_balance: number;
    }[]) || [];

    // Safely map the database snake_case to the frontend camelCase
    return rpcData.map((row) => ({
        date: row.summary_date,
        totalIn: Number(row.total_in),
        totalOut: Number(row.total_out),
        closingBalance: Number(row.closing_balance)
    }));
}

export async function fetchCashEntries(tenantId: string): Promise<CashEntry[]> {
    const { data, error } = await supabase
        .from('cash_book_ledger')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('entry_date', { ascending: false });

    if (error) {
        console.error("Failed to fetch cash entries: ", error.message);
        throw new Error(error.message);
    }

    return data as CashEntry[];
}

// Create manual entry
export async function createCashEntry(tenantId: string, data: CashBookFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    const { data: result, error } = await supabase
        .from('cash_book')
        .insert({
            tenant_id: tenantId,
            recorded_by: currentUser.id,
            type: data.type,
            amount: data.amount,
            entry_date: data.entry_date,
            description: data.description,
            reference_type: data.reference_type,
            reference_id: data.reference_id || null,
            payment_method: data.payment_method
        })
        .select()
        .single();

    if (error) {
        console.error("Database Error creating cash entry:", error.message);
        throw new Error(error.message);
    }

    return result;
}

export async function updateCashEntry(tenantId: string, entryId: string, data: CashBookFormData) {
    const { id, ...updateData } = data;

    const { data: result, error } = await supabase
        .from('cash_book')
        .update({
            type: updateData.type,
            amount: updateData.amount,
            entry_date: updateData.entry_date,
            description: updateData.description,
            reference_type: updateData.reference_type,
            reference_id: updateData.reference_id || null,
            payment_method: updateData.payment_method
        })
        .eq('tenant_id', tenantId)
        .eq('id', entryId)
        .select()
        .single();

    if (error) {
        console.error("Database Error updating cash entry:", error.message);
        throw new Error(error.message);
    }
    return result;
}

export async function deleteCashEntry(entryId: string, tenantId: string) {
    const { error } = await supabase
        .from('cash_book')
        .delete()
        .eq('id', entryId)
        .eq('tenant_id', tenantId);

    if (error) {
        console.error("Database Error deleting cash entry:", error.message);
        throw new Error(error.message);
    }

    return true;
}

// ==========================================
// PAYMENT APIS
// ==========================================

// Fetch lists for the "Reference" dropdowns
export async function fetchReferenceData(tenantId: string) {
    const [bills, expenses, purchases] = await Promise.all([
        // Only fetch recent or relevant items
        supabase.from('bills')
            .select('id, bill_number, grand_total')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50),

        supabase.from('expenses')
            .select('id, description, amount')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50),

        supabase.from('purchase_orders')
            .select('id, po_number, total_amount')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50),
    ]);

    return {
        bills: bills.data || [],
        expenses: expenses.data || [],
        purchases: purchases.data || []
    };
}

export async function fetchPaymentBatches(tenantId: string): Promise<PaymentBatchSummary[]> {
    // 1. Fetch Customer Payments (Money In) concurrently with Supplier Payments (Money Out)
    const [
        { data: customerPayments, error: custError },
        { data: supplierPayments, error: suppError }
    ] = await Promise.all([
        supabase
            .from('payments')
            .select(`
                *,
                bills (
                    bill_number,
                    customer_id,
                    customers (name)
                )
            `)
            .eq('tenant_id', tenantId),

        supabase
            .from('supplier_payments')
            .select(`
                *,
                purchase_orders (
                    po_number,
                    supplier_id,
                    suppliers (name)
                )
            `)
            .eq('tenant_id', tenantId)
    ]);

    if (custError) throw new Error("Failed to fetch customer payments: " + custError.message);
    if (suppError) throw new Error("Failed to fetch supplier payments: " + suppError.message);

    const batchMap = new Map<string, PaymentBatchSummary>();

    const typedCustomerPayments = (customerPayments || []) as unknown as CustomerPaymentWithBill[];
    const typedSupplierPayments = (supplierPayments || []) as unknown as SupplierPaymentWithPO[];

    // 2. Process Payments
    const processCustomerPayments = (payments: CustomerPaymentWithBill[]) => {
        payments.forEach((p) => {
            const batchId = p.receipt_batch_id || `legacy-in-${p.id}`;
            if (!batchMap.has(batchId)) {
                batchMap.set(batchId, {
                    receipt_batch_id: batchId,
                    paid_at: p.paid_at || new Date().toISOString(),
                    flow_type: 'in',
                    entity_id: p.bills?.customer_id || 'unknown',
                    entity_name: p.bills?.customers?.name || 'Unknown',
                    total_amount: 0,
                    advance_applied: 0,
                    method: p.method,
                    status: p.status,
                    reference_no: p.reference_no,
                    note: p.note || null,
                    bill_count: 0,
                    allocations: []
                });
            }

            const batch = batchMap.get(batchId)!;
            batch.bill_count += 1;
            batch.allocations.push({
                document_id: p.bill_id,
                document_number: p.bills?.bill_number || 'Unknown Document',
                amount: Number(p.amount),
                discount: Number(p.settlement_discount || 0)
            });
        });
    };

    const processSupplierPayments = (payments: SupplierPaymentWithPO[]) => {
        payments.forEach((p) => {
            const batchId = p.receipt_batch_id || `legacy-out-${p.id}`;
            if (!batchMap.has(batchId)) {
                batchMap.set(batchId, {
                    receipt_batch_id: batchId,
                    paid_at: p.paid_at || new Date().toISOString(),
                    flow_type: 'out',
                    entity_id: p.purchase_orders?.supplier_id || 'unknown',
                    entity_name: p.purchase_orders?.suppliers?.name || 'Unknown',
                    total_amount: 0,
                    advance_applied: 0,
                    method: p.method,
                    status: p.status,
                    reference_no: p.reference_no,
                    note: p.note || null,
                    bill_count: 0,
                    allocations: []
                });
            }

            const batch = batchMap.get(batchId)!;
            batch.bill_count += 1;
            batch.allocations.push({
                document_id: p.po_id,
                document_number: p.purchase_orders?.po_number || 'Unknown Document',
                amount: Number(p.amount),
                discount: Number(p.settlement_discount || 0)
            });
        });
    };

    processCustomerPayments(typedCustomerPayments);
    processSupplierPayments(typedSupplierPayments);

    const batchIds = Array.from(batchMap.keys());

    const validBatchIds = batchIds.filter(isValidUUID); // Filter out custom/legacy string prefixes

    if (validBatchIds.length > 0) {
        const [{ data: cashEntries }, { data: ledgerEntries }] = await Promise.all([
            supabase.from('cash_book').select('reference_id, amount').in('reference_id', validBatchIds).eq('tenant_id', tenantId),
            supabase.from('credit_ledger').select('reference_id, amount, flow_type').in('reference_id', validBatchIds).eq('tenant_id', tenantId)
        ]);

        if (cashEntries) {
            cashEntries.forEach(c => {
                if (batchMap.has(c.reference_id)) batchMap.get(c.reference_id)!.total_amount = Number(c.amount);
            });
        }
        if (ledgerEntries) {
            ledgerEntries.forEach(l => {
                if (batchMap.has(l.reference_id) && l.flow_type === 'out') {
                    batchMap.get(l.reference_id)!.advance_applied += Number(l.amount);
                }
            });
        }
    }

    // if (batchIds.length > 0) {
    //     const [{ data: cashEntries }, { data: ledgerEntries }] = await Promise.all([
    //         supabase.from('cash_book').select('reference_id, amount').in('reference_id', batchIds).eq('tenant_id', tenantId),
    //         supabase.from('credit_ledger').select('reference_id, amount, flow_type').in('reference_id', batchIds).eq('tenant_id', tenantId)
    //     ]);

    //     if (cashEntries) {
    //         cashEntries.forEach(c => {
    //             if (batchMap.has(c.reference_id)) batchMap.get(c.reference_id)!.total_amount = Number(c.amount);
    //         });
    //     }
    //     if (ledgerEntries) {
    //         ledgerEntries.forEach(l => {
    //             if (batchMap.has(l.reference_id) && l.flow_type === 'out') {
    //                 batchMap.get(l.reference_id)!.advance_applied += Number(l.amount);
    //             }
    //         });
    //     }
    // }

    batchMap.forEach(batch => {
        if (batch.total_amount === 0 && batch.allocations.length > 0) {
            const allocatedCash = batch.allocations.reduce((sum, a) => sum + a.amount, 0);
            batch.total_amount = Math.max(0, allocatedCash - batch.advance_applied);
        }
    });

    // 4. Convert Map to Array and sort by Date (Newest First)
    return Array.from(batchMap.values()).sort((a, b) =>
        new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
    );
}

export async function fetchCustomerPaymentBatches(tenantId: string, customerId: string): Promise<PaymentBatchSummary[]> {
    const { data: customerPayments, error: custError } = await supabase
        .from('payments')
        .select(`
            *,
            bills!inner (
                bill_number,
                customer_id,
                customers (name)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('bills.customer_id', customerId);

    if (custError) throw new Error("Failed to fetch customer payments: " + custError.message);

    const batchMap = new Map<string, PaymentBatchSummary>();
    const typedPayments = (customerPayments || []) as unknown as CustomerPaymentWithBill[];

    typedPayments.forEach((p) => {
        const batchId = p.receipt_batch_id || `legacy-in-${p.id}`;

        if (!batchMap.has(batchId)) {
            batchMap.set(batchId, {
                receipt_batch_id: batchId,
                paid_at: p.paid_at || new Date().toISOString(),
                flow_type: 'in',
                entity_id: p.bills?.customer_id || 'unknown',
                entity_name: p.bills?.customers?.name || 'Unknown Customer',
                total_amount: 0,
                advance_applied: 0,
                method: p.method,
                status: p.status,
                reference_no: p.reference_no,
                note: p.note,
                bill_count: 0,
                allocations: []
            });
        }

        const batch = batchMap.get(batchId)!;
        // batch.total_amount += Number(p.amount);
        batch.bill_count += 1;

        batch.allocations.push({
            document_id: p.bill_id,
            document_number: p.bills?.bill_number || 'Unknown Bill',
            amount: Number(p.amount),
            discount: Number(p.settlement_discount || 0)
        });
    });

    const batchIds = Array.from(batchMap.keys());
    const validBatchIds = batchIds.filter(isValidUUID); // Filter out custom/legacy string prefixes

    if (validBatchIds.length > 0) {
        const [{ data: cashEntries }, { data: ledgerEntries }] = await Promise.all([
            supabase.from('cash_book').select('reference_id, amount').in('reference_id', validBatchIds).eq('tenant_id', tenantId),
            supabase.from('credit_ledger').select('reference_id, amount, flow_type').in('reference_id', validBatchIds).eq('tenant_id', tenantId)
        ]);

        if (cashEntries) {
            cashEntries.forEach(c => {
                if (batchMap.has(c.reference_id)) batchMap.get(c.reference_id)!.total_amount = Number(c.amount);
            });
        }
        if (ledgerEntries) {
            ledgerEntries.forEach(l => {
                if (batchMap.has(l.reference_id) && l.flow_type === 'out') {
                    batchMap.get(l.reference_id)!.advance_applied += Number(l.amount);
                }
            });
        }
    }

    // if (batchIds.length > 0) {
    //     const [{ data: cashEntries }, { data: ledgerEntries }] = await Promise.all([
    //         supabase.from('cash_book').select('reference_id, amount').in('reference_id', batchIds).eq('tenant_id', tenantId),
    //         supabase.from('credit_ledger').select('reference_id, amount, flow_type').in('reference_id', batchIds).eq('tenant_id', tenantId)
    //     ]);

    //     if (cashEntries) {
    //         cashEntries.forEach(c => {
    //             if (batchMap.has(c.reference_id)) batchMap.get(c.reference_id)!.total_amount = Number(c.amount);
    //         });
    //     }
    //     if (ledgerEntries) {
    //         ledgerEntries.forEach(l => {
    //             if (batchMap.has(l.reference_id) && l.flow_type === 'out') {
    //                 batchMap.get(l.reference_id)!.advance_applied += Number(l.amount);
    //             }
    //         });
    //     }
    // }

    batchMap.forEach(batch => {
        if (batch.total_amount === 0 && batch.allocations.length > 0) {
            const allocatedCash = batch.allocations.reduce((sum, a) => sum + a.amount, 0);
            batch.total_amount = Math.max(0, allocatedCash - batch.advance_applied);
        }
    });

    return Array.from(batchMap.values()).sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
}

export async function fetchSupplierPaymentBatches(tenantId: string, supplierId: string): Promise<PaymentBatchSummary[]> {
    const { data: supplierPayments, error: suppError } = await supabase
        .from('supplier_payments')
        .select(`
            *,
            purchase_orders!inner (
                po_number,
                supplier_id,
                suppliers (name)
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('purchase_orders.supplier_id', supplierId);

    if (suppError) throw new Error("Failed to fetch supplier payments: " + suppError.message);

    const batchMap = new Map<string, PaymentBatchSummary>();
    const typedPayments = (supplierPayments || []) as unknown as SupplierPaymentWithPO[];

    typedPayments.forEach((p) => {
        const batchId = p.receipt_batch_id || `legacy-out-${p.id}`;

        if (!batchMap.has(batchId)) {
            batchMap.set(batchId, {
                receipt_batch_id: batchId,
                paid_at: p.paid_at || new Date().toISOString(),
                flow_type: 'out',
                entity_id: p.purchase_orders?.supplier_id || 'unknown',
                entity_name: p.purchase_orders?.suppliers?.name || 'Unknown Supplier',
                total_amount: 0,
                advance_applied: 0,
                method: p.method,
                status: p.status,
                reference_no: p.reference_no,
                note: p.note,
                bill_count: 0,
                allocations: []
            });
        }

        const batch = batchMap.get(batchId)!;
        batch.total_amount += Number(p.amount);
        // batch.total_discount += Number(p.settlement_discount || 0);
        batch.bill_count += 1;

        batch.allocations.push({
            document_id: p.po_id,
            document_number: p.purchase_orders?.po_number || 'Unknown PO',
            amount: Number(p.amount),
            discount: Number(p.settlement_discount || 0)
        });
    });

    const batchIds = Array.from(batchMap.keys());

    const validBatchIds = batchIds.filter(isValidUUID); // Filter out custom/legacy string prefixes

    if (validBatchIds.length > 0) {
        const [{ data: cashEntries }, { data: ledgerEntries }] = await Promise.all([
            supabase.from('cash_book').select('reference_id, amount').in('reference_id', validBatchIds).eq('tenant_id', tenantId),
            supabase.from('credit_ledger').select('reference_id, amount, flow_type').in('reference_id', validBatchIds).eq('tenant_id', tenantId)
        ]);

        if (cashEntries) {
            cashEntries.forEach(c => {
                if (batchMap.has(c.reference_id)) batchMap.get(c.reference_id)!.total_amount = Number(c.amount);
            });
        }
        if (ledgerEntries) {
            ledgerEntries.forEach(l => {
                if (batchMap.has(l.reference_id) && l.flow_type === 'out') {
                    batchMap.get(l.reference_id)!.advance_applied += Number(l.amount);
                }
            });
        }
    }

    // if (batchIds.length > 0) {
    //     const [{ data: cashEntries }, { data: ledgerEntries }] = await Promise.all([
    //         supabase.from('cash_book').select('reference_id, amount').in('reference_id', batchIds).eq('tenant_id', tenantId),
    //         supabase.from('credit_ledger').select('reference_id, amount, flow_type').in('reference_id', batchIds).eq('tenant_id', tenantId)
    //     ]);

    //     if (cashEntries) {
    //         cashEntries.forEach(c => {
    //             if (batchMap.has(c.reference_id)) batchMap.get(c.reference_id)!.total_amount = Number(c.amount);
    //         });
    //     }
    //     if (ledgerEntries) {
    //         ledgerEntries.forEach(l => {
    //             if (batchMap.has(l.reference_id) && l.flow_type === 'out') {
    //                 batchMap.get(l.reference_id)!.advance_applied += Number(l.amount);
    //             }
    //         });
    //     }
    // }

    batchMap.forEach(batch => {
        if (batch.total_amount === 0 && batch.allocations.length > 0) {
            const allocatedCash = batch.allocations.reduce((sum, a) => sum + a.amount, 0);
            batch.total_amount = Math.max(0, allocatedCash - batch.advance_applied);
        }
    });

    return Array.from(batchMap.values()).sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
}

export async function fetchUnpaidDocuments(
    tenantId: string,
    entityType: "customer" | "supplier",
    entityId: string
): Promise<UnpaidDocument[]> {
    if (!entityId) return [];

    if (entityType === "customer") {
        const { data, error } = await supabase
            .from('bills')
            .select('id, bill_number, bill_date, amount_due')
            .eq('tenant_id', tenantId)
            .eq('customer_id', entityId)
            .gt('amount_due', 0) // Only fetch unpaid/partial bills
            .in('status', ['issued', 'partial', 'overdue'])
            .order('bill_date', { ascending: true });

        if (error) throw new Error("Failed to Fetch upaid bills: " + error.message);

        return data.map(doc => ({
            id: doc.id,
            document_number: doc.bill_number,
            document_date: doc.bill_date,
            amount_due: Number(doc.amount_due)
        }));
    } else {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('id, po_number, order_date, amount_due')
            .eq('tenant_id', tenantId)
            .eq('supplier_id', entityId)
            .gt('amount_due', 0)
            .in('payment_status', ['unpaid', 'partial'])
            .order('order_date', { ascending: true });

        if (error) throw new Error("Failed to Fetch unpaid POs: " + error.message);

        return data.map(doc => ({
            id: doc.id,
            document_number: doc.po_number,
            document_date: doc.order_date,
            amount_due: Number(doc.amount_due)
        }));
    }
}

export async function fetchCreditLedger(tenantId: string, entityType: 'customer' | 'supplier', entityId: string): Promise<CreditLedgerEntry[]> {
    const { data, error } = await supabase
        .from('credit_ledger')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Database Error fetching credit ledger:", error.message);
        throw new Error("Failed to fetch credit ledger");
    }

    return data as CreditLedgerEntry[];
}

export async function fetchEntityAdvanceBalance(
    tenantId: string,
    entityType: 'customer' | 'supplier',
    entityId: string
): Promise<number> {
    if (!entityId) return 0;

    const table = entityType === 'customer' ? 'customers' : 'suppliers';

    const { data, error } = await supabase
        .from(table)
        .select('advance_balance')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .single();

    if (error) {
        console.error(`Database Error fetching ${entityType} advance balance:`, error.message);
        return 0;
    }

    return Number(data?.advance_balance || 0);
}

// ==========================================
// UNIFIED DEFENSIVE SYNC (Bills & POs)
// ==========================================
async function defensiveDocumentSync(tenantId: string, docId: string, entityType: 'customer' | 'supplier') {
    console.log(`\n=== [DEBUG - defensiveDocumentSync] ===`);
    console.log(`[DEBUG] Syncing Document ID: ${docId} | Entity: ${entityType}`);

    const isCustomer = entityType === 'customer';
    const docTable = isCustomer ? 'bills' : 'purchase_orders';
    const returnsTable = isCustomer ? 'sales_returns' : 'purchase_returns';
    const docRefField = isCustomer ? 'original_bill_id' : 'original_po_id';
    const totalField = isCustomer ? 'grand_total' : 'total_amount';

    const { data } = await supabase.from(docTable).select(`${totalField}, amount_paid, settlement_discount`).eq('id', docId).single();

    const currentDoc = data as DocumentState | null;

    if (currentDoc) {
        console.log(`[DEBUG] Fetched Document State:`, currentDoc);
        const { data: allReturns } = await supabase.from(returnsTable).select('refund_amount, refund_method').eq(docRefField, docId).eq('tenant_id', tenantId);

        const totalRet = allReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;
        // const cashRet = allReturns?.filter(r => r.refund_method !== 'credit_note').reduce((s, r) => s + Number(r.refund_amount), 0) || 0;

        // const effPaid = Number(currentDoc.amount_paid) - cashRet;
        const docTotal = Number(currentDoc.grand_total ?? currentDoc.total_amount ?? 0);
        const netDoc = docTotal - totalRet;

        const newDue = Math.max(0, netDoc - Number(currentDoc.amount_paid || 0) - Number(currentDoc.settlement_discount));

        const statusField = isCustomer ? 'status' : 'payment_status';
        const safeStatus = newDue <= 0 ? 'paid' : (Number(currentDoc.amount_paid) > 0 || Number(currentDoc.settlement_discount) > 0 ? 'partial' : (isCustomer ? 'issued' : 'unpaid'));

        console.log(`[DEBUG] Calculated Net Document: ₹${netDoc} | New Due: ₹${newDue} | New Status: ${safeStatus}`);
        await supabase.from(docTable).update({ amount_due: newDue, [statusField]: safeStatus }).eq('id', docId);
    }
    console.log(`=== [DEBUG - defensiveDocumentSync END] ===\n`);
}


export async function recordPaymentBatch(tenantId: string, data: PaymentFormData, customBatchId?: string) {
    console.log(`\n=== [DEBUG - recordPaymentBatch] ===`);
    console.log(`[DEBUG] Incoming Payment Payload:`, JSON.stringify(data, null, 2));

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    if (data.total_amount < 0) {
        throw new Error("Payment amount cannot be negative. Use the Sales Return or Credit Note flow instead.");
    }

    // Generate unique Batch ID for this transaction
    const batchId = customBatchId || crypto.randomUUID();
    const isCustomer = data.entity_type === "customer";
    const entityTable = isCustomer ? 'customers' : 'suppliers';
    const documentTable = isCustomer ? 'bills' : 'purchase_orders';

    // Filter out any 0 amount allocations
    const validAllocations = data.allocations.filter(a => a.amount > 0 || (a.discount && a.discount !== 0));

    // 1. Calculate precise metrics for Advances
    const totalAllocatedAmount = validAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalBatchDiscount = validAllocations.reduce((sum, a) => sum + (a.discount || 0), 0);

    const liquidCash = Number(data.total_amount || 0);
    const advanceApplied = Number(data.advance_applied || 0);
    const totalFundsAvailable = liquidCash + advanceApplied;

    const advanceToSave = Math.max(0, totalFundsAvailable - totalAllocatedAmount);
    const isPureAdvance = validAllocations.length === 0;

    // Determine the precise Cash Book Type
    const cashRefType = isCustomer
        ? (isPureAdvance ? 'advance_receipt' : (validAllocations.length > 1 ? 'multi_sale' : 'single_sale'))
        : (isPureAdvance ? 'advance_payment' : (validAllocations.length > 1 ? 'multi_purchase' : 'single_purchase'));

    try {
        console.log(`[DEBUG] Fetching Entity Balances from table: '${entityTable}' for ID: ${data.entity_id}`);

        // 1. Fetch current balances
        const { data: entityData, error: entityError } = await supabase.from(entityTable).select('outstanding_due, advance_balance, total_write_offs').eq('id', data.entity_id).single();
        if (entityError || !entityData) {
            console.error(`[DEBUG] Entity Fetch Error:`, entityError);
            throw new Error(`Entity not found in ${entityTable}.`);
        }

        const currentAdvance = Number(entityData.advance_balance || 0);
        const currentWriteOffs = Number(entityData.total_write_offs || 0);

        console.log(`[DEBUG] Current Entity Wallet: ₹${currentAdvance} | Write-offs: ₹${currentWriteOffs}`);

        if (advanceApplied > currentAdvance) {
            throw new Error(`Cannot apply ₹${advanceApplied}. Wallet only has ₹${currentAdvance}.`);
        }
        // 2. Insert allocations into payments table (Skip if Pure Advance)
        if (!isPureAdvance) {
            const paymentsToInsert = validAllocations.map(alloc => ({
                tenant_id: tenantId,
                [isCustomer ? 'bill_id' : 'po_id']: alloc.document_id,
                amount: alloc.amount,
                settlement_discount: alloc.discount || 0,
                method: data.method,
                reference_no: data.reference_no,
                note: data.note,
                status: data.status || 'sanctioned',
                receipt_batch_id: batchId,
                recorded_by: currentUser.id,
                paid_at: data.paid_at
            }));

            console.log(`[DEBUG] Inserting ${paymentsToInsert.length} payment records into '${isCustomer ? 'payments' : 'supplier_payments'}'`);
            const { error: paymentError } = await supabase.from(isCustomer ? 'payments' : 'supplier_payments').insert(paymentsToInsert);
            if (paymentError) throw new Error("Failed to log payment allocations.");
        }

        // 3. Update individual bills SEQUENTIALLY to prevent Database Race Conditions
        for (const alloc of validAllocations) {
            console.log(`[DEBUG] Updating Document: ${alloc.document_number} (ID: ${alloc.document_id})`);
            const { data: currentDoc, error: fetchErr } = await supabase.from(documentTable).select('amount_paid, amount_due, settlement_discount').eq('id', alloc.document_id).single();

            if (fetchErr) throw new Error(`Failed to fetch bill ${alloc.document_number}`);

            if (currentDoc) {
                const newAmountPaid = Number(currentDoc.amount_paid) + alloc.amount;
                const newDiscount = Number(currentDoc.settlement_discount || 0) + (alloc.discount || 0);

                await supabase.from(documentTable).update({
                    amount_paid: newAmountPaid,
                    settlement_discount: newDiscount,
                    payment_method: data.method
                }).eq('id', alloc.document_id);

                // Force a perfectly calculated due state
                await defensiveDocumentSync(tenantId, alloc.document_id, data.entity_type);
            }
        }

        // 4. Update Entity Metrics Explicitly
        const netAdvanceChange = advanceToSave - advanceApplied;
        const newAdvanceBalance = currentAdvance + netAdvanceChange;

        console.log(`[DEBUG] Updating ${entityTable} advance balance to ₹${newAdvanceBalance}`);

        await supabase.from(entityTable).update({
            advance_balance: newAdvanceBalance,
            total_write_offs: currentWriteOffs + totalBatchDiscount
        }).eq('id', data.entity_id);

        // 5. Build Credit Ledger (Audit Trail)
        if (advanceApplied > 0) {
            console.log(`[DEBUG] Logging advance application of ₹${advanceApplied} to credit_ledger`);
            await supabase.from('credit_ledger').insert({
                tenant_id: tenantId, entity_type: data.entity_type, entity_id: data.entity_id,
                flow_type: 'out', amount: advanceApplied, balance_after: currentAdvance - advanceApplied,
                reference_type: 'bill_payment', reference_id: batchId, description: `Wallet advance used for payment allocation.`, 
                created_by: currentUser.id
            });
        }
        if (advanceToSave > 0) {
            console.log(`[DEBUG] Logging excess funds saved (₹${advanceToSave}) to credit_ledger`);
            await supabase.from('credit_ledger').insert({
                tenant_id: tenantId, entity_type: data.entity_type, entity_id: data.entity_id,
                flow_type: 'in', amount: advanceToSave, balance_after: newAdvanceBalance,
                reference_type: 'advance_payment', reference_id: batchId, description: `Excess funds saved to Wallet.`, 
                created_by: currentUser.id
            });
        }

        // 6. Build Cash Book Entry (Only for Liquid Cash)
        if (liquidCash > 0) {
            let description = `${isCustomer ? 'Customer' : 'Supplier'} Payment (Receipt: ${batchId})`;
            if (isPureAdvance) description = `Pure Advance ${isCustomer ? 'Received' : 'Paid'} (Receipt: ${batchId})`;

            console.log(`[DEBUG] Writing ₹${liquidCash} to cash_book (${isCustomer ? 'in' : 'out'})`);
            await supabase.from('cash_book').insert({
                tenant_id: tenantId, recorded_by: currentUser.id, entry_date: data.paid_at,
                type: isCustomer ? 'in' : 'out', amount: liquidCash, description: description,
                reference_type: cashRefType, reference_id: batchId, payment_method: data.method
            });
        }

        // DELEGATE: Final perfect state sync
        console.log(`[DEBUG] Triggering global RPC sync for entity`);
        const rpcName = isCustomer ? 'sync_customer_metrics' : 'sync_supplier_metrics';
        const rpcParam = isCustomer ? { p_customer_id: data.entity_id } : { p_supplier_id: data.entity_id };
        await supabase.rpc(rpcName, rpcParam);

        console.log(`[DEBUG] Payment Batch successfully committed. Batch ID: ${batchId}`);
        console.log(`=== [DEBUG - recordPaymentBatch END] ===\n`);
        return batchId;
    } catch (error) {
        if (error instanceof Error) {
            console.error("Transaction Error:", error.message);
            throw new Error(`Payment transaction failed: ${error.message}`);
        }
        throw new Error("Payment transaction failed with an unknown error.");
    }
}

// ------------------------------------------------------------------
// HELPER: Flawlessly Reverts the Financial impact of a payment
// ------------------------------------------------------------------
async function revertPaymentFinancials(tenantId: string, batchId: string, entityType: "customer" | "supplier", entityId: string, oldPayments: OldPaymentRecord[]) {
    console.log(`\n=== [DEBUG - revertPaymentFinancials] ===`);
    console.log(`[DEBUG] Reverting Batch: ${batchId} for Entity: ${entityId}`);
    console.log(`[DEBUG] Old Payments Array:`, oldPayments);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");

    const isCustomer = entityType === "customer";
    const docTable = isCustomer ? 'bills' : 'purchase_orders';
    const entityTable = isCustomer ? 'customers' : 'suppliers';
    const returnsTable = isCustomer ? 'sales_returns' : 'purchase_returns';
    const returnDocField = isCustomer ? 'original_bill_id' : 'original_po_id';
    const totalField = isCustomer ? 'grand_total' : 'total_amount';

    let totalDiscountReverted = 0;

    // 1. Revert Bill Totals and Clawback Unearned Advances
    for (const payment of oldPayments) {
        if (payment.status === 'cancelled') {
            console.log(`[DEBUG] Payment ${payment.id} already cancelled. Skipping.`);
            continue;
        }

        totalDiscountReverted += Number(payment.settlement_discount || 0);
        console.log(`[DEBUG] Processing Revert for Document: ${payment.document_id} | Amount: ₹${payment.amount}`);

        const { data } = await supabase.from(docTable).select(`${isCustomer ? 'grand_total' : 'total_amount'}, amount_paid, settlement_discount`).eq('id', payment.document_id).single();

        const currentDoc = data as DocumentState | null;

        if (currentDoc) {
            const docTotal = Number(currentDoc.grand_total ?? currentDoc.total_amount ?? 0);
            const oldAmountPaid = Number(currentDoc.amount_paid || 0);
            const oldDiscount = Number(currentDoc.settlement_discount || 0);

            // Calculate Effective Paid (Cash + Kasar) to prevent Discount Profiteering
            const oldEffectivePaid = oldAmountPaid + oldDiscount;

            // FIX: Removed Math.max(0, ...) to allow negative amounts. 
            // This perfectly tracks over-refunded cash when a payment is deleted!
            let newAmountPaid = oldAmountPaid - Number(payment.amount);
            const newDiscount = oldDiscount - Number(payment.settlement_discount || 0);

            const newEffectivePaid = newAmountPaid + newDiscount;

            // --- OVERPAYMENT CLAWBACK MATH ---
            // If dropping this payment eliminates the "overpayment" state of a returned bill, 
            // we must claw back the advance that the return originally gave them.
            const { data: allReturns } = await supabase.from(returnsTable).select('refund_amount').eq(returnDocField, payment.document_id).eq('tenant_id', tenantId);
            const totalRet = allReturns?.reduce((s, r) => s + Number(r.refund_amount), 0) || 0;
            const netDoc = docTotal - totalRet;

            const oldContribution = Math.max(0, oldEffectivePaid - netDoc);
            const newContribution = Math.max(0, newEffectivePaid - netDoc);
            const clawbackAmount = oldContribution - newContribution;

            console.log(`[DEBUG] Clawback Analysis -> NetDoc: ₹${netDoc}, OldContrib: ₹${oldContribution}, NewContrib: ₹${newContribution}`);

            if (clawbackAmount > 0) {
                console.log(`[DEBUG] 🚨 Clawback Triggered! Removing ₹${clawbackAmount} from wallet.`);
                // Pull the money out of the wallet!
                const { data: entityData } = await supabase.from(entityTable).select('advance_balance').eq('id', entityId).single();
                let currentAdvance = Number(entityData?.advance_balance || 0);
                let shortfall = 0;

                if (clawbackAmount > currentAdvance) {
                    shortfall = clawbackAmount - currentAdvance;
                    currentAdvance = 0;
                } else {
                    currentAdvance -= clawbackAmount;
                }

                // Update Wallet
                console.log(`[DEBUG] New Wallet Balance: ₹${currentAdvance}. Shortfall: ₹${shortfall}`);
                await supabase.from(entityTable).update({ advance_balance: currentAdvance }).eq('id', entityId);

                // Add the reversal to the ledger
                if (clawbackAmount - shortfall > 0) {
                    await supabase.from('credit_ledger').insert({
                        tenant_id: tenantId, entity_type: entityType, entity_id: entityId,
                        flow_type: 'out', amount: clawbackAmount - shortfall, balance_after: currentAdvance,
                        reference_type: 'manual_adjustment', reference_id: crypto.randomUUID(),
                        description: 'Advance reversed. Payment cancellation invalidated previous return credit.',
                        created_by: currentUser.id
                    });
                }

                // If they already spent the advance somewhere else, this specific bill absorbs the loss
                if (shortfall > 0) {
                    // newAmountPaid = Math.max(0, newAmountPaid - shortfall);
                    newAmountPaid = newAmountPaid - shortfall;
                    console.log(`[DEBUG] Shortfall of ₹${shortfall} deducted from amount_paid. New amount_paid: ₹${newAmountPaid}`);
                }
            }

            await supabase.from(docTable).update({
                amount_paid: newAmountPaid,
                settlement_discount: newDiscount
            }).eq('id', payment.document_id);

            // Let the bulletproof sync handle the exact math!
            await defensiveDocumentSync(tenantId, payment.document_id, entityType);
        }
    }

    // 2. Revert direct Wallet Totals (Money explicitly saved/applied during the payment)
    const { data: ledgers } = await supabase.from('credit_ledger').select('amount, flow_type').eq('reference_id', batchId).eq('tenant_id', tenantId);
    let advanceAppliedReverted = 0;
    let advanceSavedReverted = 0;

    if (ledgers) {
        ledgers.forEach(l => {
            if (l.flow_type === 'out') advanceAppliedReverted += Number(l.amount);
            if (l.flow_type === 'in') advanceSavedReverted += Number(l.amount);
        });
    }

    console.log(`[DEBUG] Reverting explicitly mapped Wallet movements -> Applied: ₹${advanceAppliedReverted}, Saved: ₹${advanceSavedReverted}`);

    if (advanceAppliedReverted > 0 || advanceSavedReverted > 0 || totalDiscountReverted > 0) {
        const { data: entityData } = await supabase.from(entityTable).select('advance_balance, total_write_offs').eq('id', entityId).single();
        if (entityData) {
            let newAdvance = Number(entityData.advance_balance) + advanceAppliedReverted - advanceSavedReverted;
            if (newAdvance < 0) newAdvance = 0;

            const newWriteOffs = Math.max(0, Number(entityData.total_write_offs || 0) - totalDiscountReverted);

            await supabase.from(entityTable).update({
                advance_balance: newAdvance,
                total_write_offs: newWriteOffs
            }).eq('id', entityId);
        }
    }

    // 3. Final Metric Sync
    const rpcName = isCustomer ? 'sync_customer_metrics' : 'sync_supplier_metrics';
    await supabase.rpc(rpcName, isCustomer ? { p_customer_id: entityId } : { p_supplier_id: entityId });
    console.log(`=== [DEBUG - revertPaymentFinancials END] ===\n`);
}

// ------------------------------------------------------------------
// TWO-STEP DELETE/CANCEL FUNCTION
// ------------------------------------------------------------------
export async function deletePaymentBatch(tenantId: string, batchId: string, entityType: "customer" | "supplier", entityId: string, forceHardDelete: boolean = false) {
    try {

        const isCustomer = entityType === "customer";
        const paymentsTable = isCustomer ? 'payments' : 'supplier_payments';
        const selectQuery = isCustomer ? 'id, amount, settlement_discount, status, document_id:bill_id' : 'id, amount, settlement_discount, status, document_id:po_id';

        // 1. Fetch old payments & ledger

        const { data: rawPayments } = await supabase
            .from(paymentsTable)
            .select(selectQuery)
            .eq('receipt_batch_id', batchId)
            .eq('tenant_id', tenantId);

        // const oldPayments = (rawPayments || []) as { amount: number; settlement_discount: number; document_id: string }[];
        const oldPayments = (rawPayments || []) as unknown as OldPaymentRecord[];

        // Check if the payment has already been cancelled previously
        const isAlreadyCancelled = oldPayments.length > 0 && oldPayments.every(p => p.status === 'cancelled');

        // CASE A: Hard Delete (Either user clicked delete TWICE, or it's an Update)
        if (isAlreadyCancelled || forceHardDelete) {
            // If it wasn't cancelled yet, we must do the financial revert first!
            if (!isAlreadyCancelled) {
                await revertPaymentFinancials(tenantId, batchId, entityType, entityId, oldPayments);
            }

            // Hard delete the records permanently
            await supabase.from(paymentsTable).delete().eq('receipt_batch_id', batchId).eq('tenant_id', tenantId);
            await supabase.from('cash_book').delete().eq('reference_id', batchId).eq('tenant_id', tenantId);
            await supabase.from('credit_ledger')
                .delete()
                .eq('reference_id', batchId)
                .eq('tenant_id', tenantId)
                .in('reference_type', ['bill_payment', 'advance_payment']);
            return true;
        }

        // CASE B: Normal Cancellation (First click of delete button)
        await revertPaymentFinancials(tenantId, batchId, entityType, entityId, oldPayments);

        // Mark as cancelled instead of deleting
        await supabase.from(paymentsTable).update({ status: 'cancelled' }).eq('receipt_batch_id', batchId).eq('tenant_id', tenantId);

        // Remove cash and ledger impact so P&L reports are perfectly clean
        await supabase.from('cash_book').delete().eq('reference_id', batchId).eq('tenant_id', tenantId);
        await supabase.from('credit_ledger')
            .delete()
            .eq('reference_id', batchId)
            .eq('tenant_id', tenantId)
            .in('reference_type', ['bill_payment', 'advance_payment']);

        return true;
    } catch (error) {
        if (error instanceof Error) {
            console.error("Deletion Error:", error.message);
            throw new Error(`Failed to revert payment: ${error.message}`);
        }
        throw new Error("Failed to revert payment due to an unknown error.");
    }
}

export async function updatePaymentBatch(tenantId: string, batchId: string, data: PaymentFormData) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
        throw new Error("Not authenticated");
    }
    
    try {
        // A. Revert the entire old transaction completely
        await deletePaymentBatch(tenantId, batchId, data.entity_type, data.entity_id, true);

        // B. Record the new transaction using the exact same batchId
        await recordPaymentBatch(tenantId, data, batchId);

        return batchId;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to update payment: ${error.message}`);
        }
        throw new Error("Failed to update payment due to an unknown error.");
    }
}


interface RawBill {
    id: string;
    bill_number: string;
    bill_date: string;
    grand_total: number;
    total_profit: number;
    customers: { id: string; name: string; type: string } | null;
    bill_line_items: { item_id: string | null; item_name: string; qty: number; line_total: number; total_buy_price: number; line_profit: number }[];
}

interface RawSalesReturn {
    refund_amount: number;
}

interface RawExpense {
    amount: number;
    expense_date: string;
    expense_categories: { id: string; name: string } | null;
}

interface RawPO {
    id: string;
    total_amount: number;
    suppliers: { id: string; name: string } | null;
}

interface RawPurchaseReturn {
    refund_amount: number;
    purchase_orders: { supplier_id: string } | null;
}

export async function fetchPnLDashboardData(tenantId: string, startDate: string, endDate: string): Promise<PnLDashboardData> {

    // 1. FETCH ALL RELEVANT DATA IN PARALLEL FOR SPEED
    const [
        { data: bills },
        { data: salesReturns },
        { data: expenses },
        { data: pos },
        { data: purchaseReturns }
    ] = await Promise.all([
        supabase.from('bills').select(`
            id, bill_number, bill_date, grand_total, total_profit,
            customers ( id, name, type ),
            bill_line_items ( item_id, item_name, qty, line_total, total_buy_price, line_profit )
        `).eq('tenant_id', tenantId).gte('bill_date', startDate).lte('bill_date', endDate).neq('status', 'cancelled'),

        supabase.from('sales_returns').select('refund_amount').eq('tenant_id', tenantId).gte('created_at', startDate).lte('created_at', endDate),

        supabase.from('expenses').select(`
            amount, expense_date, expense_categories ( id, name )
        `).eq('tenant_id', tenantId).gte('expense_date', startDate).lte('expense_date', endDate),

        supabase.from('purchase_orders').select(`
            id, total_amount, suppliers ( id, name )
        `).eq('tenant_id', tenantId).gte('order_date', startDate).lte('order_date', endDate).neq('status', 'cancelled'),

        supabase.from('purchase_returns').select('refund_amount, purchase_orders(supplier_id)').eq('tenant_id', tenantId).gte('created_at', startDate).lte('created_at', endDate)
    ]);

    // Safely cast the raw responses to our strict local types to avoid 'any'
    const typedBills = (bills || []) as unknown as RawBill[];
    const typedSalesReturns = (salesReturns || []) as unknown as RawSalesReturn[];
    const typedExpenses = (expenses || []) as unknown as RawExpense[];
    const typedPos = (pos || []) as unknown as RawPO[];
    const typedPurchaseReturns = (purchaseReturns || []) as unknown as RawPurchaseReturn[];

    // 2. INITIALIZE AGGREGATION MAPS & VARIABLES
    let totalRevenue = 0;
    let totalGrossProfit = 0;
    let totalExpenses = 0;

    const dailyMap: Record<string, { revenue: number, cogs: number, expenses: number }> = {};
    const itemMap: Record<string, ItemProfitability> = {};
    const customerMap: Record<string, CustomerProfitability> = {};
    const supplierMap: Record<string, SupplierCostInsight> = {};
    const expenseCatMap: Record<string, number> = {};
    const billLevel: BillProfitability[] = [];

    const initDate = (date: string) => {
        if (!dailyMap[date]) dailyMap[date] = { revenue: 0, cogs: 0, expenses: 0 };
    };

    // 3. PROCESS BILLS
    typedBills.forEach((bill) => {
        const bRev = Number(bill.grand_total);
        const bProfit = Number(bill.total_profit);
        const bCogs = bRev - bProfit;

        totalRevenue += bRev;
        totalGrossProfit += bProfit;

        initDate(bill.bill_date);
        dailyMap[bill.bill_date].revenue += bRev;
        dailyMap[bill.bill_date].cogs += bCogs;

        billLevel.push({
            bill_id: bill.id,
            bill_date: bill.bill_date,
            bill_number: bill.bill_number,
            customer_name: bill.customers?.name || 'Unknown',
            revenue: bRev,
            cogs: bCogs,
            profit: bProfit,
            margin_pct: bRev > 0 ? (bProfit / bRev) * 100 : 0
        });

        const custId = bill.customers?.id || 'walk-in';
        if (!customerMap[custId]) {
            customerMap[custId] = {
                customer_id: custId, customer_name: bill.customers?.name || 'Unknown', customer_type: bill.customers?.type || 'flying',
                bill_count: 0, total_revenue: 0, total_profit: 0, margin_pct: 0
            };
        }
        customerMap[custId].bill_count += 1;
        customerMap[custId].total_revenue += bRev;
        customerMap[custId].total_profit += bProfit;

        bill.bill_line_items.forEach((item) => {
            if (!item.item_id) return;
            if (!itemMap[item.item_id]) {
                itemMap[item.item_id] = {
                    item_id: item.item_id, item_name: item.item_name,
                    units_sold: 0, total_revenue: 0, total_cost: 0, total_profit: 0, margin_pct: 0
                };
            }
            itemMap[item.item_id].units_sold += Number(item.qty);
            itemMap[item.item_id].total_revenue += Number(item.line_total);
            itemMap[item.item_id].total_cost += Number(item.total_buy_price);
            itemMap[item.item_id].total_profit += Number(item.line_profit);
        });
    });

    // 4. PROCESS SALES RETURNS
    const totalRefunds = typedSalesReturns.reduce((sum, r) => sum + Number(r.refund_amount), 0);
    totalRevenue -= totalRefunds;

    // 5. PROCESS EXPENSES
    typedExpenses.forEach((exp) => {
        const amt = Number(exp.amount);
        totalExpenses += amt;

        initDate(exp.expense_date);
        dailyMap[exp.expense_date].expenses += amt;

        const catName = exp.expense_categories?.name || 'Uncategorized';
        expenseCatMap[catName] = (expenseCatMap[catName] || 0) + amt;
    });

    // 6. PROCESS SUPPLIERS
    typedPos.forEach((po) => {
        const suppId = po.suppliers?.id || 'unknown';
        if (!supplierMap[suppId]) {
            supplierMap[suppId] = { supplier_id: suppId, supplier_name: po.suppliers?.name || 'Unknown', po_count: 0, total_spend: 0 };
        }
        supplierMap[suppId].po_count += 1;
        supplierMap[suppId].total_spend += Number(po.total_amount);
    });

    typedPurchaseReturns.forEach((pr) => {
        const suppId = pr.purchase_orders?.supplier_id;
        if (suppId && supplierMap[suppId]) {
            supplierMap[suppId].total_spend -= Number(pr.refund_amount);
        }
    });

    // 7. FINALIZE ARRAYS
    const cogs = totalRevenue - totalGrossProfit;
    const netProfit = totalGrossProfit - totalExpenses;

    const dailyTrends = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const expenseBreakdown = Object.entries(expenseCatMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const allItems = Object.values(itemMap).map(item => ({
        ...item,
        margin_pct: item.total_revenue > 0 ? (item.total_profit / item.total_revenue) * 100 : 0
    }));

    const topItems = [...allItems].sort((a, b) => b.total_profit - a.total_profit).slice(0, 5);
    const bottomItems = [...allItems].sort((a, b) => a.total_profit - b.total_profit).slice(0, 5);

    const allCustomers = Object.values(customerMap).map(c => ({
        ...c,
        margin_pct: c.total_revenue > 0 ? (c.total_profit / c.total_revenue) * 100 : 0
    })).sort((a, b) => b.total_profit - a.total_profit);

    const allSuppliers = Object.values(supplierMap).sort((a, b) => b.total_spend - a.total_spend);

    // 8. RETURN PAYLOAD
    return {
        kpis: { totalRevenue, cogs, grossProfit: totalGrossProfit, totalExpenses, netProfit },
        charts: { dailyTrends, expenseBreakdown, topItems, bottomItems },
        tables: {
            billLevel: billLevel.sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime()),
            itemLevel: allItems.sort((a, b) => b.total_profit - a.total_profit),
            customerLevel: allCustomers,
            supplierLevel: allSuppliers
        }
    };
}

// ==========================================
// GST / TAX API
// ==========================================

interface RawSupplierPO {
    id: string;
    subtotal: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    supplier_id: string;
    suppliers: { id: string; name: string; gstin: string | null } | null;
}

export async function fetchGstDashboard(tenantId: string, startDate: string, endDate: string): Promise<GSTDashboardData> {
    // 'period' comes in as "YYYY-MM" from the HTML input
    // We calculate the start and end dates of that month for the SQL query
    // const [year, month] = period.split('-');
    // const startDate = `${year}-${month}-01`;
    // const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    // Concurrently fetch the RPC dashboard summary and Supplier-wise ITC data
    const [rpcResult, supplierPosResult] = await Promise.all([
        supabase.rpc('get_gst_dashboard', {
            p_tenant_id: tenantId,
            p_start_date: startDate,
            p_end_date: endDate
        }),
        supabase.from('purchase_orders').select(`
            id, subtotal, cgst_total, sgst_total, igst_total, supplier_id,
            suppliers ( id, name, gstin )
        `)
        .eq('tenant_id', tenantId)
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .eq('is_gst_supply', true)
        .neq('status', 'cancelled')
        .neq('status', 'draft')
    ]);

    if (rpcResult.error) {
        console.error("Database Error fetching GST Dashboard:", rpcResult.error.message);
        throw new Error(rpcResult.error.message || "Failed to fetch GST Dashboard data");
    }

    const rpcData = rpcResult.data as GSTDashboardData;

    // Aggregate supplier-level ITC audit
    const supplierPos = (supplierPosResult.data || []) as unknown as RawSupplierPO[];
    const supplierMap: Record<string, SupplierItcAuditRow> = {};

    supplierPos.forEach((po) => {
        const suppId = po.supplier_id || 'unknown';
        const suppName = po.suppliers?.name || 'Unknown Supplier';
        const suppGstin = po.suppliers?.gstin || null;

        if (!supplierMap[suppId]) {
            supplierMap[suppId] = {
                supplier_id: suppId,
                supplier_name: suppName,
                gstin: suppGstin,
                po_count: 0,
                taxable_value: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
                total_itc: 0
            };
        }

        const cgst = Number(po.cgst_total || 0);
        const sgst = Number(po.sgst_total || 0);
        const igst = Number(po.igst_total || 0);

        supplierMap[suppId].po_count += 1;
        supplierMap[suppId].taxable_value += Number(po.subtotal || 0);
        supplierMap[suppId].cgst += cgst;
        supplierMap[suppId].sgst += sgst;
        supplierMap[suppId].igst += igst;
        supplierMap[suppId].total_itc += (cgst + sgst + igst);
    });

    const supplierAuditList = Object.values(supplierMap).sort((a,b) => b.total_itc - a.total_itc);

    return {
        ...rpcData,
        supplier_audit: supplierAuditList
    }
}