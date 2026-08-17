"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  MAX_INVOICE_BYTES,
  ALLOWED_INVOICE_TYPES,
  sniffInvoiceType,
  supplierInvoiceMetaSchema,
} from "@/lib/validators/supplierInvoices";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

/** Strips any directory component, control characters and quotes. The filename is echoed back in
 * a Content-Disposition header on download, so it must not carry path separators or anything that
 * could break out of the header value. */
function safeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "invoice";
  const cleaned = base
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 0x20 || code === 0x7f) return false;
      return ch !== '"' && ch !== "\\";
    })
    .join("")
    .trim();
  return (cleaned || "invoice").slice(0, 200);
}

export async function uploadSupplierInvoice(formData: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = supplierInvoiceMetaSchema.safeParse({
    supplierId: formData.get("supplierId"),
    invoiceNo: formData.get("invoiceNo") ?? "",
    invoiceDate: formData.get("invoiceDate") ?? "",
    amount: formData.get("amount") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { supplierId, invoiceNo, invoiceDate, amount, notes } = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Chagua faili la invoice" };
  }
  if (file.size > MAX_INVOICE_BYTES) {
    return {
      success: false,
      error: `Faili ni kubwa mno (${(file.size / 1024 / 1024).toFixed(1)} MB). Kikomo ni 4 MB.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The declared MIME type is browser-supplied, so the real format is read from the bytes.
  const actualType = sniffInvoiceType(bytes);
  if (!actualType || !ALLOWED_INVOICE_TYPES.includes(actualType as (typeof ALLOWED_INVOICE_TYPES)[number])) {
    return { success: false, error: "Aina ya faili hairuhusiwi. Tumia PDF, JPG, PNG, au WEBP." };
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, name: true },
  });
  if (!supplier) return { success: false, error: "Supplier hayupo" };

  let parsedDate: Date | undefined;
  if (invoiceDate) {
    const d = new Date(invoiceDate);
    if (Number.isNaN(d.getTime())) return { success: false, error: "Tarehe ya invoice si sahihi" };
    parsedDate = d;
  }

  let parsedAmount: number | undefined;
  if (amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return { success: false, error: "Kiasi si sahihi" };
    parsedAmount = n;
  }

  const fileName = safeFileName(file.name);

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.supplierInvoice.create({
        data: {
          supplierId,
          fileName,
          mimeType: actualType,
          sizeBytes: bytes.byteLength,
          invoiceNo: invoiceNo ?? null,
          invoiceDate: parsedDate ?? null,
          amount: parsedAmount ?? null,
          notes: notes ?? null,
          data: Buffer.from(bytes),
          uploadedById: session.user.id,
        },
        select: { id: true },
      });

      await logAudit(tx, {
        userId: session.user.id,
        action: "SUPPLIER_INVOICE_UPLOADED",
        entityType: "SupplierInvoice",
        entityId: created.id,
        metadata: {
          supplierId,
          supplierName: supplier.name,
          fileName,
          sizeBytes: bytes.byteLength,
          mimeType: actualType,
          invoiceNo: invoiceNo ?? null,
        },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kupakia invoice" };
  }

  revalidatePath(`/dashboard/admin/suppliers/${supplierId}`);
  return { success: true };
}

export async function deleteSupplierInvoice(invoiceId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  // Deliberately omits `data` — no reason to pull megabytes of file just to delete the row.
  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, supplierId: true, fileName: true, invoiceNo: true },
  });
  if (!invoice) return { success: false, error: "Invoice hii haipo" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.supplierInvoice.delete({ where: { id: invoiceId } });
      await logAudit(tx, {
        userId: session.user.id,
        action: "SUPPLIER_INVOICE_DELETED",
        entityType: "SupplierInvoice",
        entityId: invoiceId,
        metadata: {
          supplierId: invoice.supplierId,
          fileName: invoice.fileName,
          invoiceNo: invoice.invoiceNo,
        },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kufuta invoice" };
  }

  revalidatePath(`/dashboard/admin/suppliers/${invoice.supplierId}`);
  return { success: true };
}
