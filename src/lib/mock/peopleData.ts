// // src/lib/mock/peopleData.ts
// import { Customer, CustomerProfileData, Supplier, SupplierProfileData, TeamMemberWithDetails } from '@/types/people';

// export const MOCK_CUSTOMERS: Customer[] = [
//     {
//         id: "cust-1",
//         tenant_id: "tenant-1",
//         user_id: null,
//         name: "Carl Evans Transport",
//         phone: "+919876543210",
//         email: "carl@example.com",
//         gstin: "22AAAAA0000A1Z5",
//         address: "Transport Nagar, Delhi",
//         state_code: "22",
//         type: "registered",
//         credit_limit: 50000.00,
//         outstanding_due: 12500.00, // Has some debt
//         total_purchases: 150000.00,
//         visit_count: 12,
//         last_purchase_at: "2024-05-28T10:30:00Z",
//         notes: "Key B2B Client",
//         created_at: "2023-01-15T00:00:00Z"
//     },
//     {
//         id: "cust-2",
//         tenant_id: "tenant-1",
//         user_id: null,
//         name: "Walk-in Customer",
//         phone: null,
//         email: null,
//         gstin: null,
//         address: null,
//         state_code: null,
//         type: "flying",
//         credit_limit: 0,
//         outstanding_due: 0,
//         total_purchases: 450.00,
//         visit_count: 1,
//         last_purchase_at: "2024-06-01T14:15:00Z",
//         notes: null,
//         created_at: "2024-06-01T14:10:00Z"
//     },
//     {
//         id: "cust-3",
//         tenant_id: "tenant-1",
//         user_id: "auth-user-3",
//         name: "Priya Sharma",
//         phone: "+919988776655",
//         email: "priya@example.com",
//         gstin: null,
//         address: "South Ext, Delhi",
//         state_code: "22",
//         type: "registered",
//         credit_limit: 10000.00,
//         outstanding_due: 0,
//         total_purchases: 5600.00,
//         visit_count: 4,
//         last_purchase_at: "2024-05-15T09:00:00Z",
//         notes: "Prefers Bosch products",
//         created_at: "2023-11-20T00:00:00Z"
//     }
// ];

// export const MOCK_SUPPLIERS: Supplier[] = [
//     {
//         id: "sup-1",
//         tenant_id: "tenant-1",
//         name: "Electro Mart",
//         gstin: "22AAAAA0000A1Z5",
//         state_code: "22",
//         phone: "+919800000001",
//         email: "sales@electromart.com",
//         address: "Phase 1, Industrial Area",
//         payment_terms: "Net 30",
//         outstanding_due: 0.00,
//         total_purchases: 150000.00,
//         created_at: "2023-05-10T10:00:00Z"
//     },
//     {
//         id: "sup-2",
//         tenant_id: "tenant-1",
//         name: "Prime Bazaar",
//         gstin: "27BBBBB0000B2Z6",
//         state_code: "27",
//         phone: "+919800000002",
//         email: "orders@primebazaar.in",
//         address: "Market Road, City Center",
//         payment_terms: "Cash on Delivery",
//         outstanding_due: 1500.00,
//         total_purchases: 45000.00,
//         created_at: "2023-08-15T14:30:00Z"
//     },
//     {
//         id: "sup-3",
//         tenant_id: "tenant-1",
//         name: "Quantum Gadgets",
//         gstin: null,
//         state_code: "07",
//         phone: "+919800000003",
//         email: "b2b@quantum.com",
//         address: "Tech Park, Sector 5",
//         payment_terms: "Net 15",
//         outstanding_due: 0.00,
//         total_purchases: 12000.00,
//         created_at: "2024-01-20T09:15:00Z"
//     }
// ];

// export const MOCK_TEAM_MEMBERS: TeamMemberWithDetails[] = [
//     {
//         id: "tm-1",
//         user_id: "usr-1",
//         tenant_id: "tenant-1",
//         role: "owner",
//         invited_by: null,
//         is_active: true,
//         created_at: "2023-01-01T10:00:00Z",
//         users: { full_name: "Kartik Admin", email: "karti@karobar.in" }
//     },
//     {
//         id: "tm-2",
//         user_id: "usr-2",
//         tenant_id: "tenant-1",
//         role: "manager",
//         invited_by: "usr-1",
//         is_active: true,
//         created_at: "2023-05-15T09:30:00Z",
//         users: { full_name: "Rahul Sharma", email: "rahul.manager@karobar.in" }
//     },
//     {
//         id: "tm-3",
//         user_id: "usr-3",
//         tenant_id: "tenant-1",
//         role: "staff",
//         invited_by: "usr-2",
//         is_active: false, // Access Revoked
//         created_at: "2024-02-10T11:00:00Z",
//         users: { full_name: "Amit Kumar", email: "amit.staff@karobar.in" }
//     }
// ];

// export const MOCK_CUSTOMER_PROFILE: CustomerProfileData = {
//     id: "44444444-4444-4444-4444-444444444441",
//     tenant_id: "11111111-1111-1111-1111-111111111111",
//     user_id: null,
//     name: "Carl Evans Transport",
//     phone: "+919876543210",
//     email: "carl@example.com",
//     gstin: "22AAAAA0000A1Z5",
//     address: "Transport Nagar, Delhi",
//     state_code: "22",
//     type: "registered",
//     credit_limit: 50000.00,
//     outstanding_due: 1770.00,
//     total_purchases: 9086.00,
//     visit_count: 3,
//     last_purchase_at: "2024-05-31T10:30:00Z",
//     notes: "Key B2B Client. Allowed Net 15 credit.",
//     created_at: "2023-01-15T00:00:00Z",
//     bills: [
//         {
//             id: "bill-1",
//             tenant_id: "11111111-1111-1111-1111-111111111111",
//             customer_id: "44444444-4444-4444-4444-444444444441",
//             created_by: "usr-1",
//             bill_number: "INV-2024-001",
//             bill_date: "2024-05-31",
//             due_date: "2024-05-31",
//             status: "paid",
//             is_gst_bill: true,
//             is_interstate: false,
//             subtotal: 1000.00,
//             discount_amount: 0,
//             cgst_total: 90.00,
//             sgst_total: 90.00,
//             igst_total: 0,
//             grand_total: 1180.00,
//             amount_paid: 1180.00,
//             amount_due: 0,
//             payment_method: "upi",
//             notes: null,
//             ai_parsed: false,
//             created_at: "2024-05-31T10:30:00Z",
//             updated_at: "2024-05-31T10:30:00Z"
//         },
//         {
//             id: "bill-2",
//             tenant_id: "11111111-1111-1111-1111-111111111111",
//             customer_id: "44444444-4444-4444-4444-444444444441",
//             created_by: "usr-1",
//             bill_number: "INV-2024-003",
//             bill_date: "2024-04-15",
//             due_date: "2024-04-30",
//             status: "overdue",
//             is_gst_bill: true,
//             is_interstate: false,
//             subtotal: 4800.00,
//             discount_amount: 0,
//             cgst_total: 672.00,
//             sgst_total: 672.00,
//             igst_total: 0,
//             grand_total: 6144.00,
//             amount_paid: 4374.00,
//             amount_due: 1770.00,
//             payment_method: "mixed",
//             notes: "Pending final payment",
//             ai_parsed: false,
//             created_at: "2024-04-15T09:15:00Z",
//             updated_at: "2024-04-15T09:15:00Z"
//         }
//     ]
// };

// export const MOCK_SUPPLIER_PROFILE: SupplierProfileData = {
//         id: "77777777-7777-7777-7777-777777777771",
//         tenant_id: "11111111-1111-1111-1111-111111111111",
//         name: "Electro Mart",
//         gstin: "22AAAAA0000A1Z5",
//         state_code: "22",
//         phone: "+919800000001",
//         email: "sales@electromart.com",
//         address: "Phase 1, Industrial Area",
//         payment_terms: "Net 30",
//         outstanding_due: 1500.00,
//         total_purchases: 4500.00,
//         created_at: "2023-05-10T10:00:00Z",
//         purchase_orders: [
//             {
//                 id: "88888888-8888-8888-8888-888888888881",
//                 po_number: "PO-2024-001",
//                 order_date: "2024-05-15",
//                 status: "received",
//                 total_amount: 3000.00,
//                 amount_paid: 3000.00,
//                 amount_due: 0
//             },
//             {
//                 id: "88888888-8888-8888-8888-888888888882",
//                 po_number: "PO-2024-002",
//                 order_date: "2024-06-01",
//                 status: "sent",
//                 total_amount: 1500.00,
//                 amount_paid: 0,
//                 amount_due: 1500.00
//             }
//         ]
//     };