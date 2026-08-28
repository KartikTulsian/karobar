import z from "zod";

export const poLineItemSchema = z.object({
  id: z.string().optional(), 
  item_id: z.string().nullable().optional(), 
  item_name: z.string().min(1, "Item name is required"),
  hsn_code: z.string().nullable().optional(),
  unit: z.string().default("Pcs"),
  
  qty_ordered: z.coerce.number().min(0.001, "Quantity must be greater than 0"),
  qty_received: z.coerce.number().default(0),
  unit_cost: z.coerce.number().min(0, "Cost cannot be negative"),
  batch_sell_price: z.coerce.number().min(0, "Sell price cannot be negative").default(0),
  
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  gst_rate: z.coerce.number().min(0).default(0),

  // Calculated Fields
  cgst: z.coerce.number().default(0),
  sgst: z.coerce.number().default(0),
  igst: z.coerce.number().default(0),
  line_total: z.coerce.number().default(0),
  sort_order: z.coerce.number().int().default(0),
});

export type POLineItemFormData = z.infer<typeof poLineItemSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string().optional(), 

  po_number: z.string().optional(),
  supplier_id: z.string().min(1, "Please select a supplier"),

  // Dates
  order_date: z.string().min(1, "Order date is required"),
  expected_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),

  vehicle_no: z.string().nullable().optional(),
  reference_name: z.string().nullable().optional(),
  terms_conditions: z.string().nullable().optional(),

  // Status & Toggles
  status: z.enum(['draft', 'sent', 'partial', 'received', 'cancelled'], {
      error: "Please select a PO status"
  }),
  payment_status: z
      .enum(["unpaid", "paid", "partial", "cancelled"], {
          error: "Please select a Payment status"
      }),
  payment_method: z
      .enum(["cash", "upi", "card", "credit", "mixed", "bank_transfer", "cheque"])
      .default("cash"),
  is_gst_supply: z.boolean().default(false),
  is_interstate: z.boolean().default(false),

  // Totals (Calculated dynamically)
  subtotal: z.coerce.number().min(0).default(0),
  round_off: z.coerce.number().default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  cgst_total: z.coerce.number().min(0).default(0),
  sgst_total: z.coerce.number().min(0).default(0),
  igst_total: z.coerce.number().min(0).default(0),
  total_amount: z.coerce.number().min(0).default(0), // Maps to grand_total

  // Payments
  amount_paid: z.coerce.number().min(0).default(0),
  amount_due: z.coerce.number().min(0).default(0),

  notes: z.string().nullable().optional(),
  
  po_line_items: z.array(poLineItemSchema).min(1, "Add at least one item"),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;