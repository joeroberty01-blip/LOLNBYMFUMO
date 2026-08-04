import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const purchaseItemSchema = z.object({
  partId: z.string().min(1, "Chagua product"),
  quantity: z.coerce.number().int().positive("Weka quantity zaidi ya 0"),
  unitCost: z.coerce.number().positive("Weka unit cost zaidi ya 0"),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

export const creditPurchaseSchema = z.object({
  supplierName: z.string().trim().min(1, "Weka jina la supplier"),
  supplierPhone: optionalText,
  branchId: z.string().min(1, "Chagua branch"),
  purchaseDate: optionalText,
  dueDate: optionalText,
  notes: optionalText,
  items: z.array(purchaseItemSchema).min(1, "Ongeza item angalau moja"),
});
export type CreditPurchaseInput = z.infer<typeof creditPurchaseSchema>;

/** Editing a purchase only touches its due date, notes, and items — supplier and branch stay
 * fixed (changing either would mean reversing effects against one party/store and reapplying
 * against another, which is exactly what Delete + a new Credit Purchase already does). */
export const editPurchaseSchema = z.object({
  dueDate: optionalText,
  notes: optionalText,
  items: z.array(purchaseItemSchema).min(1, "Ongeza item angalau moja"),
});
export type EditPurchaseInput = z.infer<typeof editPurchaseSchema>;
