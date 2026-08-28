import { z } from "zod";

export const expenseSchema = z.object({
    id: z.string().optional(),

    amount: z.number({
        error: "Amount must be a number",
    }).min(0.01, "Amount must be at least ₹1"),
    
    expense_date: z.string().min(1, "Date is required"),
    
    category_id: z.string().min(1, "Please select a valid category"),
    new_category_name: z.string().optional(),
    
    payment_method: z.enum(["cash", "upi", "card", "bank_transfer", "credit", "mixed", "cheque"], {
        error: "Please select a valid payment method",
    }),
    
    description: z.string().optional(),
    
    receipt_url: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.category_id === "other" && (!data.new_category_name || data.new_category_name.trim() === "")) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please specify the new category name",
            path: ["new_category_name"],
        });
    }
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;