import "server-only";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { getDateRange } from "@/lib/dateRanges";
import { getDashboardSummary } from "@/lib/data/parts";
import { getFinancialSummary } from "@/lib/accounting";

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function getAdminDashboardMetrics() {
  const today = getDateRange({ period: "daily" });
  const thisMonth = getDateRange({ period: "monthly" });
  const now = new Date();
  const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = getDateRange({
    period: "monthly",
    year: String(lastMonthAnchor.getFullYear()),
    month: String(lastMonthAnchor.getMonth() + 1),
  });

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const partsSummary = await getDashboardSummary();
  const salesToday = await prisma.sale.aggregate({
    where: { status: "COMPLETED", createdAt: { gte: today.start, lte: today.end } },
    _sum: { total: true },
    _count: { _all: true },
  });
  const salesThisMonth = await prisma.sale.aggregate({
    where: { status: "COMPLETED", createdAt: { gte: thisMonth.start, lte: thisMonth.end } },
    _sum: { total: true },
  });
  const customerDebt = await prisma.customer.aggregate({ _sum: { balance: true } });
  const financialToday = await getFinancialSummary(today);
  const financialThisMonth = await getFinancialSummary(thisMonth);
  const financialLastMonth = await getFinancialSummary(lastMonth);

  return {
    ...partsSummary,
    salesToday: salesToday._sum.total?.toNumber() ?? 0,
    salesTodayCount: salesToday._count._all,
    salesThisMonth: salesThisMonth._sum.total?.toNumber() ?? 0,
    totalCustomerDebt: customerDebt._sum.balance?.toNumber() ?? 0,
    netProfitToday: financialToday.netProfit,
    netProfitThisMonth: financialThisMonth.netProfit,
    netProfitChangePct: percentChange(financialThisMonth.netProfit, financialLastMonth.netProfit),
  };
}

export type MonthlyProfitPoint = { label: string; netProfit: number };

/** Net Profit for each of the last `monthsBack` calendar months (oldest first). */
export async function getMonthlyProfitTrend(monthsBack = 12): Promise<MonthlyProfitPoint[]> {
  const now = new Date();
  const points: MonthlyProfitPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const range = getDateRange({
      period: "monthly",
      year: String(anchor.getFullYear()),
      month: String(anchor.getMonth() + 1),
    });
    // Sequential — single source of truth via getFinancialSummary, see note above.
    const summary = await getFinancialSummary(range);
    points.push({ label: format(anchor, "MMM"), netProfit: summary.netProfit });
  }
  return points;
}

export type BranchSalesPoint = { branchName: string; total: number };

export async function getSalesByBranch(range: { start: Date; end: Date }): Promise<BranchSalesPoint[]> {
  const rows = await prisma.sale.groupBy({
    by: ["branchId"],
    where: { status: { not: "VOIDED" }, createdAt: { gte: range.start, lte: range.end } },
    _sum: { total: true },
  });
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const nameById = new Map(branches.map((b) => [b.id, b.name]));

  return rows
    .map((r) => ({
      branchName: nameById.get(r.branchId) ?? "—",
      total: r._sum.total?.toNumber() ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export type ExpenseBreakdownPoint = { category: string; total: number };

export async function getExpenseBreakdown(range: {
  start: Date;
  end: Date;
}): Promise<ExpenseBreakdownPoint[]> {
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { createdAt: { gte: range.start, lte: range.end } },
    _sum: { amount: true },
  });
  return rows
    .map((r) => ({ category: r.category, total: r._sum.amount?.toNumber() ?? 0 }))
    .sort((a, b) => b.total - a.total);
}

export type RecentTransaction = {
  id: string;
  invoiceNumber: number;
  createdAt: Date;
  total: number;
  paymentMethod: string;
  status: "COMPLETED" | "VOIDED";
  customerName: string | null;
};

export async function getRecentTransactions(limit = 6): Promise<RecentTransaction[]> {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      status: true,
      customer: { select: { name: true } },
    },
  });

  return sales.map((s) => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    createdAt: s.createdAt,
    total: s.total.toNumber(),
    paymentMethod: s.paymentMethod,
    status: s.status,
    customerName: s.customer?.name ?? null,
  }));
}
