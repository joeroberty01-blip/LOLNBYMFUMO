import { z } from "zod";
import { partSchema } from "@/lib/validators/parts";

export const convertManualItemSchema = partSchema.extend({
  branchId: z.string().min(1, "Chagua branch"),
  initialQuantity: z.coerce.number().int().min(0, "Isiwe hasi"),
});
export type ConvertManualItemInput = z.infer<typeof convertManualItemSchema>;
