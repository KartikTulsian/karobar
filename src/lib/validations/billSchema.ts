import z from "zod";

export const batchAllocationSchema = z.object({
    batch_id: z.string().min(1, "Batch ID is required"),
    qty: z.coerce.number().min(0.001, "Allocation quantity must be greater than 0"),
    buy_price: z.coerce.number().min(0),
    batch_number: z.string().nullable().optional(),
});

export const billLineItemSchema = z.object({
  id: z.string().optional(), // Optional for new items
  item_id: z.string().nullable().optional(), // Nullable for "Flying/Custom" items not in inventory
  item_name: z.string().min(1, "Item name is required"),
  hsn_code: z.string().nullable().optional(),
  unit: z.string().default("Pcs"),

  qty: z.coerce.number().min(0.001, "Quantity must be greater than 0"),
  unit_price: z.coerce.number().min(0, "Price cannot be negative"),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  gst_rate: z.coerce.number().min(0).default(0),

  total_buy_price: z.coerce.number().default(0),
  line_profit: z.coerce.number().default(0),
  batch_allocations: z.array(batchAllocationSchema).default([]),
  write_off_recovery: z.coerce.number().default(0),

  // Calculated Fields (These will be auto-calculated in the form,
  // but must be strictly typed for submission to the database)
  cgst: z.coerce.number().default(0),
  sgst: z.coerce.number().default(0),
  igst: z.coerce.number().default(0),
  line_total: z.coerce.number().default(0),
  sort_order: z.coerce.number().int().default(0),
});

export type BillLineItemFormData = z.infer<typeof billLineItemSchema>;

export const billSchema = z.object({
  id: z.string().optional(), // Optional for new bills

  bill_number: z.string().optional(), 
  created_by: z.string().optional(),

  //Customer Handling
  customer_type: z.enum(['registered', 'flying'], {
    error: "Plese select a Customer Type",
  }),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_id: z.string().optional(),

  //Dates
  bill_date: z.string().min(1, "Bill date is required"),
  due_date: z.string().nullable().optional(),

  vehicle_no: z.string().nullable().optional(),
  reference_name: z.string().nullable().optional(),
  terms_conditions: z.string().nullable().optional(),

  // Status & Toggles
  status: z
    .enum(["draft", "issued", "paid", "partial", "overdue", "cancelled"], {
        error: "Please select a bill status"
    }),
  is_gst_bill: z.boolean().default(false),
  is_interstate: z.boolean().default(false),

  // Totals (Calculated dynamically in the form based on line items)
  subtotal: z.coerce.number().min(0).default(0),
  round_off: z.coerce.number().default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  cgst_total: z.coerce.number().min(0).default(0),
  sgst_total: z.coerce.number().min(0).default(0),
  igst_total: z.coerce.number().min(0).default(0),
  grand_total: z.coerce.number().min(0).default(0),

  total_profit: z.coerce.number().default(0),

  // Payments
  amount_paid: z.coerce.number().min(0).default(0),
  amount_due: z.coerce.number().min(0).default(0),
  payment_method: z
    .enum(["cash", "upi", "card", "credit", "mixed", "bank_transfer", "cheque"])
    .default("cash"),

  // Extras
  notes: z.string().nullable().optional(),

  // Array of Line Items
  bill_line_items: z
    .array(billLineItemSchema)
    .min(1, "At least one item must be added to the bill"),
});

export type BillFormData = z.infer<typeof billSchema>;