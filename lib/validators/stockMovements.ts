import { z } from "zod";

export const stockMovementTypes = ["STOCK_IN", "STOCK_OUT"] as const;

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const stockMovementSchema = z.object({
  movementType: z.enum(stockMovementTypes),
  branchId: z.string().trim().min(1, "Chagua branch"),
  itemName: z.string().trim().min(1, "Weka jina la item"),
  partNumber: z.string().trim().min(1, "Weka part number"),
  quantity: z.coerce.number().int().positive("Quantity iwe zaidi ya 0"),
  personName: z.string().trim().min(1, "Weka jina la mtu"),
  description: optionalText,
});
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
