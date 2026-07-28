"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeSchema, type StoreInput } from "@/lib/validators/branches";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createStore(input: StoreInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  const existing = await prisma.branch.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: `Store "${parsed.data.name}" ipo tayari` };
  }

  await prisma.$transaction(async (tx) => {
    const store = await tx.branch.create({ data: parsed.data });
    await logAudit(tx, {
      userId: session.user.id,
      action: "STORE_CREATED",
      entityType: "Branch",
      entityId: store.id,
      metadata: { name: store.name, isSellingPoint: store.isSellingPoint },
    });
  });

  revalidatePath("/dashboard/admin/stores");
  return { success: true };
}

/** Flips whether a store is offered as a POS checkout location. Never deletes a store — every
 * branch created so far carries inventory/sales/adjustment history that must not be orphaned. */
export async function setStoreSellingPoint(
  branchId: string,
  isSellingPoint: boolean
): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.update({
        where: { id: branchId },
        data: { isSellingPoint },
        select: { id: true, name: true },
      });
      await logAudit(tx, {
        userId: session.user.id,
        action: "STORE_UPDATED",
        entityType: "Branch",
        entityId: branch.id,
        metadata: { name: branch.name, isSellingPoint },
      });
    });
  } catch {
    return { success: false, error: "Store haipo" };
  }

  revalidatePath("/dashboard/admin/stores");
  revalidatePath("/dashboard/sales/pos");
  return { success: true };
}

/**
 * Archives a store — soft delete only, same convention as Part/Customer/Supplier. Hides it
 * from every operational picker (POS, Bulk Upload store-matching, stock/payment forms) but
 * never deletes it: Sale/Expense/StockAdjustment history referencing this branch stays fully
 * intact and queryable, and the store can be un-archived from this same page at any time.
 */
export async function setStoreActive(branchId: string, isActive: boolean): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  if (isActive === false) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return { success: false, error: "Store haipo" };
    if (branch.isSellingPoint) {
      return {
        success: false,
        error: 'Store hii bado ni "Selling Point" — ibadilishe kuwa Warehouse-Only kwanza kabla ya ku-archive.',
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.update({
        where: { id: branchId },
        data: { isActive },
        select: { id: true, name: true },
      });
      await logAudit(tx, {
        userId: session.user.id,
        action: "STORE_UPDATED",
        entityType: "Branch",
        entityId: branch.id,
        metadata: { name: branch.name, isActive },
      });
    });
  } catch {
    return { success: false, error: "Store haipo" };
  }

  revalidatePath("/dashboard/admin/stores");
  revalidatePath("/dashboard/sales/pos");
  return { success: true };
}
