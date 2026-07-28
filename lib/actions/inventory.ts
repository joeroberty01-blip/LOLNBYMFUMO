"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adjustStockSchema, type AdjustStockInput } from "@/lib/validators/inventory";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true } | { success: false; error: string };

export async function adjustStock(input: AdjustStockInput): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }

  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { partId, branchId, quantityChange, reason } = parsed.data;
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { partId_branchId: { partId, branchId } },
      });
      const currentQty = existing?.quantity ?? 0;
      const newQty = currentQty + quantityChange;

      if (newQty < 0) {
        throw new Error("Quantity haiwezi kuwa hasi (chini ya 0)");
      }

      await tx.inventory.upsert({
        where: { partId_branchId: { partId, branchId } },
        update: { quantity: newQty },
        create: { partId, branchId, quantity: newQty },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: { partId, branchId, quantityChange, reason, userId },
      });

      await logAudit(tx, {
        userId,
        action: "STOCK_ADJUSTED",
        entityType: "StockAdjustment",
        entityId: adjustment.id,
        metadata: { partId, branchId, quantityChange, reason, previousQty: currentQty, newQty },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
