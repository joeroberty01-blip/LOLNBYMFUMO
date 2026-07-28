"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expenseSchema, type ExpenseInput } from "@/lib/validators/expenses";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("You don't have permission to do this");
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
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const { category, amount, description, paymentMethod, branchId, date } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
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

    await logAudit(tx, {
      userId: session.user.id,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
      metadata: { category, amount, branchId },
    });
  });

  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Expense not found" };
  if (existing.relatedSupplierPaymentId) {
    return {
      success: false,
      error: "This expense originated from a Supplier Payment — it cannot be edited here",
    };
  }

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const { category, amount, description, paymentMethod, branchId, date } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
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

    await logAudit(tx, {
      userId: session.user.id,
      action: "EXPENSE_UPDATED",
      entityType: "Expense",
      entityId: id,
      metadata: { category, amount, branchId, previousAmount: existing.amount.toNumber() },
    });
  });

  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Expense not found" };
  if (existing.relatedSupplierPaymentId) {
    return {
      success: false,
      error: "This expense originated from a Supplier Payment — it cannot be deleted here",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } });

    await logAudit(tx, {
      userId: session.user.id,
      action: "EXPENSE_DELETED",
      entityType: "Expense",
      entityId: id,
      metadata: {
        category: existing.category,
        amount: existing.amount.toNumber(),
        branchId: existing.branchId,
      },
    });
  });

  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
