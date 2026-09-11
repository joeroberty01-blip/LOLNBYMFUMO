"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stockMovementSchema, type StockMovementInput } from "@/lib/validators/stockMovements";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

/** Both roles can log a movement (recording what physically came in/went out is an
 * operational, branch-floor task) — only an admin can correct or remove one afterward. Mirrors
 * the same split already used for Expenses (lib/actions/expenses.ts). */
async function requireStaffOrAdmin() {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  if (!session || (session.user.role !== "ADMIN" && !isApprovedSalesStaff)) {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

const REVALIDATE_PATHS = [
  "/dashboard/admin/stock-movements",
  "/dashboard/sales/stock-movements",
];

/** Deliberately does not touch Inventory or Part in any way — see the StockMovement model
 * comment in prisma/schema.prisma. This is a record-keeping logbook only. */
export async function createStockMovement(input: StockMovementInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireStaffOrAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { movementType, branchId, itemName, partNumber, quantity, personName, description } =
    parsed.data;

  await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: { movementType, branchId, itemName, partNumber, quantity, personName, description, userId: session.user.id },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "STOCK_MOVEMENT_CREATED",
      entityType: "StockMovement",
      entityId: movement.id,
      metadata: { movementType, branchId, itemName, partNumber, quantity, personName },
    });
  });

  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
  return { success: true };
}

export async function updateStockMovement(
  id: string,
  input: StockMovementInput
): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.stockMovement.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Rekodi hii haipo tena" };

  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { movementType, branchId, itemName, partNumber, quantity, personName, description } =
    parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.update({
      where: { id },
      data: { movementType, branchId, itemName, partNumber, quantity, personName, description },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "STOCK_MOVEMENT_UPDATED",
      entityType: "StockMovement",
      entityId: id,
      metadata: { movementType, branchId, itemName, partNumber, quantity, personName },
    });
  });

  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
  return { success: true };
}

export async function deleteStockMovement(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.stockMovement.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Rekodi hii haipo tena" };

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.delete({ where: { id } });

    await logAudit(tx, {
      userId: session.user.id,
      action: "STOCK_MOVEMENT_DELETED",
      entityType: "StockMovement",
      entityId: id,
      metadata: {
        movementType: existing.movementType,
        branchId: existing.branchId,
        itemName: existing.itemName,
        partNumber: existing.partNumber,
        quantity: existing.quantity,
      },
    });
  });

  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
  return { success: true };
}
