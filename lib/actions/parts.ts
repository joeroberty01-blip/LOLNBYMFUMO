"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  partSchema,
  createPartSchema,
  editPartSchema,
  type PartInput,
  type CreatePartInput,
  type EditPartInput,
} from "@/lib/validators/parts";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createPart(input: CreatePartInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = createPartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { openingQuantity, openingBranchId, ...data } = parsed.data;
  const userId = session.user.id;

  if (openingQuantity && openingQuantity > 0 && !openingBranchId) {
    return { success: false, error: "Chagua store ya kuweka hizo quantity" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const part = await tx.part.create({ data });

      if (openingQuantity && openingQuantity > 0 && openingBranchId) {
        await tx.inventory.create({
          data: { partId: part.id, branchId: openingBranchId, quantity: openingQuantity },
        });
        const adjustment = await tx.stockAdjustment.create({
          data: {
            partId: part.id,
            branchId: openingBranchId,
            quantityChange: openingQuantity,
            reason: "NEW_STOCK",
            userId,
          },
        });
        await logAudit(tx, {
          userId,
          action: "STOCK_ADJUSTED",
          entityType: "StockAdjustment",
          entityId: adjustment.id,
          metadata: {
            partId: part.id,
            branchId: openingBranchId,
            quantityChange: openingQuantity,
            reason: "NEW_STOCK",
            previousQty: 0,
            newQty: openingQuantity,
          },
        });
      }
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kuongeza part" };
  }

  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

type CreatePartResult = { success: true; partId: string } | { success: false; error: string };

/** Same as createPart, but returns the new id — used where the caller needs to immediately
 * reference the part it just created, e.g. selecting it in a Credit Purchase item row. */
export async function createPartQuick(input: PartInput): Promise<CreatePartResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = partSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  const part = await prisma.part.create({ data: parsed.data });
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true, partId: part.id };
}

/**
 * Edits a part's catalogue fields and, when the admin picked a different store, relocates that
 * part's stock to it.
 *
 * The move is a relocation, never an adjustment: the quantity sitting at `fromBranchId` is
 * carried over to `toBranchId` whole, so total stock across all stores is identical before and
 * after. If the destination already holds this part, the two quantities are added together
 * rather than one overwriting the other. Because nothing is created or destroyed there is no
 * StockAdjustment — those record a real change in how much stock exists — but the move is written
 * to the audit log with both store ids and the quantity carried, so it stays traceable.
 */
export async function updatePart(partId: string, input: EditPartInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = editPartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { fromBranchId, toBranchId, ...data } = parsed.data;
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.part.update({ where: { id: partId }, data });

      if (!toBranchId || toBranchId === fromBranchId) return;

      const target = await tx.branch.findUnique({ where: { id: toBranchId } });
      if (!target) throw new Error("Store uliyochagua haipo");

      // A part with no stock row at the source (or no source at all) still gets attached to the
      // chosen store, just with nothing to carry over.
      let movedQuantity = 0;
      if (fromBranchId) {
        const source = await tx.inventory.findUnique({
          where: { partId_branchId: { partId, branchId: fromBranchId } },
        });
        if (source) {
          movedQuantity = source.quantity;
          await tx.inventory.delete({ where: { id: source.id } });
        }
      }

      await tx.inventory.upsert({
        where: { partId_branchId: { partId, branchId: toBranchId } },
        update: { quantity: { increment: movedQuantity } },
        create: { partId, branchId: toBranchId, quantity: movedQuantity },
      });

      await logAudit(tx, {
        userId,
        action: "PART_STORE_CHANGED",
        entityType: "Part",
        entityId: partId,
        metadata: { fromBranchId: fromBranchId ?? null, toBranchId, movedQuantity },
      });
    });
  } catch (e) {
    const message = (e as Error).message;
    return {
      success: false,
      error: message.startsWith("Store ")
        ? message
        : "Part hii haipo tena (huenda imeshafutwa)",
    };
  }

  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function deletePart(partId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    // Soft delete only — isActive: false. Part history referenced by SaleItem/PurchaseItem must
    // never be hard-deleted, and no hard-delete path is exposed anywhere in this app.
    await prisma.part.update({ where: { id: partId }, data: { isActive: false } });
  } catch {
    return { success: false, error: "Part hii haipo tena (huenda imeshafutwa)" };
  }
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true };
}
