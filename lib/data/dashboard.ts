import "server-only";
import { prisma } from "@/lib/db";
import { getDateRange } from "@/lib/dateRanges";
import { getDashboardSummary } from "@/lib/data/parts";

export async function getAdminDashboardMetrics() {
  const today = getDateRange({ period: "daily" });
  const thisMonth = getDateRange({ period: "monthly" });

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

  return {
    ...partsSummary,
    salesToday: salesToday._sum.total?.toNumber() ?? 0,
    salesTodayCount: salesToday._count._all,
    salesThisMonth: salesThisMonth._sum.total?.toNumber() ?? 0,
    totalCustomerDebt: customerDebt._sum.balance?.toNumber() ?? 0,
  };
}
