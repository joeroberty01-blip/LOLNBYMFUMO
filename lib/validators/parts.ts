import { z } from "zod";

/** A real part name has at least one letter somewhere — a bare numeric/punctuation code like
 * "13572-17021" or "16401-62100" (the two confirmed real-world cases of Part Number and Name
 * having been swapped) has none at all. Deliberately loose: this business's real part names are
 * often short brand/engine-code abbreviations mixing a couple of letters with digits (e.g.
 * "GP 1HZ", "1TR/2TR") — those are genuine, if terse, names and must not be rejected just for
 * lacking a long word. Catches an accidental Part Number/Name swap at the one point (this shared
 * schema) every path that writes a Part — the Add/Edit form and the bulk-upload wizard
 * (lib/bulk/classify.ts) — funnels through.
 *
 * Two deliberate exceptions, so a genuine swap (Name and Part Number holding two DIFFERENT bare
 * codes) is still caught while an intentional "this part has no separate name" entry is not:
 *   - Name is exactly "-" (an explicit "no name" marker), or
 *   - Name equals the Part Number exactly (reusing the same brief code in both fields on
 *     purpose, rather than fabricating a description that doesn't exist in the source data). */
export function looksLikeBareCode(name: string, partNumber?: string): boolean {
  if (name === "-") return false;
  if (partNumber && name.trim().toLowerCase() === partNumber.trim().toLowerCase()) return false;
  return !/[A-Za-z]/.test(name);
}

/** Base shape without the cross-field swap check, so createPartSchema can still .extend() it —
 * Zod's refine/superRefine wrapper doesn't support .extend(), so the check is applied to each
 * final schema separately (see bareCodeCheck below) instead of baked into this base object. */
const basePartObject = z.object({
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

function bareCodeCheck(data: { name: string; partNumber: string }, ctx: z.RefinementCtx) {
  if (looksLikeBareCode(data.name, data.partNumber)) {
    ctx.addIssue({
      code: "custom",
      path: ["name"],
      message:
        'Hii inaonekana ni part number/code, si jina la bidhaa — hakikisha Part Number na Name hazijabadilishana nafasi (tumia "-" kama part hii kwa kweli haina jina)',
    });
  }
}

export const partSchema = basePartObject.superRefine(bareCodeCheck);
export type PartInput = z.infer<typeof partSchema>;

/** Create-only: lets the admin stock the new part in one step instead of saving it and then
 * making a separate stock adjustment. Not part of partSchema because editing a part must never
 * silently overwrite stock — changing quantity later goes through adjustStock, which records a
 * StockAdjustment and an audit entry. */
export const createPartSchema = basePartObject
  .extend({
    openingQuantity: z.coerce.number().int().min(0, "Isiwe hasi").optional(),
    openingBranchId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine(bareCodeCheck);
export type CreatePartInput = z.infer<typeof createPartSchema>;
