import { z } from "zod";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const phoneRegex = /^\d{10}$/;

export const tenantSchema = z.object({
    name: z.string().min(2, "Business name must be at least 2 characters."),
    email: z.string().email("Invalid email format").optional().or(z.literal("")),
    
    country_code: z.string().default("+91"),
    phone: z.string().regex(phoneRegex, "Phone number must be exactly 10 digits").optional().or(z.literal("")),
    
    gstin: z.string().regex(gstinRegex, "Invalid GSTIN format").optional().or(z.literal("")),
    state_code: z.string().length(2, "State code must be exactly 2 digits (e.g., 27)").optional().or(z.literal("")),
    
    address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid Indian Pincode").optional().or(z.literal("")),
    country: z.string().default("India"),
    logo_url: z.string().optional().nullable(),
});

export type TenantFormData = z.infer<typeof tenantSchema>;