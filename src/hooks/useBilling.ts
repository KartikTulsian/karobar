import { createBill, createSalesReturn, deleteBill, deleteSalesReturn, fetchAllBills, fetchBillById, fetchNextBillNumberPreview, fetchSalesReturns, updateBill, updateSalesReturn } from "@/lib/api/billing";
import { BillFormData } from "@/lib/validations/billSchema";
import { SalesReturnFormData } from "@/lib/validations/salesReturnSchema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Variable } from "lucide-react";

export function useBills(tenantId: string) {
    return useQuery({
        queryKey: ['bills', 'all', tenantId],
        queryFn: () => fetchAllBills(tenantId),
        enabled: !!tenantId,
    });
}

export function useBill(tenantId: string, billId: string) {
    return useQuery({
        queryKey: ['bill', billId, tenantId],
        queryFn: () => fetchBillById(tenantId, billId),
        enabled: !!tenantId && !!billId,
    });
}

export function useNextBillNumberPreview(tenantId: string, isCreateMode: boolean) {
    return useQuery({
        queryKey: ['billing', 'next-number-preview', tenantId],
        queryFn: () => fetchNextBillNumberPreview(tenantId),
        enabled: !!tenantId && isCreateMode,
        staleTime: 0,
    });
}

export function useCreateBill(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BillFormData) => createBill(tenantId, data),
        onSuccess: () => {
            // Instantly refreshes the main bills table
            queryClient.invalidateQueries({ queryKey: ['bills', 'all', tenantId] });

            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
        },
    });
}

export function useUpdateBill(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ billId, data }: { billId: string, data: BillFormData }) =>
            updateBill(tenantId, billId, data),
        onSuccess: (_, Variables) => {
            //Refresh the main table
            queryClient.invalidateQueries({ queryKey: ['bills', 'all', tenantId] });
            //Refresh the specific bill details page if the user is looking at it
            queryClient.invalidateQueries({ queryKey: ['bill', Variables.billId, tenantId] });

            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
        },
    });
}

export function useDeleteBill(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (billId: string) => deleteBill(tenantId, billId),
        onSuccess: (_, billId) => {
            // Refresh the table after deletion
            queryClient.invalidateQueries({ queryKey: ['bills', 'all', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['bill', billId, tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
        },
    });
}

// Sales Return

export function useSalesReturns(tenantId: string) {
    return useQuery({
        queryKey: ['sales_returns', tenantId],
        queryFn: () => fetchSalesReturns(tenantId),
        enabled: !!tenantId,
    })
}

export function useCreateSalesReturn(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SalesReturnFormData) => createSalesReturn(tenantId, data),
        onSuccess: (_, variables) => {
            // Refresh the sales returns table
            queryClient.invalidateQueries({ queryKey: ['sales_returns', tenantId] });
            
            // Refresh the specific bill page so it shows the returned items!
            queryClient.invalidateQueries({ queryKey: ['bill', variables.original_bill_id, tenantId] });
            
            // Refresh the general bills list (in case global totals or statuses rely on this)
            queryClient.invalidateQueries({ queryKey: ['bills', 'all', tenantId] });

            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });

            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
        },
    });
}

export function useUpdateSalesReturn(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ returnId, data }: { returnId: string, data: SalesReturnFormData }) =>
            updateSalesReturn(tenantId, returnId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sales_returns', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['bill', variables.data.original_bill_id, tenantId] });

            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });

            queryClient.invalidateQueries({ queryKey: ['bills', 'all', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
        },
    });
}

export function useDeleteSalesReturn(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (returnId: string) => deleteSalesReturn(tenantId, returnId),
        onSuccess: () => {
            // Because we don't have the original_bill_id passed in the delete mutation,
            // we refresh the global bills lists to ensure consistency.
            queryClient.invalidateQueries({ queryKey: ['sales_returns', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['bills', 'all', tenantId] });

            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
        },
    });
}