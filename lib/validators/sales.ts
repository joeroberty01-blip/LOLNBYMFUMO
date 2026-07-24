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
  manualItemName: z.string().trim().min(1, "Weka jina la bidhaa"),
  manualPartNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
  manualCostPrice: z.coerce.number().positive("Weka buying price zaidi ya 0"),
});

export const saleItemInputSchema = z.discriminatedUnion("isManualEntry", [
  regularItemSchema,
  manualItemSchema,
]);
export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const completeSaleSchema = z
  .object({
    branchId: z.string().min(1, "Chagua branch"),
    paymentMethod: z.enum(paymentMethods),
    isCredit: z.boolean(),
    customerId: z.string().optional(),
    items: z.array(saleItemInputSchema).min(1, "Ongeza item angalau moja kwenye cart"),
  })
  .refine((data) => !data.isCredit || !!data.customerId, {
    message: "Chagua customer kwa credit sale",
    path: ["customerId"],
  });
export type CompleteSaleInput = z.infer<typeof completeSaleSchema>;

export const manualItemFormSchema = z.object({
  manualItemName: z.string().trim().min(1, "Weka jina la bidhaa"),
  manualPartNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  quantity: z.coerce.number().int().positive("Weka quantity zaidi ya 0"),
  unitPrice: z.coerce.number().positive("Weka bei zaidi ya 0"),
  manualCostPrice: z.coerce.number().positive("Weka buying price zaidi ya 0"),
});
export type ManualItemFormInput = z.infer<typeof manualItemFormSchema>;
