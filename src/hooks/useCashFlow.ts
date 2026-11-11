import { fetchCashFlow } from "@/lib/api/cashFlow";
import { CashFlowGroup, CashFlowRow } from "@/types/finance";
import { useQuery } from "@tanstack/react-query";

export function useCashFlow(tenantId: string, startDate: string, endDate: string, group: CashFlowGroup) {
    return useQuery<CashFlowRow[], Error>({
        queryKey: ["cash-flow", tenantId, startDate, endDate, group],
        queryFn: () => fetchCashFlow(tenantId, startDate, endDate, group),
        enabled: !!tenantId && !!startDate && !!endDate,
        staleTime: 1000 * 60, // payments and expenses change this, so keep it short
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
    });
}