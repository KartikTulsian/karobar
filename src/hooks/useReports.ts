import { fetchInventoryReport, fetchSalesReport, fetchTopCustomersReport, fetchTopSuppliersReport } from "@/lib/api/reports";
import { DashboardFilterParams, InventoryDashboardResponse, SalesReportParams, SalesReportResponse, TopCustomerItem, TopCustomersParams, TopSupplierItem, TopSuppliersParams } from "@/types/reports";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to fetch and cache inventory dashboard analytics.
 * Includes a 5-minute cache time and retains previous data while switching filters
 * to prevent flickering UI.
 */
export function useInventoryReport(tenantId: string, params: DashboardFilterParams) {
  return useQuery<InventoryDashboardResponse>({
    queryKey: ['reports', 'inventory', tenantId, params.timeframe, params.startDate, params.endDate],
    queryFn: () => fetchInventoryReport(tenantId, params),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    placeholderData: keepPreviousData, // Smoothly show old chart while new timeframe loads
  });
}

/**
 * Utility hook to force refresh report cache (e.g., after stock edits or bulk adjustments).
 */
export function useInvalidateInventoryReport() {
  const queryClient = useQueryClient();

  return (tenantId: string) => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'inventory', tenantId] });
  };
}

export function useSalesReport(tenantId: string, params: SalesReportParams) {
  return useQuery<SalesReportResponse>({
    // Include all params in the queryKey so it refetches when filters change
    queryKey: ['reports', 'sales', tenantId, params.timeframe, params.startDate, params.endDate, params.brandId, params.categoryId],
    queryFn: () => fetchSalesReport(tenantId, params),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, 
    placeholderData: keepPreviousData, 
  });
}

export function useTopCustomersReport(tenantId: string, params: TopCustomersParams) {
  return useQuery<TopCustomerItem[]>({
    // queryKey includes all filters so React Query caches each combination uniquely
    queryKey: ['reports', 'top-customers', tenantId, params.timeframe, params.startDate, params.endDate, params.customerType, params.limit],
    queryFn: () => fetchTopCustomersReport(tenantId, params),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minute cache
    placeholderData: keepPreviousData, // Keeps the old leaderboard visible while fetching new dates
  });
}

export function useInvalidateTopCustomersReport() {
  const queryClient = useQueryClient();

  return (tenantId: string) => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'top-customers', tenantId] });
  };
}

export function useTopSuppliersReport(tenantId: string, params: TopSuppliersParams) {
  return useQuery<TopSupplierItem[]>({
    queryKey: ['reports', 'top-suppliers', tenantId, params.timeframe, params.startDate, params.endDate, params.limit],
    queryFn: () => fetchTopSuppliersReport(tenantId, params),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, 
    placeholderData: keepPreviousData, 
  });
}

export function useInvalidateTopSuppliersReport() {
  const queryClient = useQueryClient();
  return (tenantId: string) => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'top-suppliers', tenantId] });
  };
}