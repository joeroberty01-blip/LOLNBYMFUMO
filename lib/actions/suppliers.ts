"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { supplierSchema, recordPaymentSchema, type SupplierInput, type RecordPaymentInput } from "@/lib/validators/suppliers";
import { logAudit } from "@/lib/audit";
import { toCents, fromCents } from "@/lib/money";
import { supplierPurchaseRemainingCents } from "@/lib/data/outstanding";

/** A rejection the admin should see verbatim, as opposed to an unexpected failure. Thrown inside
 * the transaction so the refusal also rolls back anything already written. */
class PaymentError extends Error {}

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  await prisma.supplier.create({ data: parsed.data });
  revalidatePath("/dashboard/admin/suppliers");
  return { success: true };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  try {
    await prisma.supplier.update({ where: { id }, data: parsed.data });
  } catch {
    return { success: false, error: "Supplier huyu hayupo tena (huenda ameshafutwa)" };
  }
  revalidatePath("/dashboard/admin/suppliers");
  return { success: true };
}

export async function archiveSupplier(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return { success: false, error: "Supplier haipo" };
  if (supplier.balance.toNumber() > 0) {
    return {
      success: false,
      error: "Supplier huyu bado ana deni tunalodaiwa — lipa kabla ya ku-archive",
    };
  }

  // Soft delete only — isActive: false. Purchase/payment history referencing this supplier must
  // never be hard-deleted, and no hard-delete path is exposed anywhere in this app (same
  // convention as deletePart/archiveCustomer).
  await prisma.supplier.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/dashboard/admin/suppliers");
  return { success: true };
}

export async function recordSupplierPayment(input: RecordPaymentInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { supplierId, purchaseId, amount, paymentMethod, branchId } = parsed.data;
  const amountCents = toCents(amount);

  try {
    await prisma.$transaction((tx) =>
      applySupplierPayment(tx, session.user.id, {
        supplierId,
        purchaseId,
        amount,
        amountCents,
        paymentMethod,
        branchId,
      })
    );
  } catch (e) {
    if (e instanceof PaymentError) return { success: false, error: e.message };
    return { success: false, error: `Imeshindikana kurekodi malipo: ${(e as Error).message}` };
  }

  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

/**
 * One payment, written on the caller's transaction so a batch is all-or-nothing. Also creates the
 * matching Expense, because paying a supplier is money actually leaving the business (unlike a
 * customer collection, which is money coming in against revenue already recognised).
 */
async function applySupplierPayment(
  tx: Prisma.TransactionClient,
  userId: string,
  p: {
    supplierId: string;
    purchaseId?: string;
    amount: number;
    amountCents: number;
    paymentMethod: RecordPaymentInput["paymentMethod"];
    branchId?: string;
  }
): Promise<void> {
  const supplier = await tx.supplier.findUnique({
    where: { id: p.supplierId },
    select: { name: true, balance: true },
  });
  if (!supplier) throw new PaymentError("Supplier haipo");

  const balanceCents = toCents(supplier.balance);
  if (p.amountCents > balanceCents) {
    throw new PaymentError(
      `Kiasi hiki kinazidi deni lote. Deni ni ${fromCents(balanceCents).toLocaleString("sw-TZ")} TZS.`
    );
  }

  if (p.purchaseId) {
    const remainingCents = await supplierPurchaseRemainingCents(tx, p.supplierId, p.purchaseId);
    if (remainingCents === null) throw new PaymentError("Manunuzi haya si ya supplier huyu");
    if (remainingCents <= 0) throw new PaymentError("Manunuzi haya tayari yamelipwa yote");
    if (p.amountCents > remainingCents) {
      throw new PaymentError(
        `Kiasi kinazidi deni la manunuzi haya. Yaliyobaki ni ${fromCents(remainingCents).toLocaleString("sw-TZ")} TZS.`
      );
    }
  }

  const payment = await tx.supplierPayment.create({
    data: {
      supplierId: p.supplierId,
      purchaseId: p.purchaseId ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      branchId: p.branchId,
      userId,
    },
  });

  await tx.expense.create({
    data: {
      category: "SUPPLIER_PAYMENT",
      amount: p.amount,
      description: `Malipo kwa ${supplier.name}`,
      paymentMethod: p.paymentMethod,
      branchId: p.branchId,
      userId,
      relatedSupplierPaymentId: payment.id,
    },
  });

  await tx.supplier.update({
    where: { id: p.supplierId },
    data: { balance: { decrement: p.amount } },
  });

  await logAudit(tx, {
    userId,
    action: "SUPPLIER_PAYMENT_RECORDED",
    entityType: "SupplierPayment",
    entityId: payment.id,
    metadata: {
      supplierId: p.supplierId,
      purchaseId: p.purchaseId ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      branchId: p.branchId,
    },
  });
}

/** Pays several purchases at once in ONE transaction — all of them or none. */
export async function recordSupplierPaymentsPerPurchase(input: {
  supplierId: string;
  paymentMethod: RecordPaymentInput["paymentMethod"];
  branchId?: string;
  allocations: { purchaseId: string; amount: number }[];
}): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const rows = input.allocations.filter((a) => a.amount > 0);
  if (rows.length === 0) return { success: false, error: "Hakuna kiasi kilichowekwa" };

  const parsedRows: { purchaseId: string; amount: number; amountCents: number }[] = [];
  for (const r of rows) {
    const parsed = recordPaymentSchema.safeParse({
      supplierId: input.supplierId,
      purchaseId: r.purchaseId,
      amount: r.amount,
      paymentMethod: input.paymentMethod,
      branchId: input.branchId,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
    }
    parsedRows.push({
      purchaseId: r.purchaseId,
      amount: parsed.data.amount,
      amountCents: toCents(parsed.data.amount),
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of parsedRows) {
        await applySupplierPayment(tx, session.user.id, {
          supplierId: input.supplierId,
          purchaseId: r.purchaseId,
          amount: r.amount,
          amountCents: r.amountCents,
          paymentMethod: input.paymentMethod,
          branchId: input.branchId,
        });
      }
    });
  } catch (e) {
    if (e instanceof PaymentError) return { success: false, error: e.message };
    return { success: false, error: `Imeshindikana kurekodi malipo: ${(e as Error).message}` };
  }

  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

/**
 * Reverses a recorded supplier payment: puts the amount back on the supplier's balance, deletes
 * the auto-generated Expense it created (see recordSupplierPayment), and deletes the
 * SupplierPayment row itself.
 */
export async function deleteSupplierPayment(paymentId: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const payment = await prisma.supplierPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, error: "Malipo haya hayapo" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id: payment.supplierId },
        data: { balance: { increment: payment.amount } },
      });
      await tx.expense.deleteMany({ where: { relatedSupplierPaymentId: paymentId } });
      await logAudit(tx, {
        userId: session.user.id,
        action: "SUPPLIER_PAYMENT_DELETED",
        entityType: "SupplierPayment",
        entityId: paymentId,
        metadata: { supplierId: payment.supplierId, amount: payment.amount.toNumber() },
      });
      await tx.supplierPayment.delete({ where: { id: paymentId } });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kufuta malipo" };
  }

  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
