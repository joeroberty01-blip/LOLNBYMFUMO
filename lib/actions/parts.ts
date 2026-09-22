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

/** A rejection updatePart should show the admin verbatim, as opposed to an unexpected failure
 * (e.g. the part having been deleted mid-edit) that gets the generic fallback message instead. */
class PartEditError extends Error {}

/**
 * Edits a part's catalogue fields, relocates its stock when the admin picked a different store,
 * and corrects that store's quantity when the admin typed a different one — all three in one
 * transaction, so a page that changes more than one of them can never apply only part of the
 * edit.
 *
 * The store move is a relocation, never an adjustment: the quantity sitting at `fromBranchId` is
 * carried over to `toBranchId` whole (added to whatever the destination already holds), so total
 * stock across all stores is identical before and after — nothing created or destroyed, so no
 * StockAdjustment for the move itself, just a `PART_STORE_CHANGED` audit entry with both store
 * ids and the quantity carried.
 *
 * The quantity field is different: it is an absolute value the admin typed — "this row now reads
 * N" — evaluated against whatever the target store's quantity is AFTER the move above, so editing
 * both at once ("move it here, and it should really read 20") composes correctly. Every such
 * change is still written as a StockAdjustment (reason CORRECTION) with its own audit entry,
 * exactly like the dedicated Adjust Stock action — this form is a second way to reach that same
 * audited path, never a silent overwrite of Inventory.quantity.
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
  const { fromBranchId, toBranchId, quantity, ...data } = parsed.data;
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.part.update({ where: { id: partId }, data });

      // The store this edit's quantity applies to: wherever the move above just sent the stock,
      // or the store the admin opened the part from if it wasn't moved.
      let targetBranchId = fromBranchId;

      if (toBranchId && toBranchId !== fromBranchId) {
        const target = await tx.branch.findUnique({ where: { id: toBranchId } });
        if (!target) throw new PartEditError("Store uliyochagua haipo");

        // A part with no stock row at the source (or no source at all) still gets attached to
        // the chosen store, just with nothing to carry over.
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

        targetBranchId = toBranchId;
      }

      const current = targetBranchId
        ? await tx.inventory.findUnique({
            where: { partId_branchId: { partId, branchId: targetBranchId } },
          })
        : null;
      const currentQty = current?.quantity ?? 0;
      const quantityChange = quantity - currentQty;

      if (quantityChange === 0) return;

      if (!targetBranchId) {
        throw new PartEditError("Chagua store kwanza kabla ya kuweka quantity");
      }

      await tx.inventory.upsert({
        where: { partId_branchId: { partId, branchId: targetBranchId } },
        update: { quantity },
        create: { partId, branchId: targetBranchId, quantity },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: { partId, branchId: targetBranchId, quantityChange, reason: "CORRECTION", userId },
      });

      await logAudit(tx, {
        userId,
        action: "STOCK_ADJUSTED",
        entityType: "StockAdjustment",
        entityId: adjustment.id,
        metadata: {
          partId,
          branchId: targetBranchId,
          quantityChange,
          reason: "CORRECTION",
          previousQty: currentQty,
          newQty: quantity,
        },
      });
    });
  } catch (e) {
    if (e instanceof PartEditError) return { success: false, error: e.message };
    return { success: false, error: "Part hii haipo tena (huenda imeshafutwa)" };
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
