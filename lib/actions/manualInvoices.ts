"use server";

import type { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createManualInvoiceSchema,
  draftManualInvoiceSchema,
  type CreateManualInvoiceInput,
  type DraftManualInvoiceInput,
} from "@/lib/validators/manualInvoices";

type ActionResult = { success: true; id: string } | { success: false; error: string };
type DeleteActionResult = { success: true } | { success: false; error: string };
/** The PARSED/OUTPUT shape of either schema — what `.safeParse(...).data` actually is, not the
 * raw input callers pass in (draft callers pass unvalidated getValues() output, which is why
 * DraftManualInvoiceInput itself is a z.input, not a z.infer — see lib/validators/manualInvoices.ts). */
type ParsedInvoiceFields = z.infer<typeof createManualInvoiceSchema> | z.infer<typeof draftManualInvoiceSchema>;

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }
  return session;
}

function invoiceFieldData(data: ParsedInvoiceFields) {
  return {
    companyKey: data.companyKey,
    docType: data.docType,
    paymentMode: data.paymentMode,
    deliveryTime: data.deliveryTime,
    brand: data.brand,
    customerName: data.customerName,
    customerAddress: data.customerAddress,
    customerTin: data.customerTin,
    customerVrn: data.customerVrn,
    customerPoNumber: data.customerPoNumber,
    period: data.period,
    bankMethod: data.bankMethod,
    bankAccountName: data.bankAccountName,
    bankAccountNumber: data.bankAccountNumber,
    authorizedBy: data.authorizedBy,
    traReceiptNo: data.traReceiptNo,
    notes: data.notes,
  };
}

/** Creates a freestanding PDF-style invoice for an external company/client. Writes only to
 * ManualInvoice/ManualInvoiceItem — never touches Sale, SaleItem, Customer, Part, or any stock
 * table, by design (see prisma/schema.prisma). */
export async function createManualInvoice(input: CreateManualInvoiceInput): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = createManualInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data batili" };
  }
  const data = parsed.data;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const invoice = await prisma.manualInvoice.create({
    data: {
      ...invoiceFieldData(data),
      status: "final",
      total,
      createdById: session.user.id,
      items: {
        create: data.items.map((item, index) => ({
          description: item.description,
          partNumber: item.partNumber,
          countryOfOrigin: item.countryOfOrigin,
          stockAvailable: item.stockAvailable,
          genuine: item.genuine,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          orderIndex: index,
        })),
      },
    },
    select: { id: true },
  });

  return { success: true, id: invoice.id };
}

/** Edits an existing ManualInvoice in place — replaces its item list wholesale and recomputes
 * the total. Also finalizes it (status "final") if it was a draft — this is the "finish" path
 * for a draft started earlier. Still writes only to ManualInvoice/ManualInvoiceItem. */
export async function updateManualInvoice(
  id: string,
  input: CreateManualInvoiceInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createManualInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data batili" };
  }
  const data = parsed.data;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  await prisma.$transaction([
    prisma.manualInvoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.manualInvoice.update({
      where: { id },
      data: {
        ...invoiceFieldData(data),
        status: "final",
        total,
        items: {
          create: data.items.map((item, index) => ({
            description: item.description,
            partNumber: item.partNumber,
            countryOfOrigin: item.countryOfOrigin,
            stockAvailable: item.stockAvailable,
            genuine: item.genuine,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            orderIndex: index,
          })),
        },
      },
    }),
  ]);

  return { success: true, id };
}

/** Saves whatever's currently in the create form as a draft — no validation beyond coercing
 * types, since a draft is by definition incomplete (empty customer name, no items yet, an item
 * with no price). Finishing it later goes through updateManualInvoice, which both validates
 * fully and flips status back to "final". */
export async function saveManualInvoiceDraft(input: DraftManualInvoiceInput): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = draftManualInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data batili" };
  }
  const data = parsed.data;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const invoice = await prisma.manualInvoice.create({
    data: {
      ...invoiceFieldData(data),
      status: "draft",
      total,
      createdById: session.user.id,
      items: {
        create: data.items.map((item, index) => ({
          description: item.description,
          partNumber: item.partNumber,
          countryOfOrigin: item.countryOfOrigin,
          stockAvailable: item.stockAvailable,
          genuine: item.genuine,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          orderIndex: index,
        })),
      },
    },
    select: { id: true },
  });

  return { success: true, id: invoice.id };
}

/** Re-saves an existing draft's current form state, still as a draft (status stays "draft"). */
export async function updateManualInvoiceDraft(
  id: string,
  input: DraftManualInvoiceInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = draftManualInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data batili" };
  }
  const data = parsed.data;
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  await prisma.$transaction([
    prisma.manualInvoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.manualInvoice.update({
      where: { id },
      data: {
        ...invoiceFieldData(data),
        status: "draft",
        total,
        items: {
          create: data.items.map((item, index) => ({
            description: item.description,
            partNumber: item.partNumber,
            countryOfOrigin: item.countryOfOrigin,
            stockAvailable: item.stockAvailable,
            genuine: item.genuine,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            orderIndex: index,
          })),
        },
      },
    }),
  ]);

  return { success: true, id };
}

/** Hard-deletes a manual invoice (and its items, via onDelete: Cascade) — unlike Part, nothing
 * else references a ManualInvoice, so there's no soft-delete flag to preserve history for. */
export async function deleteManualInvoice(id: string): Promise<DeleteActionResult> {
  await requireAdmin();
  try {
    await prisma.manualInvoice.delete({ where: { id } });
  } catch {
    return { success: false, error: "Invoice hii haipo tena (huenda imeshafutwa)" };
  }
  return { success: true };
}
