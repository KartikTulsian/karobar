import { PaymentMethod } from "./billing";

export type CashEntryType = "in" | "out";
export type CashReferenceType =
  | "manual"
  | "single_sale"
  | "multi_sale"
  | "single_purchase"
  | "multi_purchase"
  | "expense"
  | "advance_receipt"
  | "advance_payment";
export type PaymentFlowType = "in" | "out";
export type PaymentRecordStatus = "draft" | "sanctioned" | "cancelled";

export interface ExpenseCategory {
  id: string; // UUID
  tenant_id: string; // UUID
  name: string; // TEXT
  is_default: boolean; // BOOL
}

export interface Expense {
  id: string; // UUID
  tenant_id: string; // UUID
  category_id: string; // UUID (FK -> expense_categories)
  recorded_by: string; // UUID (FK -> auth.users)
  description: string; // TEXT
  amount: number; // NUMERIC(12,2)
  payment_method: PaymentMethod; // ENUM
  expense_date: string; // DATE (YYYY-MM-DD)
  receipt_url: string | null; // TEXT (nullable)
  created_at: string; // TIMESTAMPTZ
}

export interface DailySummary {
  id: string; // UUID
  tenant_id: string; // UUID
  summary_date: string; // DATE (UNIQUE per tenant)
  total_sales: number; // NUMERIC(12,2)
  total_collections: number; // NUMERIC(12,2)
  total_expenses: number; // NUMERIC(12,2)
  total_purchases: number; // NUMERIC(12,2)
  gst_collected: number; // NUMERIC(12,2)
  gst_paid: number; // NUMERIC(12,2)
  bill_count: number; // INT
  gross_profit: number; // NUMERIC(12,2)
  net_profit: number; // NUMERIC(12,2)
}

// ==========================================
// PnL INTERFACES
// ==========================================

export interface PnLKpiMetrics {
  totalRevenue: number; // total_sales + total_collections
  totalCost: number; // operating expenses + COGS
  grossMargin: number; // totalRevenue - COGS
  netMargin: number; // grossMargin - operating expenses
}
export interface PnLKpis {
  totalRevenue: number;
  cogs: number;          // Cost of Goods Sold
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

export interface DailyPnLTrend {
  date: string;
  revenue: number;
  cogs: number;
  expenses: number;
}

export interface ItemProfitability {
  item_id: string;
  item_name: string;
  units_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  margin_pct: number;
}

export interface CustomerProfitability {
  customer_id: string;
  customer_name: string;
  customer_type: string;
  bill_count: number;
  total_revenue: number;
  total_profit: number;
  margin_pct: number;
}

export interface SupplierCostInsight {
  supplier_id: string;
  supplier_name: string;
  po_count: number;
  total_spend: number;
}

export interface BillProfitability {
  bill_id: string;
  bill_date: string;
  bill_number: string;
  customer_name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin_pct: number;
}

export interface PnLDashboardData {
  kpis: PnLKpis;
  charts: {
    dailyTrends: DailyPnLTrend[];
    expenseBreakdown: { name: string; value: number }[];
    topItems: ItemProfitability[];
    bottomItems: ItemProfitability[];
  };
  tables: {
    billLevel: BillProfitability[];
    itemLevel: ItemProfitability[];
    customerLevel: CustomerProfitability[];
    supplierLevel: SupplierCostInsight[];
  };
}

// ==========================================
// GST / TAX INTERFACES
// ==========================================

export type GSTDocumentType =
  | "B2B Invoices"
  | "B2B Invoices (4A, 4B, 4C)"
  | "B2C Invoices"
  | "B2C Invoices (Table 7)"
  | "B2B Credit Notes"
  | "B2B Credit Notes (CDNR - 9B)"
  | "B2C Credit Notes (CDNU)"
  | "B2B Debit Notes"
  | "Purchase Invoices (ITC)"
  | "Purchase Invoices (Eligible ITC)"
  | "Purchase Returns (ITC Reversals)";

export interface GSTSummaryRow {
  id: string;
  description: GSTDocumentType | string;
  record_count: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
}

export interface GSTTaxHeadValues {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface GSTHeadSummary {
  output: GSTTaxHeadValues;
  itc: GSTTaxHeadValues;
  net_payable: GSTTaxHeadValues;
}

export interface GSTHsnSummaryRow {
  hsn_code: string;
  unit: string;
  gst_rate: number;
  total_qty: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
}

export interface SupplierItcAuditRow {
  supplier_id: string;
  supplier_name: string;
  gstin: string | null;
  po_count: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_itc: number;
}

export interface GSTDashboardData {
  period: string;
  total_output_tax: number;       // Net tax collected from sales minus returns
  total_input_tax_credit: number; // Net tax paid on purchases minus reversals
  net_gst_payable: number;        // Output - ITC
  head_summary: GSTHeadSummary;   // CGST / SGST / IGST breakdown
  breakdown: GSTSummaryRow[];     // Table rows by document type
  hsn_summary: GSTHsnSummaryRow[];// Table 12 HSN code summaries
  supplier_audit?: SupplierItcAuditRow[]; // Supplier-wise ITC reconciliation
}

export interface ExpenseWithCategory extends Expense {
  expense_categories?: ExpenseCategory | null;
}

export interface CashEntry {
  id: string;
  tenant_id: string;
  recorded_by: string;
  entry_date: string;
  type: CashEntryType;
  amount: number;
  description: string;
  reference_type: CashReferenceType;
  reference_id: string | null;
  balance_after: number;
  created_at: string;
  payment_method: PaymentMethod;
}

export interface DailyCashSummary {
  date: string;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

export interface DocumentState {
  amount_paid: number;
  settlement_discount: number;
  grand_total?: number;
  total_amount?: number;
}

export interface OldPaymentRecord {
  id: string;
  amount: number;
  settlement_discount: number;
  status: PaymentRecordStatus;
  document_id: string;
}

export interface PaymentBatchAllocation {
  document_id: string;
  document_number: string;
  amount: number;
  discount: number;
}

export interface PaymentBatchSummary {
  receipt_batch_id: string;
  paid_at: string;
  flow_type: PaymentFlowType;
  entity_id: string;
  entity_name: string;
  total_amount: number;
  advance_applied: number;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  reference_no: string | null;
  note: string | null;
  bill_count: number; // How many bills this single payment was split across
  allocations: PaymentBatchAllocation[];
}

export interface CustomerPayment {
  id: string;
  tenant_id: string;
  bill_id: string;
  amount: number;
  settlement_discount: number;
  method: PaymentMethod; // Uses your existing PaymentMethod enum
  status: PaymentRecordStatus;
  reference_no: string | null;
  note: string | null;
  receipt_batch_id: string | null; // The new field we just added
  recorded_by: string;
  paid_at: string; // TIMESTAMPTZ
}

// Optional: If you ever need to fetch a payment WITH its associated bill details
export interface CustomerPaymentWithBill extends CustomerPayment {
  bills?: {
    bill_number: string;
    customer_id: string;
    customers?: {
      name: string;
    };
  } | null;
}

export interface SupplierPayment {
  id: string;
  tenant_id: string;
  po_id: string;
  amount: number;
  settlement_discount: number;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  reference_no: string | null;
  note: string | null;
  receipt_batch_id: string | null; // The new field we just added
  recorded_by: string;
  paid_at: string; // TIMESTAMPTZ
}

// Optional: If you ever need to fetch a payment WITH its associated PO details
export interface SupplierPaymentWithPO extends SupplierPayment {
  purchase_orders?: {
    po_number: string;
    supplier_id: string;
    suppliers?: {
      name: string;
    };
  } | null;
}

export interface PartyOption {
  id: string;
  name: string;
}

export interface UnpaidDocument {
  id: string;
  document_number: string;
  document_date: string;
  amount_due: number;
}

export interface CreditLedgerEntry {
  id: string;
  tenant_id: string;
  entity_type: "customer" | "supplier";
  entity_id: string;
  flow_type: "in" | "out";
  amount: number;
  balance_after: number;
  reference_type: string;
  reference_id: string | null;
  description: string;
  created_at: string;
}
