import { z } from "zod";

export const purchaseReturnItemSchema = z.object({
    po_line_item_id: z.string(),
    item_id: z.string().nullable().optional(),
    item_name: z.string(),
    received_qty: z.number(), // The max quantity they are allowed to return
    unit_cost: z.number(),
    gst_rate: z.number(),
    discount_pct: z.coerce.number().min(0).max(100).default(0),

    // Interactive parts
    return_qty: z.coerce.number().min(0, "Cannot be negative"),
    refund_total: z.number().default(0),
});

export const purchaseReturnSchema = z.object({
  id: z.string().optional(),
  original_po_id: z.string().min(1, "Please select an original purchase order"),
  reason: z.string().nullable().optional(),
  
  refund_method: z.enum(["cash", "upi", "bank_transfer", "credit_note"], {
    error: "Please select a refund method"
  }),
  
  // Calculated fields
  refund_amount: z.coerce.number().min(0.01, "Refund amount must be greater than 0"),
  
  // Frontend tracking for calculations
  return_items: z.array(purchaseReturnItemSchema).min(1, "At least one item must be returned"),
});

export type PurchaseReturnFormData = z.infer<typeof purchaseReturnSchema>;