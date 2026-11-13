import { z } from "zod";

export const toPurchaseSchema = z.object({
    id: z.string().optional(),
    item_id: z.string().nullable().optional(), // Null if it's a custom/new item
    item_name: z.string().min(1, "Item name is required"),
    qty_needed: z.coerce.number().min(0.1, "Quantity must be greater than 0").multipleOf(0.001, "Use at most 3 decimal places"),
    supplier_id: z.string().nullable().optional().or(z.literal("")), // Allows "Unassigned"
    notes: z.string().nullable().optional(),
});

export type ToPurchaseFormData = z.infer<typeof toPurchaseSchema>;