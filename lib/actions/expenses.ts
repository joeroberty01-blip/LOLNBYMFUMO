"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expenseSchema, type ExpenseInput } from "@/lib/validators/expenses";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { category, amount, description, paymentMethod, branchId, date } = parsed.data;

  await prisma.expense.create({
    data: {
      category,
      amount,
      description,
      paymentMethod,
      branchId,
      userId: session.user.id,
      createdAt: date ? new Date(`${date}T00:00:00`) : undefined,
    },
  });

  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Expense haipo" };
  if (existing.relatedSupplierPaymentId) {
    return {
      success: false,
      error: "Expense hii imetokana na Supplier Payment — haiwezi kuhaririwa hapa",
    };
  }

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { category, amount, description, paymentMethod, branchId, date } = parsed.data;

  await prisma.expense.update({
    where: { id },
    data: {
      category,
      amount,
      description,
      paymentMethod,
      branchId,
      ...(date ? { createdAt: new Date(`${date}T00:00:00`) } : {}),
    },
  });

  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Expense haipo" };
  if (existing.relatedSupplierPaymentId) {
    return {
      success: false,
      error: "Expense hii imetokana na Supplier Payment — haiwezi kufutwa hapa",
    };
  }

  await prisma.expense.delete({ where: { id } });
  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
