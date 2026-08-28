import z from "zod";

export const adjustmentBatchAllocationSchema = z.object({
  batch_id: z.string(),
  qty: z.coerce.number().min(0.001),
  buy_price: z.coerce.number().min(0),
  batch_number: z.string().nullable().optional(),
});

export const stockAdjustmentSchema = z
  .object({
    item_id: z.string().min(1, "Item ID is required"),
    item_name: z.string().optional(),

    // Strictly typing the movement identifiers
    type: z.literal("adjustment").default("adjustment"),
    reference_type: z.literal("manual_adjustment").default("manual_adjustment"),

    // The core math fields
    qty_before: z.coerce.number(),
    actual_qty: z.coerce.number().min(0, "Physical stock cannot be negative"),
    qty_change: z.coerce.number(),
    qty_after: z.coerce.number(),

    // For Negative Adjustments (Shrinkage)
    batch_allocations: z.array(adjustmentBatchAllocationSchema).default([]),

    // For Positive Adjustments (Found Stock)
    new_batch_buy_price: z.coerce.number().min(0).default(0),

    reason: z.string().min(5, "Please provide a detailed reason").max(255),
  })
  .refine(
    (data) => {
      // SECURITY RULE 1: If finding new stock, they MUST enter a value for it
      if (data.qty_change > 0 && data.new_batch_buy_price <= 0) {
        return false;
      }
      return true;
    },
    {
      message:
        "A unit cost (Buy Price) is required when adding new stock to inventory.",
      path: ["new_batch_buy_price"],
    },
  )
  .refine(
    (data) => {
      // SECURITY RULE 2: If losing stock, the batch deductions must equal the loss
      if (data.qty_change < 0) {
        const allocatedQty = data.batch_allocations.reduce(
          (sum, b) => sum + b.qty,
          0,
        );
        // Using Math.abs to compare a loss of -2 with an allocation of 2
        if (Math.abs(data.qty_change) !== allocatedQty) return false;
      }
      return true;
    },
    {
      message: "Batch allocations must exactly match the shrinkage quantity.",
      path: ["batch_allocations"],
    },
  );

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
export type AdjustmentBatchAllocation = z.infer<
  typeof adjustmentBatchAllocationSchema
>;
