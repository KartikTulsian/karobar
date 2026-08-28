import { CustomerType } from "./people";

export type BillStatus = 'draft' | 'issued' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit' | 'mixed' | 'bank_transfer' | 'cheque';
export type RefundMethod = 'cash' | 'upi' | 'credit_note' | 'bank_transfer';

export interface Bill {
    id: string;
    tenant_id: string;
    customer_id: string;
    created_by: string;
    bill_number: string;
    bill_date: string; // ISO date string
    due_date: string | null;
    status: BillStatus;
    is_gst_bill: boolean;
    is_interstate: boolean;
    subtotal: number;
    discount_amount: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    grand_total: number;
    amount_paid: number;
    amount_due: number;
    settlement_discount: number;
    total_profit: number;
    round_off: number;
    payment_method: PaymentMethod;
    notes: string | null;
    ai_parsed: boolean;
    vehicle_no: string | null;
    reference_name: string | null;
    terms_conditions: string | null;
    created_at: string;
    updated_at: string;
}

export interface BillWithCustomer extends Bill {
    customers: {
        name: string;
        type: CustomerType;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        gstin?: string | null;
    };
}

export interface SalesReturn {
    id: string;
    tenant_id: string;
    original_bill_id: string;
    credit_note_bill_id?: string;
    reason?: string | null;
    refund_amount: number;
    refund_method: RefundMethod;
    created_by: string;
    created_at: string;
}

export interface SalesReturnItem {
    id: string;
    sales_return_id: string;
    bill_line_item_id: string;
    item_id: string | null;
    return_qty: number;
    refund_amount: number;
    return_batch_allocations: BatchAllocation[];
    write_off_recovery: number;
}

export interface BatchAllocation {
    batch_id: string;
    qty: number;
    buy_price: number;
    batch_number?: string | null;
}

export interface BillLineItem {
    id: string;
    bill_id: string;
    item_id: string | null;
    item_name: string;
    hsn_code: string | null;
    unit: string;
    qty: number;
    unit_price: number;

    total_buy_price: number;
    line_profit: number;
    batch_allocations: BatchAllocation[];
    write_off_recovery: number;

    discount_pct: number;
    gst_rate: number;
    cgst: number;
    sgst: number;
    igst: number;
    line_total: number;
    sort_order: number;
}

export interface BillDetail extends BillWithCustomer {
    bill_line_items: BillLineItem[];

    sales_returns?: SalesReturnWithItems[];
}

export interface SalesReturnWithDetails {
    id: string;
    tenant_id: string;
    original_bill_id: string;
    credit_note_bill_id?: string;
    reason: string | null;
    refund_amount: number;
    refund_method: RefundMethod; // from your existing Enum
    created_by: string;
    created_at: string;
    
    // The joined data from the bills and customers tables
    bills: {
        bill_number: string;
        customers: {
            name: string;
            type: CustomerType;
        };
    };

    sales_return_items: SalesReturnItem[];
}

export interface SalesReturnWithItems extends SalesReturn {
    sales_return_items: SalesReturnItem[];
}