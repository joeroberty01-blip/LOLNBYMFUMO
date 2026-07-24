"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  quickCustomerSchema,
  customerSchema,
  type QuickCustomerInput,
  type CustomerInput,
} from "@/lib/validators/customers";

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

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
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

  await prisma.customer.update({ where: { id: customerId }, data: parsed.data });
  revalidatePath("/dashboard/admin/customers");
  return { success: true, customerId };
}
