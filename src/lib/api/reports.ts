import { ChartGranularity, DashboardFilterParams, InventoryDashboardResponse, SalesReportParams, SalesReportResponse, TopCustomerItem, TopCustomersParams, TopSupplierItem, TopSuppliersParams } from "@/types/reports";
import { supabase } from "../supabase/client";

/**
 * Calculates start/end timestamps and chart grouping based on chosen timeframe
 */
function resolveTimeframeBounds(params: DashboardFilterParams): {
    startDate: string;
    endDate: string;
    granularity: ChartGranularity
} {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let granularity: ChartGranularity = 'day';

    switch(params.timeframe) {
        case 'daily':
            // Toady (00:00 to 23:59)
            startDate.setHours(0, 0, 0, 0);
            granularity = 'day';
            break;

        case 'weekly':
            // Trailing 7 days
            startDate.setDate(now.getDate() - 7);
            granularity = 'day';
            break;
        
        case 'monthly':
            //Trailing 30 days
            startDate.setDate(now.getDate() - 30);
            granularity = 'day';
            break;

        case 'yearly':
            // Trailing 365 days grouped by month
            startDate.setDate(now.getDate() - 365);
            granularity = 'month';
            break;

        case 'custom':
            if (params.startDate) startDate = new Date(params.startDate);
            if (params.endDate) endDate = new Date(params.endDate);
            if (startDate > endDate) {
                const temp = startDate;
                startDate = endDate;
                endDate = temp;
            }
            endDate.setHours(23, 59, 59, 999);
            granularity = 'day';
            break;
    }

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity,
    };
}

/**
 * Fetches the aggregated inventory report data using direct Postgres RPC
 */
export async function fetchInventoryReport(
    tenant_id: string,
    filterParams: DashboardFilterParams = { timeframe: 'monthly' }
): Promise<InventoryDashboardResponse> {
    const { startDate, endDate, granularity } = resolveTimeframeBounds(filterParams);

    const { data, error } = await supabase.rpc('get_inventory_dashboard_data', {
        p_tenant_id: tenant_id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_granularity: granularity,
    });

    if (error) {
    console.error("Database Error fetching inventory report:", error.message);
    throw new Error(error.message || "Failed to load inventory dashboard metrics");
  }

  if (!data) {
    throw new Error("Empty response received from inventory analytics RPC");
  }

  return data as InventoryDashboardResponse;
}

export async function fetchSalesReport(
    tenant_id: string,
    params: SalesReportParams = { timeframe: 'monthly' }
): Promise<SalesReportResponse> {
    
    // Reuse the exact same timeframe resolver from the inventory report
    const { startDate, endDate } = resolveTimeframeBounds({
        timeframe: params.timeframe,
        startDate: params.startDate,
        endDate: params.endDate
    });

    const { data, error } = await supabase.rpc('get_sales_report_data', {
        p_tenant_id: tenant_id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_category_id: params.categoryId || null,
        p_brand_id: params.brandId || null
    });

    if (error) {
        console.error("Database Error fetching sales report:", error.message);
        throw new Error(error.message || "Failed to load sales report metrics");
    }

    if (!data) {
        throw new Error("Empty response received from sales analytics RPC");
    }

    return data as SalesReportResponse;
}

export async function fetchTopCustomersReport(
    tenant_id: string,
    params: TopCustomersParams = { timeframe: 'monthly', customerType: 'all' }
): Promise<TopCustomerItem[]> {
    
    const { startDate, endDate } = resolveTimeframeBounds({
        timeframe: params.timeframe,
        startDate: params.startDate,
        endDate: params.endDate
    });

    const { data, error } = await supabase.rpc('get_top_customers_report', {
        p_tenant_id: tenant_id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_customer_type: params.customerType || 'all',
        p_limit: params.limit || 100
    });

    if (error) {
        console.error("Database Error fetching top customers:", error.message);
        throw new Error(error.message || "Failed to load top customers leaderboard");
    }

    return (data || []) as TopCustomerItem[];
}

export async function fetchTopSuppliersReport(
    tenant_id: string,
    params: TopSuppliersParams = { timeframe: 'monthly' }
): Promise<TopSupplierItem[]> {
    
    const { startDate, endDate } = resolveTimeframeBounds({
        timeframe: params.timeframe,
        startDate: params.startDate,
        endDate: params.endDate
    });

    const { data, error } = await supabase.rpc('get_top_suppliers_report', {
        p_tenant_id: tenant_id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: params.limit || 100
    });

    if (error) {
        console.error("Database Error fetching top suppliers:", error.message);
        throw new Error(error.message || "Failed to load supplier scorecard");
    }

    return (data || []) as TopSupplierItem[];
}