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

/** The five fields the Credit Purchase "New Product" modal asks for. Built by narrowing
 * basePartObject and re-applying the check, NOT by `partSchema.pick(...)` — Zod refuses `.pick()`
 * on a schema that already carries refinements and throws at module-evaluation time, which took
 * the whole Credit Purchase client chunk down with it. */
export const quickPartSchema = basePartObject
  .pick({ partNumber: true, name: true, category: true, costPrice: true, unitPrice: true })
  .superRefine(bareCodeCheck);
export type QuickPartInput = z.infer<typeof quickPartSchema>;

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

/** Edit-only: which store this part's stock should live in. `fromBranchId` is the store row the
 * admin opened the part from (a part can hold stock in several stores at once, so the page has to
 * say which one it is editing); `toBranchId` is where they want it. Both are optional because a
 * part that has no stock anywhere yet has no store to move from. */
export const editPartSchema = basePartObject
  .extend({
    fromBranchId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    toBranchId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine(bareCodeCheck);
export type EditPartInput = z.infer<typeof editPartSchema>;

/** The shape PartForm binds to. It carries the extra fields of BOTH modes because one component
 * renders both; whichever action receives it re-validates with its own schema, and Zod drops the
 * keys that schema doesn't declare. */
export const partFormSchema = basePartObject
  .extend({
    openingQuantity: z.coerce.number().int().min(0, "Isiwe hasi").optional(),
    openingBranchId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    fromBranchId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    toBranchId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine(bareCodeCheck);
