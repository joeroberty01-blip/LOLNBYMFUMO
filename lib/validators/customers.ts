import { z } from "zod";
import { paymentMethods } from "@/lib/validators/sales";

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const quickCustomerSchema = z.object({
  name: z.string().trim().min(1, "Weka jina la customer"),
  phone: optionalText,
  email: optionalText,
});
export type QuickCustomerInput = z.infer<typeof quickCustomerSchema>;

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Weka jina la customer"),
  phone: optionalText,
  email: optionalText,
  creditLimit: z.coerce.number().min(0, "Isiwe hasi"),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const recordCustomerPaymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.coerce.number().positive("Weka amount zaidi ya 0"),
  paymentMethod: z.enum(paymentMethods),
  branchId: optionalText,
});
export type RecordCustomerPaymentInput = z.infer<typeof recordCustomerPaymentSchema>;
