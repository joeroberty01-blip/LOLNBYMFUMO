import { z } from "zod";

export const paymentMethods = ["CASH", "BANK_NMB", "BANK_CRDB", "VODA_LIPA", "TIGO_LIPA"] as const;

const regularItemSchema = z.object({
  isManualEntry: z.literal(false),
  partId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
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

export const completeSaleSchema = z
  .object({
    branchId: z.string().min(1, "Select a branch"),
    /** Store inventory is actually deducted from. Defaults to branchId (the common case: sell
     * and fulfill at the same place) — only differs when a selling point is fulfilling a sale
     * from a warehouse store's stock. */
    sourceBranchId: z.string().min(1).optional(),
    paymentMethod: z.enum(paymentMethods),
    isCredit: z.boolean(),
    customerId: z.string().optional(),
    items: z.array(saleItemInputSchema).min(1, "Add at least one item to the cart"),
  })
  .refine((data) => !data.isCredit || !!data.customerId, {
    message: "Select a customer for a credit sale",
    path: ["customerId"],
  });
export type CompleteSaleInput = z.infer<typeof completeSaleSchema>;

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
