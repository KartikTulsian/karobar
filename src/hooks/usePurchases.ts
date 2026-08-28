import { addToPurchaseList, createPurchaseOrder, createPurchaseReturn, deletePurchaseOrder, deletePurchaseReturn, fetchNextPONumberPreview, fetchPurchaseOrderById, fetchPurchaseOrders, fetchPurchaseReturns, fetchToPurchaseList, removeFromPurchaseList, updatePurchaseOrder, updatePurchaseReturn, updateToPurchaseListItem } from "@/lib/api/purchases";
import { PurchaseOrderFormData } from "@/lib/validations/purchaseOrderSchema";
import { PurchaseReturnFormData } from "@/lib/validations/purchaseReturnSchema";
import { ToPurchaseFormData } from "@/lib/validations/toPurchaseSchema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useToPurchaseList(tenantId: string) {
    return useQuery({
        queryKey: ['to_purchase_list', tenantId],
        queryFn: () => fetchToPurchaseList(tenantId),
        enabled: !!tenantId,
    });
}

// export function useSuppliers(tenantId: string) {
//     return useQuery({
//         queryKey: ['suppliers', tenantId],
//         queryFn: () => fetchSuppliers(tenantId),
//         enabled: !!tenantId,
//     });
// }

// Mutation to Add an Item
export function useAddToPurchaseList(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ToPurchaseFormData) => addToPurchaseList(tenantId, data),
        onSuccess: () => {
            // Automatically refresh the list on the screen so the new item appears instantly
            queryClient.invalidateQueries({ queryKey: ['to_purchase_list', tenantId] });
        },
    });
}

export function useUpdatePurchaseList(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: ToPurchaseFormData }) => updateToPurchaseListItem(tenantId, id, data),
        onSuccess: () => {
            // Automatically refresh the list on the screen
            queryClient.invalidateQueries({ queryKey: ['to_purchase_list', tenantId] });
        },
    });
}

// Mutation to remove items
export function useRemoveFromPurchaseList(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        // The mutationFn receives an object with tenantId and the array of IDs
        mutationFn: (ids: string[]) => removeFromPurchaseList(tenantId, ids),
        onSuccess: () => {
            // Refresh the list to make the deleted items disappear from the screen
            queryClient.invalidateQueries({ queryKey: ['to_purchase_list', tenantId] });   
        },
    });
}

export function useNextPONumberPreview(tenantId: string, isCreateMode: boolean) {
    return useQuery({
        queryKey: ['purchases', 'next-number-preview', tenantId],
        queryFn: () => fetchNextPONumberPreview(tenantId),
        enabled: !!tenantId && isCreateMode,
        staleTime: 0, // Never cache, always get the latest available sequence
    });
}

export function usePurchaseOrders(tenantId: string) {
    return useQuery ({
        queryKey: ['purchase_orders', tenantId],
        queryFn: () => fetchPurchaseOrders(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreatePurchaseOrder(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PurchaseOrderFormData) => createPurchaseOrder(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', tenantId] });
            // Invalidate inventory because stock may have increased from received items
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });

            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard'] });
        },
    })
}

export function useUpdatePurchaseOrder(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ poId, data }: { poId: string, data: PurchaseOrderFormData }) => 
            updatePurchaseOrder(tenantId, poId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_order', variables.poId, tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard'] });
        },
    });
}

export function useDeletePurchaseOrder(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (poId: string) => deletePurchaseOrder(tenantId, poId),
        onSuccess: (_, poId) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_order', poId, tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard'] });
        },
    });
}

export function usePurchaseReturns(tenantId: string) {
    return useQuery({
        queryKey: ['purchase_returns', tenantId], // Unique cache key
        queryFn: () => fetchPurchaseReturns(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreatePurchaseReturn(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PurchaseReturnFormData) => createPurchaseReturn(tenantId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_returns', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_order', variables.original_po_id, tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });

            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard'] });
        },
    });
}

export function useUpdatePurchaseReturn(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ returnId, data }: { returnId: string, data: PurchaseReturnFormData }) =>
            updatePurchaseReturn(tenantId, returnId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_returns', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_order', variables.data.original_po_id, tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard'] });
        },
    });
}

export function useDeletePurchaseReturn(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (returnId: string) => deletePurchaseReturn(tenantId, returnId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_returns', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['supplier_profile'] });
            queryClient.invalidateQueries({ queryKey: ['pnl-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['gst_dashboard'] });
        },
    });
}

//individual purchase order by id
export function usePurchaseOrder(tenantId: string, poId: string) {
    return useQuery({
        queryKey: ['purchase_order', poId, tenantId],
        queryFn: () => fetchPurchaseOrderById(tenantId, poId),
        enabled: !!tenantId && !!poId,
    });
}
