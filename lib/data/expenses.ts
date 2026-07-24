import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";

export type ExpenseFilters = { category?: string; branchId?: string };

export type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  paymentMethod: string;
  branchName: string | null;
  userName: string;
  createdAt: Date;
  isEditable: boolean;
  supplierName: string | null;
};

export async function getExpenses(
  range: DateRange,
  filters: ExpenseFilters = {}
): Promise<ExpenseRow[]> {
  const where: Prisma.ExpenseWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.category) {
    where.category = filters.category as Prisma.ExpenseWhereInput["category"];
  }
  if (filters.branchId) where.branchId = filters.branchId;

  const rows = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      amount: true,
      description: true,
      paymentMethod: true,
      createdAt: true,
      relatedSupplierPaymentId: true,
      branch: { select: { name: true } },
      user: { select: { name: true } },
      relatedSupplierPayment: { select: { supplier: { select: { name: true } } } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    amount: r.amount.toNumber(),
    description: r.description,
    paymentMethod: r.paymentMethod,
    branchName: r.branch?.name ?? null,
    userName: r.user.name,
    createdAt: r.createdAt,
    isEditable: r.relatedSupplierPaymentId === null,
    supplierName: r.relatedSupplierPayment?.supplier.name ?? null,
  }));
}
