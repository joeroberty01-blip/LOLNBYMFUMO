import { z } from "zod";
import { paymentMethods } from "@/lib/validators/sales";

export const expenseCategories = [
  "SUPPLIER_PAYMENT",
  "RENT",
  "SALARIES",
  "UTILITIES",
  "TRANSPORT",
  "OTHER",
] as const;

/** Categories selectable on the manual "Add Expense" form — SUPPLIER_PAYMENT is system-generated
 * only (via Record Payment on a supplier), never entered by hand. */
export const manualExpenseCategories = expenseCategories.filter((c) => c !== "SUPPLIER_PAYMENT");

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const expenseSchema = z.object({
  category: z.enum(manualExpenseCategories),
  amount: z.coerce.number().positive("Enter an amount greater than 0"),
  description: optionalText,
  paymentMethod: z.enum(paymentMethods),
  branchId: optionalText,
  date: optionalText,
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
