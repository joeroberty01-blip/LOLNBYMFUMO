"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  quickCustomerSchema,
  customerSchema,
  recordCustomerPaymentSchema,
  type QuickCustomerInput,
  type CustomerInput,
  type RecordCustomerPaymentInput,
} from "@/lib/validators/customers";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true; customerId: string } | { success: false; error: string };

/** Usable by any authenticated (approved) user — e.g. sales staff adding a customer mid-POS. */
export async function createCustomerQuick(input: QuickCustomerInput): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.status !== "APPROVED") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }

  const parsed = quickCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  const customer = await prisma.customer.create({
    data: { ...parsed.data, creditLimit: 0, balance: 0 },
  });
  revalidatePath("/dashboard/admin/customers");
  return { success: true, customerId: customer.id };
}

/** Typing a customer's name at the start of a POS sale is the fast path — reuse the existing
 * Customer record if that name is already on file (case-insensitive), otherwise create one on
 * the spot with just the name. Either way it shows up on the Customers page like any other. */
export async function findOrCreateCustomerByName(name: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.status !== "APPROVED") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Andika jina la mteja" };
  }

  const existing = await prisma.customer.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return { success: true, customerId: existing.id };
  }

  const customer = await prisma.customer.create({
    data: { name: trimmed, phone: null, creditLimit: 0, balance: 0 },
  });
  revalidatePath("/dashboard/admin/customers");
  return { success: true, customerId: customer.id };
}

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  const customer = await prisma.customer.create({
    data: { ...parsed.data, balance: 0 },
  });
  revalidatePath("/dashboard/admin/customers");
  return { success: true, customerId: customer.id };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }

  try {
    await prisma.customer.update({ where: { id: customerId }, data: parsed.data });
  } catch {
    return { success: false, error: "Customer huyu hayupo tena (huenda ameshafutwa)" };
  }
  revalidatePath("/dashboard/admin/customers");
  return { success: true, customerId };
}

type SimpleResult = { success: true } | { success: false; error: string };

export async function archiveCustomer(customerId: string): Promise<SimpleResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { success: false, error: "Customer not found" };
  if (customer.balance.toNumber() > 0) {
    return {
      success: false,
      error: "This customer still has an outstanding balance — settle it before archiving",
    };
  }

  // Soft delete only — isActive: false. Sale history referencing this customer must never be
  // hard-deleted, and no hard-delete path is exposed anywhere in this app (same convention as
  // deletePart).
  await prisma.customer.update({ where: { id: customerId }, data: { isActive: false } });
  revalidatePath("/dashboard/admin/customers");
  return { success: true };
}

/**
 * Records a cash collection against a customer's outstanding debt. This only reduces
 * Customer.balance — it must NOT create a Sale (revenue for this amount was already recognized
 * at the original credit sale, so a second Sale would double-count it) and must NOT create an
 * Expense (no cash left the business). See CustomerPayment model comment in schema.prisma.
 */
export async function recordCustomerPayment(input: RecordCustomerPaymentInput): Promise<SimpleResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = recordCustomerPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
  }
  const { customerId, amount, paymentMethod, branchId } = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { success: false, error: "Customer haipo" };

  await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.create({
      data: {
        customerId,
        amount,
        paymentMethod,
        branchId,
        userId: session.user.id,
      },
    });

    await tx.customer.update({
      where: { id: customerId },
      data: { balance: { decrement: amount } },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "CUSTOMER_PAYMENT_RECORDED",
      entityType: "CustomerPayment",
      entityId: payment.id,
      metadata: { customerId, amount, paymentMethod, branchId },
    });
  });

  revalidatePath("/dashboard/admin/customers");
  revalidatePath(`/dashboard/admin/customers/${customerId}`);
  revalidatePath("/dashboard/admin");
  return { success: true };
}

/**
 * Reverses a recorded customer payment: puts the amount back on the customer's balance and
 * deletes the CustomerPayment row. No Expense to undo here — recordCustomerPayment never
 * creates one (see its own comment).
 */
export async function deleteCustomerPayment(paymentId: string): Promise<SimpleResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const payment = await prisma.customerPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, error: "Malipo haya hayapo" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: payment.customerId },
        data: { balance: { increment: payment.amount } },
      });
      await logAudit(tx, {
        userId: session.user.id,
        action: "CUSTOMER_PAYMENT_DELETED",
        entityType: "CustomerPayment",
        entityId: paymentId,
        metadata: { customerId: payment.customerId, amount: payment.amount.toNumber() },
      });
      await tx.customerPayment.delete({ where: { id: paymentId } });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kufuta malipo" };
  }

  revalidatePath("/dashboard/admin/customers");
  revalidatePath(`/dashboard/admin/customers/${payment.customerId}`);
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
