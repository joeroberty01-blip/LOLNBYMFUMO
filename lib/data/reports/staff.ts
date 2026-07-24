import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";

export type StaffPerformanceRow = {
  userId: string;
  name: string;
  transactionCount: number;
  totalSales: number;
  manualItemCount: number;
};

export async function getStaffPerformance(range: DateRange): Promise<StaffPerformanceRow[]> {
  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED", createdAt: { gte: range.start, lte: range.end } },
    select: {
      total: true,
      userId: true,
      user: { select: { name: true } },
      items: { select: { isManualEntry: true } },
    },
  });

  const byUser = new Map<string, StaffPerformanceRow>();
  for (const s of sales) {
    const existing = byUser.get(s.userId) ?? {
      userId: s.userId,
      name: s.user.name,
      transactionCount: 0,
      totalSales: 0,
      manualItemCount: 0,
    };
    existing.transactionCount += 1;
    existing.totalSales += s.total.toNumber();
    existing.manualItemCount += s.items.filter((i) => i.isManualEntry).length;
    byUser.set(s.userId, existing);
  }

  return Array.from(byUser.values()).sort((a, b) => b.totalSales - a.totalSales);
}

export type MyPerformance = {
  transactionCount: number;
  totalSales: number;
  manualItemCount: number;
  voidedCount: number;
};

export async function getMyPerformance(userId: string, range: DateRange): Promise<MyPerformance> {
  const sales = await prisma.sale.findMany({
    where: { userId, createdAt: { gte: range.start, lte: range.end } },
    select: {
      total: true,
      status: true,
      items: { select: { isManualEntry: true } },
    },
  });

  const completed = sales.filter((s) => s.status === "COMPLETED");

  return {
    transactionCount: completed.length,
    totalSales: completed.reduce((sum, s) => sum + s.total.toNumber(), 0),
    manualItemCount: completed.reduce(
      (sum, s) => sum + s.items.filter((i) => i.isManualEntry).length,
      0
    ),
    voidedCount: sales.filter((s) => s.status === "VOIDED").length,
  };
}
