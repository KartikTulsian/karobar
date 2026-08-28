import { PaymentMethod } from "./billing";

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
export type PurchaseRefundMethod = 'cash' | 'upi' | 'bank_transfer' | 'credit_note';
export type PurchasePaymentStatus = 'unpaid' | 'paid' | 'partial' | 'cancelled';

export interface PurchaseOrder {
    id: string;
    tenant_id: string;
    supplier_id: string;
    created_by: string;
    po_number: string;
    status: PurchaseOrderStatus;
    payment_status: PurchasePaymentStatus;
    payment_method: PaymentMethod | null;

    is_gst_supply: boolean;
    is_interstate: boolean;
    subtotal: number;
    discount_amount: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    round_off: number;

    total_amount: number;
    amount_paid: number;
    amount_due: number;
    settlement_discount: number;
    order_date: string;                // YYYY-MM-DD
    expected_date: string | null;
    received_date: string | null;
    notes: string | null;
    vehicle_no: string | null;
    reference_name: string | null;
    terms_conditions: string | null;
    created_at: string;
}

export interface PurchaseOrderWithSupplier extends PurchaseOrder {
    suppliers?: {
        name: string;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        gstin?: string | null;
    } | null;
}

export interface POLineItem {
    id: string;
    po_id: string;
    item_id: string | null;
    item_name: string;
    hsn_code: string | null;
    unit: string;
    qty_ordered: number;
    qty_received: number;
    unit_cost: number; // This becomes the Batch's buy_price

    batch_sell_price: number;

    discount_pct: number;
    gst_rate: number;
    cgst: number;
    sgst: number;
    igst: number;

    line_total: number;
    sort_order: number;
}

export interface ToPurchaseItem {
    id: string;
    tenant_id: string;
    item_id: string | null;
    item_name: string;
    supplier_id: string | null;
    qty_needed: number;
    notes: string | null;
    created_by: string;
    created_at: string;

    suppliers?: {
        name: string;
    } | null;
}

export interface PurchaseReturn {
    id: string;
    tenant_id: string;
    original_po_id: string;
    reason: string | null;
    refund_amount: number;
    refund_method: PurchaseRefundMethod | null;
    created_by: string;
    created_at: string;
}

export interface PurchaseReturnItem {
    id: string;
    purchase_return_id: string;
    po_line_item_id: string;
    item_id: string | null;
    item_name: string;
    return_qty: number;
    refund_amount: number;
}

export interface PurchaseReturnWithDetails extends PurchaseReturn {
    purchase_orders?: {
        po_number: string;
        suppliers?: {
            name: string;
        } | null;
    } | null;

    return_items?: PurchaseReturnItem[];
}

export interface PurchaseOrderDetail extends PurchaseOrderWithSupplier {
    po_line_items: POLineItem[];

    purchase_returns?: PurchaseReturnWithDetails[];
}