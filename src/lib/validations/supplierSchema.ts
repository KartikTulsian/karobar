import { z } from "zod";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const phoneRegex = /^\d{10}$/;

export const supplierSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Supplier Name must be at least 2 characters"),
    company_name: z.string().optional(),

    // Contact Info
    country_code: z.string().default("+91"),
    phone: z.string()
        .regex(phoneRegex, "Phone number must be exactly 10 digits")
        .optional()
        .or(z.literal("")),
    email: z.string().email("Invalid email format").optional().or(z.literal("")),

    // Business/Tax Info
    gstin: z.string()
        .regex(gstinRegex, "Invalid GSTIN format")
        .optional()
        .or(z.literal("")),

    // Address Info
    address: z.string().optional(),
    city: z.string().optional(),
    state_code: z.string().length(2, "State code must be exactly 2 digits (e.g., 27)").optional().or(z.literal("")),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid Indian Pincode").optional().or(z.literal("")),
    country: z.string().default("India"),

    // Financial & Metadata
    payment_terms: z.string().optional(),

    outstanding_due: z.number().min(0, "Opening due cannot be negative").default(0).optional(),
    advance_balance: z.number().min(0, "Opening advance cannot be negative").default(0).optional(),
    reduce_amount: z.number().min(0, "Reduce amount cannot be negative").default(0).optional(),
    
    notes: z.string().optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;