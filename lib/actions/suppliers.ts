"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supplierSchema, recordPaymentSchema, type SupplierInput, type RecordPaymentInput } from "@/lib/validators/suppliers";
import { logAudit } from "@/lib/audit";

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
  const { supplierId, amount, paymentMethod, branchId } = parsed.data;

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return { success: false, error: "Supplier haipo" };

  await prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.create({
      data: {
        supplierId,
        amount,
        paymentMethod,
        branchId,
        userId: session.user.id,
      },
    });

    await tx.expense.create({
      data: {
        category: "SUPPLIER_PAYMENT",
        amount,
        description: `Malipo kwa ${supplier.name}`,
        paymentMethod,
        branchId,
        userId: session.user.id,
        relatedSupplierPaymentId: payment.id,
      },
    });

    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: amount } },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "SUPPLIER_PAYMENT_RECORDED",
      entityType: "SupplierPayment",
      entityId: payment.id,
      metadata: { supplierId, amount, paymentMethod, branchId },
    });
  });

  revalidatePath("/dashboard/admin/suppliers");
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
