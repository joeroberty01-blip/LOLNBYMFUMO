"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createManualInvoiceSchema,
  type CreateManualInvoiceInput,
} from "@/lib/validators/manualInvoices";

type ActionResult = { success: true; id: string } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }
  return session;
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
      total,
      createdById: session.user.id,
      items: {
        create: data.items.map((item, index) => ({
          description: item.description,
          partNumber: item.partNumber,
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
 * the total. Still writes only to ManualInvoice/ManualInvoiceItem. */
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
        total,
        items: {
          create: data.items.map((item, index) => ({
            description: item.description,
            partNumber: item.partNumber,
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
