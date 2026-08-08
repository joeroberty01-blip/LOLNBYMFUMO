"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  partSchema,
  createPartSchema,
  type PartInput,
  type CreatePartInput,
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

export async function updatePart(partId: string, input: PartInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = partSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const data = parsed.data;

  try {
    await prisma.part.update({ where: { id: partId }, data });
  } catch {
    return { success: false, error: "Part hii haipo tena (huenda imeshafutwa)" };
  }
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
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
