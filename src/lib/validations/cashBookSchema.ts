import {z} from "zod";

export const cashBookSchema = z.object({
    id: z.string().optional(),
    
    type: z.enum(['in', 'out'], {
        error: "Please select a valid payment method",
    }),
    
    amount: z.number({
        error: "Amount must be a valid number",
    }).min(0.01, "Amount must be greater than ₹0"),
    
    entry_date: z.string().min(1, "Date is required"),

    payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card'], {
        error: "Payment method is required"
    }),

    reference_type: z.enum(['manual', 'single_sale', 'multi_sale', 'single_purchase', 'multi_purchase','expense', 'advance_receipt', 'advance_payment', 'sales_return', 'purchase_return']),
    reference_id: z.string().uuid().nullable().optional().or(z.literal("")), // Nullable for 'manual'
    
    description: z.string().min(2, "Please provide a brief description"),
}).refine(data => {
    // If not manual, reference_id must be provided
    if (data.reference_type !== 'manual') {
        return !!data.reference_id && data.reference_id.length > 0;
    }
    return true;
}, {
    message: "Please select the associated record",
    path: ["reference_id"]
});

export type CashBookFormData = z.infer<typeof cashBookSchema>;