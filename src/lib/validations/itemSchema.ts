import { z } from "zod";

const guidePrice = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().min(0, "Cannot be negative").nullable().optional()
);

const openingGuide = z.preprocess(
  (v) => (v === undefined ? undefined : v === "" || v === null ? null : v),
  z.coerce.number().min(0, "Cannot be negative").nullable().optional()
);

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
    min_sell_price: guidePrice,
    max_sell_price: guidePrice,
    gst_rate: z.coerce.number().nullable().optional(),

    // Inventory
    stock_qty: z.coerce.number().int().default(0), // Used ONLY for Opening Stock batch
    low_stock_threshold: z.coerce.number().int().default(10),
    is_active: z.boolean().default(true),

    // Details
    description: z.string().nullable().optional(),
    images: z.array(z.string()).default([]), // Maps to TEXT[] in DB

    opening_buy_price: z.coerce.number().min(0, "Cannot be negative").optional(),
    opening_sell_price: z.coerce.number().min(0.01, "Sell price is required").optional(),
    opening_min_sell_price: openingGuide,
    opening_max_sell_price: openingGuide,
}).refine(
    (d) => d.min_sell_price == null || d.max_sell_price == null || d.max_sell_price >= d.min_sell_price,
    { message: "Max price cannot be less than min price", path: ["max_sell_price"] }
).refine(
    (d) => d.opening_min_sell_price == null || d.opening_max_sell_price == null || d.opening_max_sell_price >= d.opening_min_sell_price,
    { message: "Max price cannot be less than min price", path: ["opening_max_sell_price"] }
);

export type ItemFormData = z.infer<typeof itemSchema>;