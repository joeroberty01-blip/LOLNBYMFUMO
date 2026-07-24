import { z } from "zod";

export const adjustmentReasons = ["NEW_STOCK", "DAMAGED", "CORRECTION", "OTHER"] as const;

export const adjustStockSchema = z.object({
  partId: z.string().min(1),
  branchId: z.string().min(1, "Chagua branch"),
  quantityChange: z.coerce
    .number()
    .int("Iwe namba kamili")
    .refine((v) => v !== 0, "Weka namba isiyokuwa sifuri"),
  reason: z.enum(adjustmentReasons),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
