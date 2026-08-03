"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  adminCreateUserSchema,
  editUserSchema,
  type AdminCreateUserInput,
  type EditUserInput,
} from "@/lib/validators/auth";
import { logAudit } from "@/lib/audit";

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

  try {
    await prisma.user.update({
      where: { id: userId, role: "SALES_STAFF" },
      data: { status: "APPROVED" },
    });
  } catch {
    return { success: false, error: "Mtumiaji huyu hayupo tena (huenda ameshafutwa)" };
  }
  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}

export async function rejectSalesStaff(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    await prisma.user.update({
      where: { id: userId, role: "SALES_STAFF" },
      data: { status: "REJECTED" },
    });
  } catch {
    return { success: false, error: "Mtumiaji huyu hayupo tena (huenda ameshafutwa)" };
  }
  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}

export async function createUserByAdmin(input: AdminCreateUserInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = adminCreateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const { name, email, password, role } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { success: false, error: "This email is already in use" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role, status: "APPROVED" },
      });
      await logAudit(tx, {
        userId: session.user.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: user.id,
        metadata: { name, email, role },
      });
    });
  } catch {
    return { success: false, error: "This email is already in use" };
  }

  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}

export async function updateUser(userId: string, input: EditUserInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = editUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const { name, email, password } = parsed.data;

  const existingEmail = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
  if (existingEmail) {
    return { success: false, error: "This email is already in use" };
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { name, email, ...(passwordHash ? { passwordHash } : {}) },
      });
      await logAudit(tx, {
        userId: session.user.id,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: user.id,
        metadata: { name, email, passwordChanged: Boolean(passwordHash) },
      });
    });
  } catch {
    return { success: false, error: "Mtumiaji huyu hayupo tena (huenda ameshafutwa)" };
  }

  revalidatePath("/dashboard/admin/sales-staff");
  revalidatePath(`/dashboard/admin/sales-staff/${userId}`);
  return { success: true };
}

export async function deactivateSalesStaff(userId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    await prisma.user.update({
      where: { id: userId, role: "SALES_STAFF" },
      data: { status: "DEACTIVATED" },
    });
  } catch {
    return { success: false, error: "Mtumiaji huyu hayupo tena (huenda ameshafutwa)" };
  }
  revalidatePath("/dashboard/admin/sales-staff");
  return { success: true };
}
