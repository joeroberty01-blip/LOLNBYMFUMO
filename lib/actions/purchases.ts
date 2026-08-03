"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { creditPurchaseSchema, type CreditPurchaseInput } from "@/lib/validators/purchases";
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
    revalidatePath("/dashboard/admin");
    return { success: true, purchaseId };
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kuandika purchase" };
  }
}
