// import { DailySummary, Expense, ExpenseCategory, ExpenseWithCategory, GSTDashboardData } from "@/types/finance";

// // Mock UUIDs for relations
// const MOCK_TENANT_ID = "11111111-1111-1111-1111-111111111111";
// const MOCK_USER_ID = "99999999-9999-9999-9999-999999999991";

// export const dummyExpenseCategories: ExpenseCategory[] = [
//   {
//     id: "cat-001",
//     tenant_id: MOCK_TENANT_ID,
//     name: "Rent",
//     is_default: true,
//   },
//   {
//     id: "cat-002",
//     tenant_id: MOCK_TENANT_ID,
//     name: "Salary",
//     is_default: true,
//   },
//   {
//     id: "cat-003",
//     tenant_id: MOCK_TENANT_ID,
//     name: "Utilities",
//     is_default: true,
//   },
// ];

// export const dummyExpenses: Expense[] = [
//   {
//     id: "exp-101",
//     tenant_id: MOCK_TENANT_ID,
//     category_id: "cat-001",
//     recorded_by: MOCK_USER_ID,
//     description: "June Shop Rent",
//     amount: 25000.00,
//     payment_method: "upi",
//     expense_date: "2026-06-01",
//     receipt_url: "https://storage.supabase.com/receipts/june-rent.pdf",
//     created_at: "2026-06-01T10:00:00Z",
//   },
//   {
//     id: "exp-102",
//     tenant_id: MOCK_TENANT_ID,
//     category_id: "cat-003",
//     recorded_by: MOCK_USER_ID,
//     description: "Electricity Bill",
//     amount: 4500.00,
//     payment_method: "upi",
//     expense_date: "2026-06-03",
//     receipt_url: null,
//     created_at: "2026-06-03T14:30:00Z",
//   },
// ];

// export const dummyDailySummaries: DailySummary[] = [
//   {
//     id: "sum-001",
//     tenant_id: MOCK_TENANT_ID,
//     summary_date: "2026-06-01",
//     total_sales: 45000.00,
//     total_collections: 40000.00,
//     total_expenses: 25000.00, // Rent paid this day
//     total_purchases: 15000.00,
//     gst_collected: 8100.00,
//     gst_paid: 2700.00,
//     bill_count: 12,
//     gross_profit: 30000.00, // Assuming COGS was 15000
//     net_profit: 5000.00,    // 30000 Gross - 25000 Expenses
//   },
//   {
//     id: "sum-002",
//     tenant_id: MOCK_TENANT_ID,
//     summary_date: "2026-06-02",
//     total_sales: 38000.00,
//     total_collections: 38000.00,
//     total_expenses: 0.00,
//     total_purchases: 0.00,
//     gst_collected: 6840.00,
//     gst_paid: 0.00,
//     bill_count: 9,
//     gross_profit: 26000.00, // Assuming COGS was 12000
//     net_profit: 26000.00,
//   },
//   {
//     id: "sum-003",
//     tenant_id: MOCK_TENANT_ID,
//     summary_date: "2026-06-03",
//     total_sales: 52000.00,
//     total_collections: 45000.00,
//     total_expenses: 4500.00, // Utilities paid this day
//     total_purchases: 20000.00,
//     gst_collected: 9360.00,
//     gst_paid: 3600.00,
//     bill_count: 15,
//     gross_profit: 34000.00, // Assuming COGS was 18000
//     net_profit: 29500.00,   // 34000 Gross - 4500 Expenses
//   }
// ];

// export const MOCK_GST_DASHBOARD: GSTDashboardData = {
//     period: "May 2024",
//     total_output_tax: 125400.50,
//     total_input_tax_credit: 85200.00,
//     net_gst_payable: 40200.50,
//     breakdown: [
//         {
//             id: "row-1",
//             description: "B2B Invoices",
//             record_count: 45,
//             taxable_value: 450000.00,
//             cgst: 40500.00,
//             sgst: 40500.00,
//             igst: 15000.00,
//             total_tax: 96000.00
//         },
//         {
//             id: "row-2",
//             description: "B2C Invoices",
//             record_count: 120,
//             taxable_value: 180000.00,
//             cgst: 16200.00,
//             sgst: 16200.00,
//             igst: 0,
//             total_tax: 32400.00
//         },
//         {
//             id: "row-3",
//             description: "B2B Credit Notes",
//             record_count: 3,
//             taxable_value: -15000.00,
//             cgst: -1350.00,
//             sgst: -1350.00,
//             igst: -300.00,
//             total_tax: -3000.00
//         },
//         {
//             id: "row-4",
//             description: "Purchase Invoices (ITC)",
//             record_count: 22,
//             taxable_value: 480000.00,
//             cgst: 35000.00,
//             sgst: 35000.00,
//             igst: 15200.00,
//             total_tax: 85200.00
//         }
//     ]
// };

// export const dummyExpensesList: ExpenseWithCategory[] = [
//     {
//         id: "exp-001",
//         tenant_id: "1111-1111",
//         category_id: "cat-001",
//         recorded_by: "user-1",
//         description: "June Shop Rent",
//         amount: 25000.00,
//         payment_method: "bank_transfer",
//         expense_date: "2024-06-01",
//         receipt_url: "url",
//         created_at: "2024-06-01T10:00:00Z",
//         expense_categories: {
//           name: "Rent",
//           id: "",
//           tenant_id: "",
//           is_default: false
//         }
//     },
//     {
//         id: "exp-002",
//         tenant_id: "1111-1111",
//         category_id: "cat-003",
//         recorded_by: "user-1",
//         description: "Electricity Bill (May)",
//         amount: 4500.00,
//         payment_method: "upi",
//         expense_date: "2024-06-03",
//         receipt_url: null,
//         created_at: "2024-06-03T14:30:00Z",
//         expense_categories: {
//           name: "Utilities",
//           id: "",
//           tenant_id: "",
//           is_default: false
//         }
//     },
//     {
//         id: "exp-003",
//         tenant_id: "1111-1111",
//         category_id: "cat-002",
//         recorded_by: "user-1",
//         description: "Staff Lunch",
//         amount: 850.00,
//         payment_method: "cash",
//         expense_date: "2024-06-05",
//         receipt_url: null,
//         created_at: "2024-06-05T12:00:00Z",
//         expense_categories: {
//           name: "Staff Welfare",
//           id: "",
//           tenant_id: "",
//           is_default: false
//         }
//     }
// ];