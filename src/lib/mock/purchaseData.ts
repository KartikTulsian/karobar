// // src/lib/mock/purchasesData.ts
// import { PurchaseOrderWithSupplier, PurchaseReturnWithDetails, ToPurchaseItem } from '@/types/purchases';

// export const MOCK_TO_PURCHASE_LIST: ToPurchaseItem[] = [
//     {
//         id: "tp-1",
//         tenant_id: "tenant-1",
//         item_id: "item-1",
//         item_name: "Engine Oil 5W-30 1L",
//         supplier_id: "sup-1",
//         qty_needed: 20,
//         notes: "Urgent, stock is low",
//         created_by: "user-1",
//         created_at: "2024-06-01T10:00:00Z",
//         suppliers: { name: "Electro Mart" }
//     },
//     {
//         id: "tp-2",
//         tenant_id: "tenant-1",
//         item_id: "item-2",
//         item_name: "Brake Fluid 500ml",
//         supplier_id: "sup-1",
//         qty_needed: 15,
//         notes: null,
//         created_by: "user-1",
//         created_at: "2024-06-01T10:05:00Z",
//         suppliers: { name: "Electro Mart" }
//     },
//     {
//         id: "tp-3",
//         tenant_id: "tenant-1",
//         item_id: "item-3",
//         item_name: "Maruti Swift Air Filter",
//         supplier_id: "sup-2",
//         qty_needed: 10,
//         notes: null,
//         created_by: "user-1",
//         created_at: "2024-06-01T11:00:00Z",
//         suppliers: { name: "Prime Bazaar" }
//     },
//     {
//         id: "tp-4",
//         tenant_id: "tenant-1",
//         item_id: null, // Custom item not in database yet
//         item_name: "Cleaning Rags (Bulk)",
//         supplier_id: null, // Unassigned supplier
//         qty_needed: 5,
//         notes: "Need good quality cotton",
//         created_by: "user-1",
//         created_at: "2024-06-01T12:00:00Z",
//         suppliers: null
//     }
// ];

// export const MOCK_PURCHASE_ORDERS: PurchaseOrderWithSupplier[] = [
//     {
//         id: "po-1",
//         tenant_id: "tenant-1",
//         supplier_id: "sup-1",
//         created_by: "user-1",
//         po_number: "PO-2024-001",
//         status: "received",
//         total_amount: 1000.00,
//         amount_paid: 1000.00,
//         amount_due: 0.00,
//         order_date: "2024-12-24",
//         expected_date: "2024-12-26",
//         received_date: "2024-12-25",
//         notes: null,
//         created_at: "2024-12-24T10:00:00Z",
//         suppliers: { name: "Electro Mart" }
//     },
//     {
//         id: "po-2",
//         tenant_id: "tenant-1",
//         supplier_id: "sup-2",
//         created_by: "user-1",
//         po_number: "PO-2024-002",
//         status: "sent", // Acting as 'Pending' in the UI
//         total_amount: 1500.00,
//         amount_paid: 0.00,
//         amount_due: 1500.00,
//         order_date: "2024-12-10",
//         expected_date: "2024-12-15",
//         received_date: null,
//         notes: "Waiting on delivery",
//         created_at: "2024-12-10T11:30:00Z",
//         suppliers: { name: "Quantum Gadgets" }
//     },
//     {
//         id: "po-3",
//         tenant_id: "tenant-1",
//         supplier_id: "sup-3",
//         created_by: "user-1",
//         po_number: "PO-2024-003",
//         status: "partial",
//         total_amount: 2000.00,
//         amount_paid: 1000.00,
//         amount_due: 1000.00,
//         order_date: "2024-11-18",
//         expected_date: "2024-11-20",
//         received_date: "2024-11-21",
//         notes: "Half payment made upfront",
//         created_at: "2024-11-18T09:15:00Z",
//         suppliers: { name: "Gadget World" }
//     }
// ];

// export const MOCK_PURCHASE_RETURNS: PurchaseReturnWithDetails[] = [
//     {
//         id: "pr-1",
//         tenant_id: "tenant-1",
//         original_po_id: "po-1",
//         reason: "Received 5 damaged brake fluid bottles.",
//         refund_amount: 500.00,
//         refund_method: "bank_transfer",
//         created_by: "user-1",
//         created_at: "2024-12-26T14:30:00Z",
//         purchase_orders: {
//             po_number: "PO-2024-001",
//             suppliers: { name: "Electro Mart" }
//         }
//     },
//     {
//         id: "pr-2",
//         tenant_id: "tenant-1",
//         original_po_id: "po-3",
//         reason: "Wrong part numbers delivered.",
//         refund_amount: 1000.00,
//         refund_method: "credit_note",
//         created_by: "user-1",
//         created_at: "2024-11-22T09:15:00Z",
//         purchase_orders: {
//             po_number: "PO-2024-003",
//             suppliers: { name: "Gadget World" }
//         }
//     }
// ];