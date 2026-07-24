"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { partSchema, type PartInput } from "@/lib/validators/parts";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createPart(input: PartInput): Promise<ActionResult> {
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

  const existing = await prisma.part.findUnique({ where: { partNumber: data.partNumber } });
  if (existing) {
    return { success: false, error: "Part number hii tayari ipo" };
  }

  await prisma.part.create({ data });
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true };
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

  const existing = await prisma.part.findUnique({ where: { partNumber: data.partNumber } });
  if (existing && existing.id !== partId) {
    return { success: false, error: "Part number hii tayari inatumiwa na part nyingine" };
  }

  await prisma.part.update({ where: { id: partId }, data });
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

  // Soft delete only — isActive: false. Part history referenced by SaleItem/PurchaseItem must
  // never be hard-deleted, and no hard-delete path is exposed anywhere in this app.
  await prisma.part.update({ where: { id: partId }, data: { isActive: false } });
  revalidatePath("/dashboard/admin/parts");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true };
}
