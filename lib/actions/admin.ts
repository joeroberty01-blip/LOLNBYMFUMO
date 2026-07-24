"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function approveSalesStaff(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  await prisma.user.update({
    where: { id: userId, role: "SALES_STAFF" },
    data: { status: "APPROVED" },
  });
  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}

export async function rejectSalesStaff(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  await prisma.user.update({
    where: { id: userId, role: "SALES_STAFF" },
    data: { status: "REJECTED" },
  });
  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}

export async function deactivateSalesStaff(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  await prisma.user.update({
    where: { id: userId, role: "SALES_STAFF" },
    data: { status: "DEACTIVATED" },
  });
  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}
