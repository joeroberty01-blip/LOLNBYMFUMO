import { z } from "zod";

const optionalText = () =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const manualInvoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  partNumber: optionalText(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().positive("Unit price must be greater than 0"),
});
export type ManualInvoiceItemInput = z.infer<typeof manualInvoiceItemSchema>;

export const createManualInvoiceSchema = z.object({
  companyKey: z.enum(["lolnby", "woodland"]),
  docType: z.enum(["tax", "proforma"]),
  paymentMode: z.enum(["CASH", "CREDIT"]),
  deliveryTime: optionalText(),
  brand: optionalText(),
  customerName: z.string().trim().min(1, "Enter the customer/company name"),
  customerAddress: optionalText(),
  customerTin: optionalText(),
  customerVrn: optionalText(),
  customerPoNumber: optionalText(),
  period: optionalText(),
  bankMethod: optionalText(),
  bankAccountName: optionalText(),
  bankAccountNumber: optionalText(),
  authorizedBy: optionalText(),
  traReceiptNo: optionalText(),
  notes: optionalText(),
  items: z.array(manualInvoiceItemSchema).min(1, "Add at least one item"),
});
export type CreateManualInvoiceInput = z.infer<typeof createManualInvoiceSchema>;
