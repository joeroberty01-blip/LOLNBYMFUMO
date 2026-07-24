import { z } from "zod";

export const partSchema = z.object({
  partNumber: z.string().trim().min(1, "Weka part number"),
  oemNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  name: z.string().trim().min(1, "Weka jina la part"),
  category: z.string().trim().min(1, "Weka category"),
  unitPrice: z.coerce.number().positive("Selling price iwe zaidi ya 0"),
  costPrice: z.coerce.number().positive("Buying price iwe zaidi ya 0"),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  lowStockThreshold: z.coerce.number().int().min(0, "Isiwe hasi"),
});
export type PartInput = z.infer<typeof partSchema>;
