// import { BillWithCustomer } from "@/types/billing";

// export const MOCK_BILLS: BillWithCustomer[] = [
//     {
//     id: "uuid-1",
//     tenant_id: "tenant-1",
//     customer_id: "cust-1",
//     created_by: "user-1",
//     bill_number: "INV-2024-001",
//     bill_date: "2024-05-31",
//     due_date: "2024-06-07",
//     status: "paid",
//     is_gst_bill: true,
//     is_interstate: false,
//     subtotal: 1000,
//     discount_amount: 0,
//     cgst_total: 90,
//     sgst_total: 90,
//     igst_total: 0,
//     grand_total: 1180,
//     amount_paid: 1180,
//     amount_due: 0,
//     payment_method: "upi",
//     notes: null,
//     ai_parsed: false,
//     created_at: "2024-05-31T10:00:00Z",
//     updated_at: "2024-05-31T10:00:00Z",
//     customers: {
//       name: "Carl Evans",
//       type: "registered",
//       phone: "+91 9876543210"
//     }
//   },
//   {
//     id: "uuid-2",
//     tenant_id: "tenant-1",
//     customer_id: "cust-2",
//     created_by: "user-1",
//     bill_number: "INV-2024-002",
//     bill_date: "2024-05-31",
//     due_date: "2024-06-15",
//     status: "issued", // Unpaid essentially
//     is_gst_bill: true,
//     is_interstate: false,
//     subtotal: 1500,
//     discount_amount: 0,
//     cgst_total: 135,
//     sgst_total: 135,
//     igst_total: 0,
//     grand_total: 1770,
//     amount_paid: 0,
//     amount_due: 1770,
//     payment_method: "cash",
//     notes: null,
//     ai_parsed: false,
//     created_at: "2024-05-31T11:30:00Z",
//     updated_at: "2024-05-31T11:30:00Z",
//     customers: {
//       name: "Walking Customer 1",
//       type: "flying"
//     }
//   },
//   {
//     id: "uuid-3",
//     tenant_id: "tenant-1",
//     customer_id: "cust-3",
//     created_by: "user-1",
//     bill_number: "INV-2024-003",
//     bill_date: "2024-05-30",
//     due_date: "2024-05-30",
//     status: "overdue",
//     is_gst_bill: false,
//     is_interstate: false,
//     subtotal: 2000,
//     discount_amount: 200,
//     cgst_total: 0,
//     sgst_total: 0,
//     igst_total: 0,
//     grand_total: 1800,
//     amount_paid: 1000,
//     amount_due: 800,
//     payment_method: "mixed",
//     notes: "Partially paid in cash",
//     ai_parsed: false,
//     created_at: "2024-05-30T14:15:00Z",
//     updated_at: "2024-05-30T14:15:00Z",
//     customers: {
//       name: "Patricia Lewis",
//       type: "registered",
//       phone: "+91 9998887776"
//     }
//   }
// ]