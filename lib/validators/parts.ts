import { z } from "zod";

/** A real part name always has at least one recognizable word (3+ letters in a row) — a bare
 * code like "13572-17021" or "16401-62100" does not. Catches Part Number and Name having been
 * entered/swapped into the wrong field, at the one point (this shared schema) every path that
 * writes a Part — the Add/Edit form and the bulk-upload wizard (lib/bulk/classify.ts) — funnels
 * through. "-" is exempt: it's the agreed placeholder for a genuinely nameless catalog entry. */
export function looksLikeBareCode(name: string): boolean {
  return name !== "-" && !/[A-Za-z]{3,}/.test(name);
}

export const partSchema = z.object({
  partNumber: z.string().trim().min(1, "Weka part number"),
  oemNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  name: z
    .string()
    .trim()
    .min(1, "Weka jina la part")
    .refine((v) => !looksLikeBareCode(v), {
      message:
        'Hii inaonekana ni part number/code, si jina la bidhaa — hakikisha Part Number na Name hazijabadilishana nafasi (tumia "-" kama part hii kwa kweli haina jina)',
    }),
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

/** Create-only: lets the admin stock the new part in one step instead of saving it and then
 * making a separate stock adjustment. Not part of partSchema because editing a part must never
 * silently overwrite stock — changing quantity later goes through adjustStock, which records a
 * StockAdjustment and an audit entry. */
export const createPartSchema = partSchema.extend({
  openingQuantity: z.coerce.number().int().min(0, "Isiwe hasi").optional(),
  openingBranchId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});
export type CreatePartInput = z.infer<typeof createPartSchema>;
