import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type ExpenseFilters = { category?: string; branchId?: string; q?: string };

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

function buildExpenseWhere(range: DateRange, filters: ExpenseFilters): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.category) {
    where.category = filters.category as Prisma.ExpenseWhereInput["category"];
  }
  if (filters.branchId) where.branchId = filters.branchId;
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { relatedSupplierPayment: { supplier: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  return where;
}

export async function getExpenses(
  range: DateRange,
  filters: ExpenseFilters,
  page: PageArgs
): Promise<Paginated<ExpenseRow>> {
  const where = buildExpenseWhere(range, filters);

  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
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
    }),
    prisma.expense.count({ where }),
  ]);

  const mapped = rows.map((r) => ({
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

  return paginated(mapped, total, page);
}

/** Sum of every expense matching the filter, independent of the current page — the "Total"
 * stat card must reflect the whole filtered period, not just the rows on screen. */
export async function getExpensesTotal(range: DateRange, filters: ExpenseFilters): Promise<number> {
  const where = buildExpenseWhere(range, filters);
  const agg = await prisma.expense.aggregate({ where, _sum: { amount: true } });
  return agg._sum.amount?.toNumber() ?? 0;
}
