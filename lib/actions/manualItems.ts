"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  convertManualItemSchema,
  type ConvertManualItemInput,
} from "@/lib/validators/manualItems";

type ActionResult = { success: true; partId: string } | { success: false; error: string };

export async function convertManualItemToPart(
  input: ConvertManualItemInput
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }

  const parsed = convertManualItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { branchId, initialQuantity, ...partData } = parsed.data;

  const existing = await prisma.part.findUnique({ where: { partNumber: partData.partNumber } });
  if (existing) {
    return { success: false, error: "Part number hii tayari ipo" };
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return { success: false, error: "Branch haipo" };
  }

  const part = await prisma.$transaction(async (tx) => {
    const created = await tx.part.create({ data: partData });

    if (initialQuantity > 0) {
      await tx.inventory.create({
        data: { partId: created.id, branchId, quantity: initialQuantity },
      });
      await tx.stockAdjustment.create({
        data: {
          partId: created.id,
          branchId,
          quantityChange: initialQuantity,
          reason: "NEW_STOCK",
          userId: session.user.id,
        },
      });
    }

    return created;
  });

  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/admin/sales");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true, partId: part.id };
}
