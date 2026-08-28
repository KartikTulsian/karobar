import { z } from "zod";

// Schema for individual Bill/PO allocations
export const paymentAllocationSchema = z.object({
    document_id: z.string().min(1, "Document ID is required"), // Maps to bill_id or po_id in DB
    document_number: z.string().optional(), // For UI display
    document_date: z.string().optional(),   // For UI display
    amount_due: z.coerce.number().min(0).default(0), // The actual balance due on this document
    amount: z.coerce.number().min(0, "Cannot be negative"),

    discount: z.coerce.number().default(0),
}).refine(data => {
    // Ensure the total cleared (cash + discount) doesn't exceed what they actually owe
    // return (data.amount + data.discount) <= data.amount_due + 0.01; // 0.01 buffer for JS float math

    // Convert to whole numbers (paise) to completely avoid JavaScript floating-point errors
    const totalCleared = Math.round((data.amount + data.discount) * 100);
    const amountDue = Math.round(data.amount_due * 100);
    return totalCleared <= amountDue;
}, {
    message: "Applied amount + Discount cannot exceed the balance due",
    path: ["amount"]
});

export type PaymentAllocationFormData = z.infer<typeof paymentAllocationSchema>;

// Main Schema for the Payment Batch
export const paymentSchema = z.object({
    id: z.string().optional(), // For updates/cancellations
    entity_type: z.enum(["customer", "supplier"], {
        error: "Please select Customer or Supplier",
    }),
    entity_id: z.string().min(1, "Please select a party"),
    
    total_amount: z.coerce.number().min(0, "Amount cannot be nagative"),
    advance_applied: z.coerce.number().min(0, "Advance cannot be negative").default(0),

    paid_at: z.string().min(1, "Payment date is required"),
    
    method: z.enum(["cash", "upi", "card", "bank_transfer", "cheque", "mixed", "credit"]).default("cash"),
    status: z.enum(["draft", "sanctioned", "cancelled"]),
    reference_no: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    
    allocations: z.array(paymentAllocationSchema).default([]),
}).refine(data => {
    // Ensure the total allocated to bills doesn't exceed the total money received
    // const totalAllocated = data.allocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
    // Adding a 0.01 buffer for potential JS floating point math quirks
    // return totalAllocated <= data.total_amount + 0.01;

    // Convert to whole numbers to prevent JS float bugs
    const totalAmountAllocated = Math.round(data.allocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0) * 100);
    const totalAmountReceived = Math.round((data.total_amount + data.advance_applied) * 100);
    return totalAmountAllocated <= totalAmountReceived;
}, {
    message: "Total allocated amount cannot exceed the Amount Received",
    path: ["total_amount"]
});

export type PaymentFormData = z.infer<typeof paymentSchema>;