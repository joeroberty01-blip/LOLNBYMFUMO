import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toCents, fromCents, settleOpenItems } from "@/lib/money";

/**
 * What one invoice still owes, recomputed from scratch inside the caller's transaction.
 *
 * Deliberately not read from a cached figure: it is the number an incoming payment is checked
 * against, so it has to be correct at the instant the money is recorded. Running it on the
 * transaction's client also means two admins collecting on the same invoice at once cannot both
 * be told there is room for a full payment.
 *
 * Returns null when the document does not belong to that party, which the caller treats as a
 * rejection rather than as "nothing outstanding".
 */

export async function customerInvoiceRemainingCents(
  tx: Prisma.TransactionClient,
  customerId: string,
  saleId: string
): Promise<number | null> {
  const sales = await tx.sale.findMany({
    where: { customerId, isCredit: true, status: "COMPLETED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, total: true },
  });
  if (!sales.some((s) => s.id === saleId)) return null;

  const payments = await tx.customerPayment.findMany({
    where: { customerId },
    select: { saleId: true, amount: true },
  });

  const { remainingById } = settle(sales, payments, "saleId");
  return remainingById.get(saleId) ?? 0;
}

export async function supplierPurchaseRemainingCents(
  tx: Prisma.TransactionClient,
  supplierId: string,
  purchaseId: string
): Promise<number | null> {
  const purchases = await tx.purchase.findMany({
    where: { supplierId },
    orderBy: { createdAt: "asc" },
    select: { id: true, total: true },
  });
  if (!purchases.some((p) => p.id === purchaseId)) return null;

  const payments = await tx.supplierPayment.findMany({
    where: { supplierId },
    select: { purchaseId: true, amount: true },
  });

  const { remainingById } = settle(purchases, payments, "purchaseId");
  return remainingById.get(purchaseId) ?? 0;
}

/** The shared half of both functions above: split payments into named and pooled, then settle. */
function settle<K extends "saleId" | "purchaseId">(
  documents: { id: string; total: Prisma.Decimal }[],
  payments: ({ amount: Prisma.Decimal } & { [P in K]: string | null })[],
  key: K
) {
  const allocated = new Map<string, number>();
  let pool = 0;
  for (const p of payments) {
    const cents = toCents(p.amount);
    const target = p[key];
    if (target) allocated.set(target, (allocated.get(target) ?? 0) + cents);
    else pool += cents;
  }

  return settleOpenItems(
    documents.map((d) => ({
      id: d.id,
      totalCents: toCents(d.total),
      allocatedCents: allocated.get(d.id) ?? 0,
    })),
    pool
  );
}

export type OpenDocument = {
  id: string;
  label: string;
  date: Date;
  total: number;
  remaining: number;
};

/** The unpaid invoices of one customer, for the per-invoice collection modal. Same settlement
 * rule as the debt report, just scoped to a single customer. */
export async function getOpenInvoicesForCustomer(customerId: string): Promise<OpenDocument[]> {
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId, isCredit: true, status: "COMPLETED" },
      orderBy: { createdAt: "asc" },
      select: { id: true, invoiceNumber: true, createdAt: true, total: true },
    }),
    prisma.customerPayment.findMany({
      where: { customerId },
      select: { saleId: true, amount: true },
    }),
  ]);

  const { remainingById } = settle(sales, payments, "saleId");
  return sales
    .map((s) => ({
      id: s.id,
      label: `Invoice #${s.invoiceNumber}`,
      date: s.createdAt,
      total: s.total.toNumber(),
      remaining: fromCents(remainingById.get(s.id) ?? 0),
    }))
    .filter((s) => s.remaining > 0);
}

/** The unpaid purchases of one supplier. */
export async function getOpenPurchasesForSupplier(supplierId: string): Promise<OpenDocument[]> {
  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({
      where: { supplierId },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, total: true },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId },
      select: { purchaseId: true, amount: true },
    }),
  ]);

  const { remainingById } = settle(purchases, payments, "purchaseId");
  return purchases
    .map((p) => ({
      id: p.id,
      label: `Manunuzi ${p.createdAt.toLocaleDateString("sw-TZ")}`,
      date: p.createdAt,
      total: p.total.toNumber(),
      remaining: fromCents(remainingById.get(p.id) ?? 0),
    }))
    .filter((p) => p.remaining > 0);
}
