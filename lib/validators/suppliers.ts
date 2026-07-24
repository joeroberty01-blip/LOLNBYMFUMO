import { z } from "zod";
import { paymentMethods } from "@/lib/validators/sales";

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Weka jina la supplier"),
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  balance: z.coerce.number().min(0, "Isiwe hasi"),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const recordPaymentSchema = z.object({
  supplierId: z.string().min(1),
  amount: z.coerce.number().positive("Weka amount zaidi ya 0"),
  paymentMethod: z.enum(paymentMethods),
  branchId: optionalText,
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
