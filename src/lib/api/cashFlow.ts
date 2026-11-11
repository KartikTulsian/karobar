import { CashFlowGroup, CashFlowRow } from "@/types/finance";
import { supabase } from "../supabase/client";

/** Money in / out between two dates, grouped by day, week or month. One database call, a few rows back. */
export async function fetchCashFlow(tenantId: string, startDate: string, endDate: string, group: CashFlowGroup): Promise<CashFlowRow[]> {
    const { data, error } = await supabase.rpc("get_cash_flow_summary", {
        p_tenant_id: tenantId,
        p_start: startDate,
        p_end: endDate,
        p_group: group,
    });
 
    if (error) {
        console.error("Database Error fetching cash flow:", error.message);
        throw new Error("Failed to fetch cash flow");
    }
 
    // numeric columns arrive as strings from Postgres
    return ((data || []) as Record<string, string | number>[]).map((r) => ({
        period: String(r.period),
        customer_receipts: Number(r.customer_receipts),
        supplier_refunds: Number(r.supplier_refunds),
        other_in: Number(r.other_in),
        supplier_payments: Number(r.supplier_payments),
        expenses: Number(r.expenses),
        customer_refunds: Number(r.customer_refunds),
        other_out: Number(r.other_out),
        total_in: Number(r.total_in),
        total_out: Number(r.total_out),
    }));
}