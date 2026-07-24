import "server-only";
import {
  eachHourOfInterval,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";

export type SalesReportFilters = {
  branchId?: string;
  userId?: string;
  paymentMethod?: string;
};

function buildWhere(range: DateRange, filters: SalesReportFilters): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {
    status: "COMPLETED",
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod as Prisma.SaleWhereInput["paymentMethod"];
  }
  return where;
}

type SaleRow = { total: Prisma.Decimal; paymentMethod: string; isCredit: boolean; createdAt: Date };

function buildChartBuckets(range: DateRange, sales: SaleRow[]) {
  let buckets: { key: string; label: string }[];

  if (range.granularity === "hour") {
    buckets = eachHourOfInterval({ start: range.start, end: range.end }).map((d) => ({
      key: format(d, "yyyy-MM-dd HH"),
      label: format(d, "HH:00"),
    }));
  } else if (range.granularity === "month") {
    buckets = eachMonthOfInterval({ start: range.start, end: range.end }).map((d) => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM"),
    }));
  } else {
    buckets = eachDayOfInterval({ start: range.start, end: range.end }).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "d MMM"),
    }));
  }

  const totals = new Map(buckets.map((b) => [b.key, 0]));
  for (const s of sales) {
    const key =
      range.granularity === "hour"
        ? format(s.createdAt, "yyyy-MM-dd HH")
        : range.granularity === "month"
          ? format(s.createdAt, "yyyy-MM")
          : format(s.createdAt, "yyyy-MM-dd");
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + s.total.toNumber());
    }
  }

  return buckets.map((b) => ({ label: b.label, total: totals.get(b.key) ?? 0 }));
}

export type SalesReportSummary = {
  totalSales: number;
  transactionCount: number;
  creditTotal: number;
  cashTotal: number;
  byPaymentMethod: { method: string; total: number; count: number }[];
  chartData: { label: string; total: number }[];
};

export async function getSalesReport(
  range: DateRange,
  filters: SalesReportFilters
): Promise<SalesReportSummary> {
  const where = buildWhere(range, filters);
  const sales = await prisma.sale.findMany({
    where,
    select: { total: true, paymentMethod: true, isCredit: true, createdAt: true },
  });

  let totalSales = 0;
  let creditTotal = 0;
  let cashTotal = 0;
  const byMethod = new Map<string, { total: number; count: number }>();

  for (const s of sales) {
    const amt = s.total.toNumber();
    totalSales += amt;
    if (s.isCredit) creditTotal += amt;
    else cashTotal += amt;
    const existing = byMethod.get(s.paymentMethod) ?? { total: 0, count: 0 };
    existing.total += amt;
    existing.count += 1;
    byMethod.set(s.paymentMethod, existing);
  }

  return {
    totalSales,
    transactionCount: sales.length,
    creditTotal,
    cashTotal,
    byPaymentMethod: Array.from(byMethod.entries()).map(([method, v]) => ({ method, ...v })),
    chartData: buildChartBuckets(range, sales),
  };
}

export type SalesReportRow = {
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  sellerName: string;
  customerName: string | null;
  paymentMethod: string;
  isCredit: boolean;
  total: number;
};

export async function getSalesReportRows(
  range: DateRange,
  filters: SalesReportFilters
): Promise<SalesReportRow[]> {
  const where = buildWhere(range, filters);
  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      invoiceNumber: true,
      createdAt: true,
      paymentMethod: true,
      isCredit: true,
      total: true,
      branch: { select: { name: true } },
      user: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  return sales.map((s) => ({
    invoiceNumber: s.invoiceNumber,
    createdAt: s.createdAt,
    branchName: s.branch.name,
    sellerName: s.user.name,
    customerName: s.customer?.name ?? null,
    paymentMethod: s.paymentMethod,
    isCredit: s.isCredit,
    total: s.total.toNumber(),
  }));
}
