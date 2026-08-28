import { z } from "zod";

export const returnBatchAllocationSchema = z.object({
  batch_id: z.string().min(1, "Batch ID is required"),
  qty: z.coerce.number().min(0, "Return quantity cannot be negative"),
  buy_price: z.coerce.number().min(0),
  batch_number: z.string().nullable().optional(),
});

export const returnItemSchema = z.object({
  bill_line_item_id: z.string(),
  item_id: z.string().nullable().optional(),
  item_name: z.string(),
  purchased_qty: z.number(),
  unit_price: z.number(),
  gst_rate: z.number(),
  discount_pct: z.coerce.number().min(0).max(100).default(0),

  // The interactive parts
  return_qty: z.coerce.number().min(0, "Cannot be negative"),
  refund_total: z.number().default(0),
  write_off_recovery: z.coerce.number().default(0),

  return_batch_allocations: z.array(returnBatchAllocationSchema).default([]),
});

export const salesReturnSchema = z.object({
  id: z.string().optional(),
  original_bill_id: z.string().min(1, "Please select an original bill"),
  reason: z.string().nullable().optional(),

  refund_method: z.enum(["cash", "upi", "credit_note", "bank_transfer"], {
    error: "Please select a refund method"
  }),

  // Calculated fields
  refund_amount: z.coerce.number().min(0.01, "Refund amount must be greater than 0"),

  // Frontend tracking for calculations
  return_items: z.array(returnItemSchema).min(1, "At least one item must be returned"),
});

export type SalesReturnFormData = z.infer<typeof salesReturnSchema>;