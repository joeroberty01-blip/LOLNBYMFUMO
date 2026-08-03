import "server-only";
import { prisma } from "@/lib/db";

export type PaymentHistoryRow = {
  id: string;
  type: "CUSTOMER" | "SUPPLIER";
  partyName: string;
  amount: number;
  paymentMethod: string;
  branchName: string | null;
  userName: string;
  createdAt: Date;
};

/** Merges CustomerPayment and SupplierPayment into one feed, newest first — there is no single
 * table for this, each payment type keeps its own model (see prisma/schema.prisma), so this
 * queries both and interleaves them by date. */
export async function getAllPaymentsHistory(limit = 200): Promise<PaymentHistoryRow[]> {
  const [customerPayments, supplierPayments] = await Promise.all([
    prisma.customerPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        customer: { select: { name: true } },
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.supplierPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        supplier: { select: { name: true } },
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const rows: PaymentHistoryRow[] = [
    ...customerPayments.map((p) => ({
      id: p.id,
      type: "CUSTOMER" as const,
      partyName: p.customer.name,
      amount: p.amount.toNumber(),
      paymentMethod: p.paymentMethod,
      branchName: p.branch?.name ?? null,
      userName: p.user.name,
      createdAt: p.createdAt,
    })),
    ...supplierPayments.map((p) => ({
      id: p.id,
      type: "SUPPLIER" as const,
      partyName: p.supplier.name,
      amount: p.amount.toNumber(),
      paymentMethod: p.paymentMethod,
      branchName: p.branch?.name ?? null,
      userName: p.user.name,
      createdAt: p.createdAt,
    })),
  ];

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows.slice(0, limit);
}
