import { z } from "zod";
import { paymentMethods } from "@/lib/validators/sales";

/** Same payment channels as a POS Sale (lib/validators/sales.ts), plus CREDIT — an external
 * company invoice can also just be "on credit" rather than paid through any particular
 * channel. Kept as one flat enum (not split into method + isCredit like Sale) since a
 * ManualInvoice is a document, not a ledger entry. */
export const manualInvoicePaymentModes = [...paymentMethods, "CREDIT"] as const;
export const MANUAL_INVOICE_PAYMENT_LABELS: Record<(typeof manualInvoicePaymentModes)[number], string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
  CREDIT: "Credit",
};

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
  paymentMode: z.enum(manualInvoicePaymentModes),
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
