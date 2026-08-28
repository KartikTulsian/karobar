import { createCashEntry, createExpense, createExpenseCategory, deleteCashEntry, deleteExpense, deletePaymentBatch, fetchCashEntries, fetchCreditLedger, fetchCustomerPaymentBatches, fetchDailyCashSummaries, fetchDailySummaries, fetchExpenseCategories, fetchExpenses, fetchExpensesWithCategories, fetchGstDashboard, fetchPaymentBatches, fetchPnLDashboardData, fetchReferenceData, fetchSupplierPaymentBatches, fetchUnpaidDocuments, recordPaymentBatch, updateCashEntry, updateExpense, updatePaymentBatch } from "@/lib/api/finance";
import { CashBookFormData } from "@/lib/validations/cashBookSchema";
import { ExpenseFormData } from "@/lib/validations/expenseSchema";
import { PaymentFormData } from "@/lib/validations/paymentSchema";
import { CashEntry, DailyCashSummary, GSTDashboardData, PnLDashboardData } from "@/types/finance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// DASHBOARD HOOKS (With 5-minute smart caching & auto window focus refetch)
// ============================================================================

export function usePnLDashboard(tenantId: string, startDate: string, endDate: string) {
    return useQuery<PnLDashboardData, Error>({
        queryKey: ['pnl-dashboard', tenantId, startDate, endDate],
        queryFn: () => fetchPnLDashboardData(tenantId, startDate, endDate),
        enabled: !!tenantId && !!startDate && !!endDate,
        staleTime: 1000 * 60 * 5, // Cache fresh for 5 minutes
        gcTime: 1000 * 60 * 15,   // Retain in memory for 15 minutes
        refetchOnWindowFocus: true,
    });
}

export function useGstDashboard(tenantId: string, startDate: string, endDate: string) {
    return useQuery<GSTDashboardData, Error>({
        queryKey: ['gst_dashboard', tenantId, startDate, endDate],
        queryFn: () => fetchGstDashboard(tenantId, startDate, endDate),
        enabled: !!tenantId && !!startDate && !!endDate,
        staleTime: 1000 * 60 * 5, // Cache fresh for 5 minutes
        gcTime: 1000 * 60 * 15,   // Retain in memory for 15 minutes
        refetchOnWindowFocus: true,
    });
}

// ============================================================================
// EXPENSES & DAILY SUMMARIES
// ============================================================================

export function useDailySummaries(tenantId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['daily_summaries', tenantId, startDate, endDate],
        queryFn: () => fetchDailySummaries(tenantId, startDate, endDate),
        enabled: !!tenantId && !!startDate && !!endDate,
    });
}

export function useExpenses(tenantId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['expenses', tenantId, startDate, endDate],
        queryFn: () => fetchExpenses(tenantId, startDate, endDate),
        enabled: !!tenantId && !!startDate && !!endDate,
    });
}

export function useExpenseCategories(tenantId: string) {
    return useQuery({
        queryKey: ['expense_categories', tenantId],
        queryFn: () => fetchExpenseCategories(tenantId),
        enabled: !!tenantId,
    });
}

export function useExpensesWithCategories(tenantId: string) {
    return useQuery({
        queryKey: ['expenses_with_categories', tenantId],
        queryFn: () => fetchExpensesWithCategories(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreateExpenseCategory(tenantId: string) {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (name: string) => createExpenseCategory(tenantId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense_categories', tenantId] });
        }
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenantId, data }: { tenantId: string; data: ExpenseFormData }) =>
            createExpense(tenantId, data),
        onSuccess: (_, variables) => {
            // Instantly refresh the table data for this tenant
            queryClient.invalidateQueries({ queryKey: ['expenses_with_categories', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['cash_reference_data', variables.tenantId] });

            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard', variables.tenantId] });
        },
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenantId, expenseId, data }: { tenantId: string; expenseId: string; data: ExpenseFormData }) =>
            updateExpense(tenantId, expenseId, data),
        onSuccess: (_, variables) => {
            // Instantly refresh the table data and P&L summaries
            queryClient.invalidateQueries({ queryKey: ['expenses_with_categories', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['cash_reference_data', variables.tenantId] });

            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard', variables.tenantId] });
        },
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ expenseId, tenantId }: { expenseId: string; tenantId: string }) =>
            deleteExpense(expenseId, tenantId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['expenses_with_categories', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['expenses', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['cash_reference_data', variables.tenantId] });

            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard', variables.tenantId] });
        },
    });
}

// ============================================================================
// CASH BOOK & CREDIT LEDGER
// ============================================================================

export function useDailyCashSummaries(tenantId: string) {
    return useQuery<DailyCashSummary[]>({
        queryKey: ['daily_cash_summaries', tenantId],
        queryFn: () => fetchDailyCashSummaries(tenantId),
        enabled: !!tenantId,
    });
}

export function useCashEntries(tenantId: string) {
    return useQuery<CashEntry[]>({
        queryKey: ['cash_book', tenantId],
        queryFn: () => fetchCashEntries(tenantId),
        enabled: !!tenantId,
    });
}

export const useCreditLedger = (tenantId: string, entityType: 'customer' | 'supplier', entityId: string) => {
    return useQuery({
        queryKey: ['credit_ledger', tenantId, entityType, entityId],
        queryFn: () => fetchCreditLedger(tenantId, entityType, entityId),
        enabled: !!tenantId && !!entityId,
    });
};

// Fetch reference dropdown options (Bills, Expenses, Purchases)
export function useCashReferenceData(tenantId: string) {
    return useQuery({
        queryKey: ['cash_reference_data', tenantId],
        queryFn: () => fetchReferenceData(tenantId),
        enabled: !!tenantId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        gcTime: 1000 * 60 * 10,   // Garbage collect after 10 mins
    });
}

// Mutation to create entry
export function useCreateCashEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tenantId, data }: { tenantId: string, data: CashBookFormData }) =>
            createCashEntry(tenantId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cash_book', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_cash_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
        }
    });
}

export function useUpdateCashEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tenantId, entryId, data }: { tenantId: string, entryId: string, data: CashBookFormData }) =>
            updateCashEntry(tenantId, entryId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cash_book', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_cash_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
        }
    });
}

export function useDeleteCashEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, tenantId }: { entryId: string, tenantId: string }) =>
            deleteCashEntry(entryId, tenantId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cash_book', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_cash_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
        }
    });
}

// ============================================================================
// PAYMENTS & SETTLEMENTS
// ============================================================================

export function usePaymentBatches(tenantId: string) {
    return useQuery({
        queryKey: ['payment_batches', tenantId],
        queryFn: () => fetchPaymentBatches(tenantId),
        enabled: !!tenantId,
    })
}

export function useCustomerPayments(tenantId: string, customerId: string) {
    return useQuery({
        queryKey: ['customer_payments', tenantId, customerId],
        queryFn: () => fetchCustomerPaymentBatches(tenantId, customerId),
        enabled: !!tenantId && !!customerId,
    });
}

export function useSupplierPayments(tenantId: string, supplierId: string) {
    return useQuery({
        queryKey: ['supplier_payments', tenantId, supplierId],
        queryFn: () => fetchSupplierPaymentBatches(tenantId, supplierId),
        enabled: !!tenantId && !!supplierId,
    });
}

export function useUnpaidDocuments(tenantId: string, entityType: "customer" | "supplier", entityId: string) {
    return useQuery({
        queryKey: ['unpaid_documents', tenantId, entityType, entityId],
        queryFn: () => fetchUnpaidDocuments(tenantId, entityType, entityId),
        enabled: !!tenantId && !!entityId && !!entityType,
        staleTime: 0,
    })
}

export function useRecordPaymentBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenantId, data }: { tenantId: string, data: PaymentFormData }) => 
            recordPaymentBatch(tenantId, data),
        onSuccess: (_, variables) => {
            // Massive invalidation sweep because this transaction touches almost every financial table
            queryClient.invalidateQueries({ queryKey: ['payment_batches', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['cash_book', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_cash_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
            
            if (variables.data.entity_type === 'customer') {
                queryClient.invalidateQueries({ queryKey: ['bills', 'all', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['bill'] });
                queryClient.invalidateQueries({ queryKey: ['customers', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
                queryClient.invalidateQueries({ queryKey: ['customer_payments', variables.tenantId, variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['credit_ledger', variables.tenantId, 'customer', variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['unpaid_documents', variables.tenantId, 'customer', variables.data.entity_id] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['purchase_order'] });
                queryClient.invalidateQueries({ queryKey: ['suppliers', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
                queryClient.invalidateQueries({ queryKey: ['supplier_payments', variables.tenantId, variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['credit_ledger', variables.tenantId, 'supplier', variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['unpaid_documents', variables.tenantId, 'supplier', variables.data.entity_id] });
            }
        }
    });
}

export function useUpdatePaymentBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenantId, batchId, data }: { tenantId: string, batchId: string, data: PaymentFormData }) => 
            updatePaymentBatch(tenantId, batchId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['payment_batches', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['cash_book', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_cash_summaries', variables.tenantId] }); // New
            queryClient.invalidateQueries({ queryKey: ['daily_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
            
            if (variables.data.entity_type === 'customer') {
                queryClient.invalidateQueries({ queryKey: ['bills', 'all', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['bill'] });
                queryClient.invalidateQueries({ queryKey: ['customers', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
                queryClient.invalidateQueries({ queryKey: ['customer_payments', variables.tenantId, variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['credit_ledger', variables.tenantId, 'customer', variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['unpaid_documents', variables.tenantId, 'customer', variables.data.entity_id] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['purchase_order'] });
                queryClient.invalidateQueries({ queryKey: ['suppliers', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
                queryClient.invalidateQueries({ queryKey: ['supplier_payments', variables.tenantId, variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['credit_ledger', variables.tenantId, 'supplier', variables.data.entity_id] });
                queryClient.invalidateQueries({ queryKey: ['unpaid_documents', variables.tenantId, 'supplier', variables.data.entity_id] });
            }
        }
    });
}

export function useDeletePaymentBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenantId, batchId, entityType, entityId }: { tenantId: string, batchId: string, entityType: "customer" | "supplier", entityId: string }) => 
            deletePaymentBatch(tenantId, batchId, entityType, entityId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['payment_batches', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['cash_book', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['daily_cash_summaries', variables.tenantId] }); // New
            queryClient.invalidateQueries({ queryKey: ['daily_summaries', variables.tenantId] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard', variables.tenantId] });
            
            if (variables.entityType === 'customer') {
                queryClient.invalidateQueries({ queryKey: ['bills', 'all', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['bill'] });
                queryClient.invalidateQueries({ queryKey: ['customers', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
                queryClient.invalidateQueries({ queryKey: ['customer_payments', variables.tenantId, variables.entityId] });
                queryClient.invalidateQueries({ queryKey: ['credit_ledger', variables.tenantId, 'customer', variables.entityId] });
                queryClient.invalidateQueries({ queryKey: ['unpaid_documents', variables.tenantId, 'customer', variables.entityId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['purchase_orders', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['purchase_order'] });
                queryClient.invalidateQueries({ queryKey: ['suppliers', variables.tenantId] });
                queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
                queryClient.invalidateQueries({ queryKey: ['supplier_payments', variables.tenantId, variables.entityId] });
                queryClient.invalidateQueries({ queryKey: ['credit_ledger', variables.tenantId, 'supplier', variables.entityId] });
                queryClient.invalidateQueries({ queryKey: ['unpaid_documents', variables.tenantId, 'supplier', variables.entityId] });
            }
        }
    });
}