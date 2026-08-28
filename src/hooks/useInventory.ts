import { createBrand, createCategory, createInventoryItem, createStockAdjustment, deleteBrand, deleteCategory, deleteInventoryItem, fetchAllStockMovements, fetchBrands, fetchCategories, fetchInventoryItems, fetchItemById, fetchItemStockMovements, updateBrand, updateCategory, updateInventoryItem } from "@/lib/api/inventory";
import { BrandFormData, CategoryFormData } from "@/lib/validations/categoryBrandSchema";
import { ItemFormData } from "@/lib/validations/itemSchema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useInvalidateInventoryReport } from "./useReports";
import { StockAdjustmentFormData } from "@/lib/validations/stockAdjustmentSchema";

export function useInventory(tenantId: string) {
    return useQuery({
        queryKey: ['inventory', 'items', tenantId],
        queryFn: () => fetchInventoryItems(tenantId),
        enabled: !!tenantId,
    });
}

export function useItem(tenantId: string, itemId: string) {
    return useQuery({
        queryKey: ['item', itemId, tenantId],
        queryFn: () => fetchItemById(tenantId, itemId),
        enabled: !!tenantId && !!itemId,
    })
}

export function useLowStockInventory(tenantId: string) {
    const query = useInventory(tenantId);

    const { lowStockItems, outOfStockItems } = useMemo(() => {
        const items = query.data || [];

        return {
            lowStockItems: items.filter(
                (item) => item.total_stock_qty <= item.low_stock_threshold && item.total_stock_qty > 0
            ),

            outOfStockItems: items.filter(
                (item) => item.total_stock_qty === 0
            )
        };
    }, [query.data]); 

    return {
        ...query,
        lowStockItems,
        outOfStockItems
    }
}

export function useCategories(tenantId: string) {
    return useQuery({
        queryKey: ['categories', tenantId],
        queryFn: () => fetchCategories(tenantId),
        enabled: !!tenantId,
    });
}

export function useBrands(tenantId: string) {
    return useQuery({
        queryKey: ['brands', tenantId],
        queryFn: () => fetchBrands(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreateItem(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ItemFormData) => createInventoryItem(tenantId, data),
        onSuccess: () => {
            // This instantly refreshes the items table!
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['reports', 'inventory', tenantId] });
        },
    });
}

export function useUpdateItem(tenantId: string) {
    const queryClient = useQueryClient();

    const invalidateReport = useInvalidateInventoryReport();

    return useMutation({
        mutationFn: ({ itemId, data }: { itemId: string; data: ItemFormData }) => 
            updateInventoryItem(tenantId, itemId, data),
        onSuccess: (_, variables) => {
            // Refresh the main table list
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            // Refresh the specific item if the user is on the detail page
            queryClient.invalidateQueries({ queryKey: ['item', variables.itemId, tenantId] });
            queryClient.invalidateQueries({ queryKey: ['reports', 'inventory', tenantId] });

            // invalidateReport(tenantId);
        },
    });
}

export function useDeleteItem(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (itemId: string) => deleteInventoryItem(tenantId, itemId),
        onSuccess: () => {
            // Refresh the table after deletion
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['reports', 'inventory', tenantId] });
        },
    });
}

//Category

export function useCreateCategory(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CategoryFormData) => createCategory(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
        }
    });
}

export function useUpdateCategory(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ categoryId, data }: { categoryId: string; data: CategoryFormData }) => 
            updateCategory(tenantId, categoryId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
            // It's also safe to invalidate items, in case category names changed and items rely on it
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
        },
    });
}

export function useDeleteCategory(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (categoryId: string) => deleteCategory(tenantId, categoryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories', tenantId] });
        },
    });
}

//brands

export function useCreateBrand(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BrandFormData) => createBrand(tenantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brands', tenantId] });
        },
    });
}

export function useUpdateBrand(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ brandId, data }: { brandId: string; data: BrandFormData }) => 
            updateBrand(tenantId, brandId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brands', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
        },
    });
}

export function useDeleteBrand(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (brandId: string) => deleteBrand(tenantId, brandId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brands', tenantId] });
        },
    });
}

export function useAllStockMovements(tenantId: string) {
    return useQuery({
        queryKey: ['stock_movements', 'all', tenantId],
        queryFn: () => fetchAllStockMovements(tenantId),
        enabled: !!tenantId,
    });
}

export function useItemStockMovements(tenantId: string, itemId: string) {
    return useQuery({
        queryKey: ['stock_movements', 'item', tenantId, itemId],
        queryFn: () => fetchItemStockMovements(tenantId, itemId),
        enabled: !!tenantId && !!itemId,
    });
}

export function useAdjustStock(tenantId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: StockAdjustmentFormData) => createStockAdjustment(tenantId, data),
        onSuccess: (_, variables) => {
            // Instantly refetch inventory so the new stock quantity shows up in the UI
            queryClient.invalidateQueries({ queryKey: ['inventory', 'items', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['stock_movements', 'all', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['stock_movements', 'item', tenantId, variables.item_id] });
            queryClient.invalidateQueries({ queryKey: ['reports', 'inventory', tenantId] });
        }
    });
}