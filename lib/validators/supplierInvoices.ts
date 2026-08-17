import { z } from "zod";

/**
 * 4 MB. Chosen to sit under the ~4.5 MB request-body ceiling serverless platforms impose: a
 * larger cap would let the browser start an upload that the platform rejects before any of this
 * code runs, producing an opaque failure the admin cannot act on.
 */
export const MAX_INVOICE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_INVOICE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Leading bytes for each accepted format. The browser-supplied MIME type is caller-controlled,
 * so it is checked against the file's actual signature rather than trusted on its own. */
const MAGIC: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
];

/** Returns the format the bytes actually are, or null when they match none of the allowed ones. */
export function sniffInvoiceType(buf: Uint8Array): string | null {
  for (const sig of MAGIC) {
    const off = sig.offset ?? 0;
    if (buf.length < off + sig.bytes.length) continue;
    if (sig.bytes.every((b, i) => buf[off + i] === b)) {
      if (sig.mime === "image/webp") {
        // RIFF is a container; require the WEBP fourcc at offset 8 before accepting it.
        const webp = [0x57, 0x45, 0x42, 0x50];
        if (buf.length < 12 || !webp.every((b, i) => buf[8 + i] === b)) continue;
      }
      return sig.mime;
    }
  }
  return null;
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const supplierInvoiceMetaSchema = z.object({
  supplierId: z.string().min(1),
  invoiceNo: optionalText,
  invoiceDate: optionalText,
  amount: optionalText,
  notes: optionalText,
});
export type SupplierInvoiceMetaInput = z.infer<typeof supplierInvoiceMetaSchema>;
