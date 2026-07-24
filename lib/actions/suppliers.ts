"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supplierSchema, recordPaymentSchema, type SupplierInput, type RecordPaymentInput } from "@/lib/validators/suppliers";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  await prisma.supplier.create({ data: parsed.data });
  revalidatePath("/dashboard/admin/suppliers");
  return { success: true };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  await prisma.supplier.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/admin/suppliers");
  return { success: true };
}

export async function recordSupplierPayment(input: RecordPaymentInput): Promise<ActionResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { supplierId, amount, paymentMethod, branchId } = parsed.data;

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return { success: false, error: "Supplier haipo" };

  await prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.create({
      data: {
        supplierId,
        amount,
        paymentMethod,
        branchId,
        userId: session.user.id,
      },
    });

    await tx.expense.create({
      data: {
        category: "SUPPLIER_PAYMENT",
        amount,
        description: `Malipo kwa ${supplier.name}`,
        paymentMethod,
        branchId,
        userId: session.user.id,
        relatedSupplierPaymentId: payment.id,
      },
    });

    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: amount } },
    });
  });

  revalidatePath("/dashboard/admin/suppliers");
  revalidatePath("/dashboard/admin/expenses");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
