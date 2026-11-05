import { z } from "zod";

export const manualInvoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  partNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().positive("Unit price must be greater than 0"),
});
export type ManualInvoiceItemInput = z.infer<typeof manualInvoiceItemSchema>;

export const createManualInvoiceSchema = z.object({
  companyKey: z.enum(["lolnby", "woodland"]),
  docType: z.enum(["tax", "proforma"]),
  paymentMode: z.enum(["CASH", "CREDIT"]),
  deliveryTime: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  brand: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  customerName: z.string().trim().min(1, "Enter the customer/company name"),
  customerAddress: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  customerTin: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  customerVrn: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  customerPoNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  traReceiptNo: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  notes: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  items: z.array(manualInvoiceItemSchema).min(1, "Add at least one item"),
});
export type CreateManualInvoiceInput = z.infer<typeof createManualInvoiceSchema>;
