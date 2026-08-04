import { z } from "zod";

export const paymentMethods = ["CASH", "BANK_NMB", "BANK_CRDB", "VODA_LIPA", "TIGO_LIPA"] as const;

const regularItemSchema = z.object({
  isManualEntry: z.literal(false),
  partId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  /** Which store this specific line's stock comes from — a cart can freely mix items from any
   * store, so this is tracked per item. Falls back to the sale's branch/sourceBranchId when
   * not set. */
  branchId: z.string().min(1).optional(),
});

const manualItemSchema = z.object({
  isManualEntry: z.literal(true),
  manualItemName: z.string().trim().min(1, "Enter the product name"),
  manualPartNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  manualCostPrice: z.coerce.number().positive("Enter a buying price greater than 0"),
});

export const saleItemInputSchema = z.discriminatedUnion("isManualEntry", [
  regularItemSchema,
  manualItemSchema,
]);
export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const completeSaleSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  /** Store inventory is actually deducted from. Defaults to branchId (the common case: sell
   * and fulfill at the same place) — only differs when a selling point is fulfilling a sale
   * from a warehouse store's stock. */
  sourceBranchId: z.string().min(1).optional(),
  paymentMethod: z.enum(paymentMethods),
  isCredit: z.boolean(),
  /** Every sale — cash or credit — is now tied to a customer, captured before the cashier can
   * start adding items to the cart. */
  customerId: z.string().min(1, "Select a customer"),
  items: z.array(saleItemInputSchema).min(1, "Add at least one item to the cart"),
});
export type CompleteSaleInput = z.infer<typeof completeSaleSchema>;

/** Editing an existing sale is deliberately narrower than creating one: the part/branch on each
 * line stays fixed (only quantity/unitPrice can change), and no items can be added or removed —
 * changing which parts were sold after the fact is exactly what void + a new sale is for. */
export const editSaleItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Weka quantity zaidi ya 0"),
  unitPrice: z.coerce.number().positive("Weka bei zaidi ya 0"),
});

export const editSaleSchema = z.object({
  createdAt: z.string().min(1, "Chagua tarehe na muda"),
  customerId: z.string().min(1, "Chagua customer"),
  paymentMethod: z.enum(paymentMethods),
  isCredit: z.boolean(),
  items: z.array(editSaleItemSchema).min(1),
});
export type EditSaleInput = z.infer<typeof editSaleSchema>;

export const manualItemFormSchema = z.object({
  manualItemName: z.string().trim().min(1, "Enter the product name"),
  manualPartNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  quantity: z.coerce.number().int().positive("Enter a quantity greater than 0"),
  unitPrice: z.coerce.number().positive("Enter a price greater than 0"),
  manualCostPrice: z.coerce.number().positive("Enter a buying price greater than 0"),
});
export type ManualItemFormInput = z.infer<typeof manualItemFormSchema>;
