import { sniffInvoiceType } from "@/lib/validators/supplierInvoices";

/** Same ceiling as supplier invoices (lib/validators/supplierInvoices.ts) — under the ~4.5 MB
 * request-body limit serverless platforms impose. */
export const MAX_PART_PHOTO_BYTES = 4 * 1024 * 1024;

export const ALLOWED_PART_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Reuses the invoice sniffer's magic-byte checks (it already covers jpeg/png/webp) — a part
 * photo just never accepts the pdf signature it also recognises. */
export function sniffPartPhotoType(buf: Uint8Array): string | null {
  const type = sniffInvoiceType(buf);
  if (!type) return null;
  return (ALLOWED_PART_PHOTO_TYPES as readonly string[]).includes(type) ? type : null;
}
