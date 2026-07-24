import "server-only";
import { prisma } from "@/lib/db";
import { getBuckets, bucketKeyForDate, type DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Single source of truth for all financial calculations in the app. Every screen that shows
 * Revenue/COGS/Gross Profit/Expenses/Net Profit (Dashboard, Sales Report, PDF export) must call
 * this function rather than re-deriving the formulas locally.
 *
 * Definitions:
 *   Total Sales Revenue = SUM(Sale.total) for Sale.status != VOIDED in the date range
 *   COGS                = SUM(quantity * unit cost) for every SaleItem belonging to a non-voided
 *                          Sale in range — unit cost is Part.costPrice for regular items, or
 *                          SaleItem.manualCostPrice for manual (off-catalog) items
 *   Gross Profit        = Total Sales Revenue - COGS
 *   Total Expenses      = SUM(Expense.amount) in the date range (includes SUPPLIER_PAYMENT
 *                          expenses created automatically when a supplier payment is recorded)
 *   Net Profit          = Gross Profit - Total Expenses
 *
 * Worked example (see README "Financial Summary — Test Case" for the full walkthrough):
 *   Sales revenue: 500,000 · COGS: 300,000 · Expenses: 50,000
 *   -> Gross Profit: 200,000 · Net Profit: 150,000
 */

export type FinancialSummary = {
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
};

export type FinancialFilters = { branchId?: string };

export async function getFinancialSummary(
  range: DateRange,
  filters: FinancialFilters = {}
): Promise<FinancialSummary> {
  const saleWhere: Prisma.SaleWhereInput = {
    status: { not: "VOIDED" },
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) saleWhere.branchId = filters.branchId;

  const expenseWhere: Prisma.ExpenseWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) expenseWhere.branchId = filters.branchId;

  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const revenueAgg = await prisma.sale.aggregate({
    where: saleWhere,
    _sum: { total: true },
  });

  const saleItems = await prisma.saleItem.findMany({
    where: { sale: saleWhere },
    select: {
      quantity: true,
      isManualEntry: true,
      manualCostPrice: true,
      part: { select: { costPrice: true } },
    },
  });

  const expenseAgg = await prisma.expense.aggregate({
    where: expenseWhere,
    _sum: { amount: true },
  });

  let cogs = 0;
  for (const item of saleItems) {
    const unitCost = item.isManualEntry
      ? (item.manualCostPrice?.toNumber() ?? 0)
      : (item.part?.costPrice.toNumber() ?? 0);
    cogs += item.quantity * unitCost;
  }

  const totalRevenue = revenueAgg._sum.total?.toNumber() ?? 0;
  const grossProfit = totalRevenue - cogs;
  const totalExpenses = expenseAgg._sum.amount?.toNumber() ?? 0;
  const netProfit = grossProfit - totalExpenses;

  return { totalRevenue, cogs, grossProfit, totalExpenses, netProfit };
}

export type FinancialTrendPoint = {
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
};

/** Per-bucket (hour/day/month, matching range.granularity) Revenue vs Expenses vs Net Profit,
 * for the "Revenue vs Expenses vs Net Profit kwa muda" chart on the Sales Report. */
export async function getFinancialTrend(
  range: DateRange,
  filters: FinancialFilters = {}
): Promise<FinancialTrendPoint[]> {
  const saleWhere: Prisma.SaleWhereInput = {
    status: { not: "VOIDED" },
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) saleWhere.branchId = filters.branchId;

  const expenseWhere: Prisma.ExpenseWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) expenseWhere.branchId = filters.branchId;

  // Sequential (not Promise.all) — see note above.
  const sales = await prisma.sale.findMany({
    where: saleWhere,
    select: { total: true, createdAt: true },
  });
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: saleWhere },
    select: {
      quantity: true,
      isManualEntry: true,
      manualCostPrice: true,
      part: { select: { costPrice: true } },
      sale: { select: { createdAt: true } },
    },
  });
  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    select: { amount: true, createdAt: true },
  });

  const buckets = getBuckets(range);
  const revenueByBucket = new Map(buckets.map((b) => [b.key, 0]));
  const cogsByBucket = new Map(buckets.map((b) => [b.key, 0]));
  const expensesByBucket = new Map(buckets.map((b) => [b.key, 0]));

  for (const s of sales) {
    const key = bucketKeyForDate(s.createdAt, range.granularity);
    if (revenueByBucket.has(key)) {
      revenueByBucket.set(key, (revenueByBucket.get(key) ?? 0) + s.total.toNumber());
    }
  }

  for (const item of saleItems) {
    const key = bucketKeyForDate(item.sale.createdAt, range.granularity);
    if (cogsByBucket.has(key)) {
      const unitCost = item.isManualEntry
        ? (item.manualCostPrice?.toNumber() ?? 0)
        : (item.part?.costPrice.toNumber() ?? 0);
      cogsByBucket.set(key, (cogsByBucket.get(key) ?? 0) + item.quantity * unitCost);
    }
  }

  for (const e of expenses) {
    const key = bucketKeyForDate(e.createdAt, range.granularity);
    if (expensesByBucket.has(key)) {
      expensesByBucket.set(key, (expensesByBucket.get(key) ?? 0) + e.amount.toNumber());
    }
  }

  return buckets.map((b) => {
    const revenue = revenueByBucket.get(b.key) ?? 0;
    const cogs = cogsByBucket.get(b.key) ?? 0;
    const expensesAmt = expensesByBucket.get(b.key) ?? 0;
    return { label: b.label, revenue, expenses: expensesAmt, netProfit: revenue - cogs - expensesAmt };
  });
}
