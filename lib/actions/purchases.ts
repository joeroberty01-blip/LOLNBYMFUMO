"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  creditPurchaseSchema,
  editPurchaseSchema,
  type CreditPurchaseInput,
  type EditPurchaseInput,
} from "@/lib/validators/purchases";
import { getPurchaseDetail, type PurchaseDetail } from "@/lib/data/purchases";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true; purchaseId: string } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

/**
 * Records stock bought from a supplier on credit: adds each item's quantity to that store's
 * Inventory (creating the row if it doesn't exist yet) and adds the purchase total to the
 * supplier's balance — the same balance the existing "Record Payment" flow pays down. Nothing
 * here creates an Expense; that only happens when the debt is actually paid (recordSupplierPayment
 * in lib/actions/suppliers.ts), matching how Expenses represent money that has actually left
 * the business, not money owed.
 */
export async function createCreditPurchase(input: CreditPurchaseInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = creditPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { supplierName, supplierPhone, branchId, purchaseDate, dueDate, notes, items } = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, error: "Branch haipo" };

  const partIds = items.map((i) => i.partId);
  const parts = await prisma.part.findMany({ where: { id: { in: partIds } }, select: { id: true } });
  if (parts.length !== new Set(partIds).size) {
    return { success: false, error: "Baadhi ya products hazipo tena" };
  }

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  try {
    const purchaseId = await prisma.$transaction(async (tx) => {
      const existingSupplier = await tx.supplier.findFirst({
        where: { name: { equals: supplierName, mode: "insensitive" } },
      });

      const supplier = existingSupplier
        ? existingSupplier.phone
          ? existingSupplier
          : await tx.supplier.update({
              where: { id: existingSupplier.id },
              data: { phone: supplierPhone ?? existingSupplier.phone },
            })
        : await tx.supplier.create({
            data: { name: supplierName, phone: supplierPhone ?? null, balance: 0 },
          });

      const purchase = await tx.purchase.create({
        data: {
          supplierId: supplier.id,
          branchId,
          userId: session.user.id,
          total,
          createdAt: purchaseDate ? new Date(`${purchaseDate}T00:00:00`) : undefined,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
          notes: notes ?? null,
          items: {
            create: items.map((it) => ({
              partId: it.partId,
              quantity: it.quantity,
              unitPrice: it.unitCost,
            })),
          },
        },
      });

      for (const item of items) {
        await tx.inventory.upsert({
          where: { partId_branchId: { partId: item.partId, branchId } },
          update: { quantity: { increment: item.quantity } },
          create: { partId: item.partId, branchId, quantity: item.quantity },
        });
      }

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { balance: { increment: total } },
      });

      await logAudit(tx, {
        userId: session.user.id,
        action: "PURCHASE_CREATED",
        entityType: "Purchase",
        entityId: purchase.id,
        metadata: { supplierId: supplier.id, branchId, total, items: items.length },
      });

      return purchase.id;
    });

    revalidatePath("/dashboard/admin/suppliers");
    revalidatePath("/dashboard/admin/parts");
    revalidatePath("/dashboard/admin/purchases");
    revalidatePath("/dashboard/admin");
    return { success: true, purchaseId };
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kuandika purchase" };
  }
}

type SimpleResult = { success: true } | { success: false; error: string };

export async function getPurchaseDetailForView(purchaseId: string): Promise<PurchaseDetail | null> {
  try {
    await requireAdmin();
  } catch {
    return null;
  }
  return getPurchaseDetail(purchaseId);
}

/**
 * Edits a purchase's due date, notes, and items. Supplier and branch cannot be changed here (see
 * editPurchaseSchema). Reverses the purchase's old inventory/supplier-balance effects and
 * reapplies the new ones inside one transaction, then swaps out the PurchaseItems — same
 * reverse-then-reapply shape as createCreditPurchase + deletePurchase combined.
 */
export async function updatePurchase(
  purchaseId: string,
  input: EditPurchaseInput
): Promise<SimpleResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = editPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { dueDate, notes, items } = parsed.data;

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
  if (!purchase) return { success: false, error: "Purchase haipo" };

  const partIds = items.map((i) => i.partId);
  const parts = await prisma.part.findMany({ where: { id: { in: partIds } }, select: { id: true } });
  if (parts.length !== new Set(partIds).size) {
    return { success: false, error: "Baadhi ya products hazipo tena" };
  }

  const newTotal = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await tx.inventory.upsert({
          where: { partId_branchId: { partId: item.partId, branchId: purchase.branchId } },
          update: { quantity: { decrement: item.quantity } },
          create: { partId: item.partId, branchId: purchase.branchId, quantity: -item.quantity },
        });
      }
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { balance: { decrement: purchase.total } },
      });

      await tx.purchaseItem.deleteMany({ where: { purchaseId } });
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          total: newTotal,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
          notes: notes ?? null,
          items: {
            create: items.map((it) => ({
              partId: it.partId,
              quantity: it.quantity,
              unitPrice: it.unitCost,
            })),
          },
        },
      });

      for (const item of items) {
        await tx.inventory.upsert({
          where: { partId_branchId: { partId: item.partId, branchId: purchase.branchId } },
          update: { quantity: { increment: item.quantity } },
          create: { partId: item.partId, branchId: purchase.branchId, quantity: item.quantity },
        });
      }
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { balance: { increment: newTotal } },
      });

      await logAudit(tx, {
        userId: session.user.id,
        action: "PURCHASE_UPDATED",
        entityType: "Purchase",
        entityId: purchaseId,
        metadata: { supplierId: purchase.supplierId, branchId: purchase.branchId, total: newTotal },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kuhariri purchase" };
  }

  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

/**
 * Fully reverses a credit purchase: takes back each item's quantity from that store's Inventory
 * and takes the total back off the supplier's balance, then deletes the Purchase (its
 * PurchaseItems cascade). This is the "delete" action on the Credit Purchases list — it can push
 * Inventory negative if the stock was already partly sold, which is allowed (same as everywhere
 * else negative inventory is tolerated in this app).
 */
export async function deletePurchase(purchaseId: string): Promise<SimpleResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!purchase) return { success: false, error: "Purchase haipo" };

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await tx.inventory.upsert({
          where: { partId_branchId: { partId: item.partId, branchId: purchase.branchId } },
          update: { quantity: { decrement: item.quantity } },
          create: { partId: item.partId, branchId: purchase.branchId, quantity: -item.quantity },
        });
      }

      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { balance: { decrement: purchase.total } },
      });

      await logAudit(tx, {
        userId: session.user.id,
        action: "PURCHASE_DELETED",
        entityType: "Purchase",
        entityId: purchaseId,
        metadata: {
          supplierId: purchase.supplierId,
          branchId: purchase.branchId,
          total: purchase.total.toNumber(),
        },
      });

      await tx.purchase.delete({ where: { id: purchaseId } });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kufuta purchase" };
  }

  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
