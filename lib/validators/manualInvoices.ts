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

export const genuineOptions = ["", "Genuine", "Non-Genuine"] as const;

export const manualInvoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  partNumber: optionalText(),
  countryOfOrigin: optionalText(),
  stockAvailable: optionalText(),
  genuine: optionalText(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().positive("Unit price must be greater than 0"),
});
export type ManualInvoiceItemInput = z.infer<typeof manualInvoiceItemSchema>;

export const createManualInvoiceSchema = z.object({
  companyKey: z.enum(["lolnby", "woodland"]),
  docType: z.enum(["tax", "proforma", "delivery"]),
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

/** Lenient counterpart used only by "Hifadhi Draft" — a draft is work-in-progress, so nothing
 * here is required: an empty customer name, zero items, or an item with no description/price
 * yet all save fine. Finishing the invoice later goes through createManualInvoiceSchema
 * (above) as normal, which is what actually enforces completeness. */
export const draftManualInvoiceItemSchema = z.object({
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
  partNumber: optionalText(),
  countryOfOrigin: optionalText(),
  stockAvailable: optionalText(),
  genuine: optionalText(),
  quantity: z.coerce
    .number()
    .optional()
    .transform((v) => v ?? 0),
  unitPrice: z.coerce
    .number()
    .optional()
    .transform((v) => v ?? 0),
});
export type DraftManualInvoiceItemInput = z.infer<typeof draftManualInvoiceItemSchema>;

export const draftManualInvoiceSchema = z.object({
  companyKey: z.enum(["lolnby", "woodland"]),
  docType: z.enum(["tax", "proforma", "delivery"]),
  paymentMode: z.enum(manualInvoicePaymentModes),
  deliveryTime: optionalText(),
  brand: optionalText(),
  customerName: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? ""),
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
  items: z.array(draftManualInvoiceItemSchema).optional().default([]),
});
/** The *input* shape (optional keys allowed absent), not the parsed output — callers pass
 * whatever react-hook-form's getValues() returns (unvalidated, possibly-missing optional
 * fields) straight through to the server action, which parses it with draftManualInvoiceSchema
 * itself. */
export type DraftManualInvoiceInput = z.input<typeof draftManualInvoiceSchema>;
