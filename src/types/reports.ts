export type ReportTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ChartGranularity = 'day' | 'week' | 'month' | 'year';
export type CreditHealthStatus = 'healthy' | 'warning' | 'danger';

// ==========================================
// Inventory Report Interfaces
// ==========================================

export interface DashboardFilterParams {
  timeframe: ReportTimeframe;
  startDate?: string;
  endDate?: string;
}

export interface ExecutiveSummaryData {
  total_asset_value: number;
  potential_revenue: number;
  locked_capital: number;
  health: {
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
  };
}

export interface VelocityChartPoint {
  period: string;
  inbound_qty: number;
  outbound_qty: number;
}

export interface RunnerItem {
  item_id: string;
  name: string;
  sku: string | null;
  outbound_volume: number;
}

export interface StragglerItem {
  item_id: string;
  name: string;
  sku: string | null;
  current_stock: number;
}

export interface ReorderIntelligenceItem {
  item_id: string;
  name: string;
  sku: string | null;
  current_stock: number;
  avg_daily_sales: number;
  runway_days: number;
}

export interface InventoryDashboardResponse {
  executive_summary: ExecutiveSummaryData;
  velocity: {
    chart_data: VelocityChartPoint[];
    runners: RunnerItem[];
    stragglers: StragglerItem[];
  };
  reorder_intelligence: ReorderIntelligenceItem[];
}

// ==========================================
// Sales Report Interfaces
// ==========================================

export interface SalesKpiMetrics {
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  overdue: number;
}

export interface SalesReportItem {
  id: string; // item_id
  sku: string;
  productName: string;
  brand: string;
  category: string;
  soldQty: number;
  soldAmount: number;
  inStockQty: number;
}

export interface SalesReportResponse {
  kpis: SalesKpiMetrics;
  products: SalesReportItem[];
}

export interface SalesReportParams {
  timeframe: ReportTimeframe;
  startDate?: string;
  endDate?: string;
  brandId?: string; // For future multi-store filtering
  categoryId?: string; // For future product filtering
}

// ==========================================
// Top Customers Report Interfaces
// ==========================================

export interface TopCustomerItem {
  id: string;
  rank: number;
  name: string;
  companyName: string | null;
  type: 'registered' | 'flying';
  phone: string | null;

  totalBilled: number;
  totalPaid: number;
  outstandingDue: number;
  overdueAmount: number;
  visitCount: number;

  creditHealth: CreditHealthStatus;
}

export interface TopCustomersParams {
  timeframe: ReportTimeframe; // From your existing types
  startDate?: string;
  endDate?: string;
  customerType?: 'all' | 'registered' | 'flying';
  limit?: number;
}

// ==========================================
// Top Suppliers Report Interfaces
// ==========================================

export type SupplierQualityStatus = 'healthy' | 'warning' | 'danger';

export interface TopSupplierItem {
  id: string;
  rank: number;
  name: string;
  contactName: string;
  phone: string | null;

  totalSpend: number;
  outstandingPayable: number;
  totalReturned: number;
  returnRate: number; // Percentage (e.g., 5.25)

  qualityStatus: SupplierQualityStatus;
}

export interface TopSuppliersParams {
  timeframe: ReportTimeframe;
  startDate?: string;
  endDate?: string;
  limit?: number;
}