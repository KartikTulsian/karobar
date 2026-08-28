import { z } from "zod";

export const itemSchema = z.object({
    id: z.string().optional(), // Optional during creation
    name: z.string().min(2, "Product name must be at least 2 characters"),
    sku: z.string().nullable().optional(),

    // Foreign Keys (Nullable if left blank)
    category_id: z.string().nullable().optional(),
    brand_id: z.string().nullable().optional(),

    unit: z.string().default("Pcs"),
    barcode: z.string().nullable().optional(),
    hsn_code: z.string().nullable().optional(),

    // Pricing
    buy_price: z.coerce.number().min(0, "Cannot be negative").optional(), // Used ONLY for Opening Stock batch
    default_sell_price: z.coerce.number().min(0.01, "Sell price is required"), // NOT NULL in DB
    gst_rate: z.coerce.number().nullable().optional(),

    // Inventory
    stock_qty: z.coerce.number().int().default(0), // Used ONLY for Opening Stock batch
    low_stock_threshold: z.coerce.number().int().default(10),
    is_active: z.boolean().default(true),

    // Details
    description: z.string().nullable().optional(),
    images: z.array(z.string()).default([]), // Maps to TEXT[] in DB
});

export type ItemFormData = z.infer<typeof itemSchema>;