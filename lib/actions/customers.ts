"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  quickCustomerSchema,
  customerSchema,
  recordCustomerPaymentSchema,
  type QuickCustomerInput,
  type CustomerInput,
  type RecordCustomerPaymentInput,
} from "@/lib/validators/customers";
import { logAudit } from "@/lib/audit";
import { toCents, fromCents } from "@/lib/money";
import { customerInvoiceRemainingCents } from "@/lib/data/outstanding";

/** A rejection the admin should see verbatim, as opposed to an unexpected failure. Thrown inside
 * the transaction so the refusal also rolls back anything already written. */
class PaymentError extends Error {}
import { toWhatsAppNumber } from "@/lib/messaging";

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
export async function findOrCreateCustomerByName(
  name: string,
  phone?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.status !== "APPROVED") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "Andika jina la mteja" };
  }

  // A number typed at the POS is only accepted once it can actually be dialled — storing an
  // unusable one would produce a WhatsApp link that opens a chat with nobody.
  const typedPhone = phone?.trim() || undefined;
  if (typedPhone && !toWhatsAppNumber(typedPhone)) {
    return { success: false, error: "Namba ya simu haisomeki — mfano 0712345678" };
  }

  const existing = await prisma.customer.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, phone: true },
  });
  if (existing) {
    // Fill in a number the customer did not have before, so phone numbers accumulate as people
    // shop. An existing number is never overwritten here — correcting one is an explicit edit on
    // the Customers page, not a side effect of ringing up a sale.
    if (typedPhone && !existing.phone) {
      await prisma.customer.update({ where: { id: existing.id }, data: { phone: typedPhone } });
      revalidatePath("/dashboard/admin/customers");
    }
    return { success: true, customerId: existing.id };
  }

  const customer = await prisma.customer.create({
    data: { name: trimmed, phone: typedPhone ?? null, creditLimit: 0, balance: 0 },
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

/** Just the three fields the Tax Invoice page edits (see app/dashboard/admin/sales/[id]/invoice)
 * — deliberately bypasses the full customerSchema/updateCustomer path, which would otherwise
 * require resending name/phone/email/creditLimit unchanged just to touch these. */
export async function updateCustomerTaxDetails(
  customerId: string,
  input: { address?: string; tin?: string; vrn?: string }
): Promise<SimpleResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        address: input.address?.trim() || null,
        tin: input.tin?.trim() || null,
        vrn: input.vrn?.trim() || null,
      },
    });
  } catch {
    return { success: false, error: "Customer huyu hayupo tena" };
  }
  return { success: true };
}

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
  const { customerId, saleId, amount, paymentMethod, branchId } = parsed.data;
  const amountCents = toCents(amount);

  try {
    await prisma.$transaction((tx) =>
      applyCustomerPayment(tx, session.user.id, {
        customerId,
        saleId,
        amount,
        amountCents,
        paymentMethod,
        branchId,
      })
    );
  } catch (e) {
    if (e instanceof PaymentError) return { success: false, error: e.message };
    return { success: false, error: `Imeshindikana kurekodi malipo: ${(e as Error).message}` };
  }

  revalidatePath("/dashboard/admin/customers");
  revalidatePath(`/dashboard/admin/customers/${customerId}`);
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin/reports/customers");
  revalidatePath("/dashboard/admin");
  return { success: true };
}


/**
 * One payment, written on the caller's transaction so a batch of them is all-or-nothing.
 *
 * Every guard runs here rather than in the caller: whether the invoice belongs to this customer,
 * whether it still owes anything, and whether the amount fits both that invoice and the overall
 * balance. Postgres enforces the last one too (Customer_balance_check), but reaching it would
 * show the admin a constraint violation instead of a sentence.
 */
async function applyCustomerPayment(
  tx: Prisma.TransactionClient,
  userId: string,
  p: {
    customerId: string;
    saleId?: string;
    amount: number;
    amountCents: number;
    paymentMethod: RecordCustomerPaymentInput["paymentMethod"];
    branchId?: string;
  }
): Promise<void> {
  const customer = await tx.customer.findUnique({
    where: { id: p.customerId },
    select: { balance: true },
  });
  if (!customer) throw new PaymentError("Customer haipo");

  const balanceCents = toCents(customer.balance);
  if (p.amountCents > balanceCents) {
    throw new PaymentError(
      `Kiasi hiki kinazidi deni lote. Deni ni ${fromCents(balanceCents).toLocaleString("sw-TZ")} TZS.`
    );
  }

  if (p.saleId) {
    const remainingCents = await customerInvoiceRemainingCents(tx, p.customerId, p.saleId);
    if (remainingCents === null) throw new PaymentError("Invoice hii si ya mteja huyu");
    if (remainingCents <= 0) throw new PaymentError("Invoice hii tayari imelipwa yote");
    if (p.amountCents > remainingCents) {
      throw new PaymentError(
        `Kiasi kinazidi deni la invoice hii. Iliyobaki ni ${fromCents(remainingCents).toLocaleString("sw-TZ")} TZS.`
      );
    }
  }

  const payment = await tx.customerPayment.create({
    data: {
      customerId: p.customerId,
      saleId: p.saleId ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      branchId: p.branchId,
      userId,
    },
  });

  await tx.customer.update({
    where: { id: p.customerId },
    data: { balance: { decrement: p.amount } },
  });

  await logAudit(tx, {
    userId,
    action: "CUSTOMER_PAYMENT_RECORDED",
    entityType: "CustomerPayment",
    entityId: payment.id,
    metadata: {
      customerId: p.customerId,
      saleId: p.saleId ?? null,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      branchId: p.branchId,
    },
  });
}

/**
 * Collects against several invoices at once, in ONE transaction. Either every allocation is
 * recorded or none is — a half-applied collection would leave the balance disagreeing with the
 * invoices it is made of, which is the exact thing this module exists to prevent.
 */
export async function recordCustomerPaymentsPerInvoice(input: {
  customerId: string;
  paymentMethod: RecordCustomerPaymentInput["paymentMethod"];
  branchId?: string;
  allocations: { saleId: string; amount: number }[];
}): Promise<SimpleResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const rows = input.allocations.filter((a) => a.amount > 0);
  if (rows.length === 0) return { success: false, error: "Hakuna kiasi kilichowekwa" };

  const parsedRows: { saleId: string; amount: number; amountCents: number }[] = [];
  for (const r of rows) {
    const parsed = recordCustomerPaymentSchema.safeParse({
      customerId: input.customerId,
      saleId: r.saleId,
      amount: r.amount,
      paymentMethod: input.paymentMethod,
      branchId: input.branchId,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Data si sahihi" };
    }
    parsedRows.push({ saleId: r.saleId, amount: parsed.data.amount, amountCents: toCents(parsed.data.amount) });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of parsedRows) {
        await applyCustomerPayment(tx, session.user.id, {
          customerId: input.customerId,
          saleId: r.saleId,
          amount: r.amount,
          amountCents: r.amountCents,
          paymentMethod: input.paymentMethod,
          branchId: input.branchId,
        });
      }
    });
  } catch (e) {
    if (e instanceof PaymentError) return { success: false, error: e.message };
    return { success: false, error: `Imeshindikana kurekodi malipo: ${(e as Error).message}` };
  }

  revalidatePath("/dashboard/admin/customers");
  revalidatePath(`/dashboard/admin/customers/${input.customerId}`);
  revalidatePath("/dashboard/admin/purchases");
  revalidatePath("/dashboard/admin/reports/customers");
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
