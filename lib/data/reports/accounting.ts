import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Accounting figures that sit *alongside* the P&L, not replacing it. Revenue/COGS/Gross
 * Profit/Expenses/Net Profit still come from lib/accounting.ts `getFinancialSummary` — the
 * single source of truth — and nothing here re-derives them.
 *
 * IMPORTANT — cost basis caveat, applies to every figure in this file and to COGS:
 * a regular SaleItem stores no cost of its own, so unit cost is read from the part's CURRENT
 * `Part.costPrice`. Editing a part's buying price therefore retroactively shifts the reported
 * profit of past sales. Manual (off-catalog) items are exempt: they snapshot
 * `SaleItem.manualCostPrice` at sale time. Fixing this properly needs a cost column on
 * SaleItem written at checkout; until then treat historical margins as approximate.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Stock valuation
// ---------------------------------------------------------------------------

export type StockValuationGroup = {
  key: string;
  label: string;
  units: number;
  costValue: number;
  retailValue: number;
  expectedProfit: number;
};

export type StockValuation = {
  /** What the stock on hand cost to buy — the balance-sheet value of inventory. */
  costValue: number;
  /** What that same stock would bring in if every unit sold at its list selling price. */
  retailValue: number;
  /** retailValue − costValue. Unrealized: it becomes real profit only as stock actually sells,
   * and only at list price — any discount at the till reduces it. */
  expectedProfit: number;
  /** expectedProfit as a share of retailValue. */
  expectedMarginPct: number;
  totalUnits: number;
  distinctParts: number;
  /** Parts that are active and in stock but priced at or below cost — every unit sold loses
   * money, so this is a pricing error to fix, not a margin to optimize. */
  nonProfitableParts: number;
  byBranch: StockValuationGroup[];
  byCategory: StockValuationGroup[];
};

export async function getStockValuation(branchId?: string): Promise<StockValuation> {
  const where: Prisma.InventoryWhereInput = { part: { isActive: true }, quantity: { gt: 0 } };
  if (branchId) where.branchId = branchId;

  const rows = await prisma.inventory.findMany({
    where,
    select: {
      quantity: true,
      branch: { select: { id: true, name: true } },
      part: { select: { id: true, category: true, costPrice: true, unitPrice: true } },
    },
  });

  let costValue = 0;
  let retailValue = 0;
  let totalUnits = 0;
  const parts = new Set<string>();
  const unprofitable = new Set<string>();
  const byBranch = new Map<string, StockValuationGroup>();
  const byCategory = new Map<string, StockValuationGroup>();

  function addTo(
    map: Map<string, StockValuationGroup>,
    key: string,
    label: string,
    units: number,
    cost: number,
    retail: number
  ) {
    const g = map.get(key) ?? { key, label, units: 0, costValue: 0, retailValue: 0, expectedProfit: 0 };
    g.units += units;
    g.costValue += cost;
    g.retailValue += retail;
    g.expectedProfit = g.retailValue - g.costValue;
    map.set(key, g);
  }

  for (const r of rows) {
    const cost = r.part.costPrice.toNumber();
    const list = r.part.unitPrice.toNumber();
    const lineCost = r.quantity * cost;
    const lineRetail = r.quantity * list;

    costValue += lineCost;
    retailValue += lineRetail;
    totalUnits += r.quantity;
    parts.add(r.part.id);
    if (list <= cost) unprofitable.add(r.part.id);

    addTo(byBranch, r.branch.id, r.branch.name, r.quantity, lineCost, lineRetail);
    addTo(byCategory, r.part.category, r.part.category, r.quantity, lineCost, lineRetail);
  }

  const expectedProfit = retailValue - costValue;

  return {
    costValue,
    retailValue,
    expectedProfit,
    expectedMarginPct: retailValue > 0 ? (expectedProfit / retailValue) * 100 : 0,
    totalUnits,
    distinctParts: parts.size,
    nonProfitableParts: unprofitable.size,
    byBranch: Array.from(byBranch.values()).sort((a, b) => b.costValue - a.costValue),
    byCategory: Array.from(byCategory.values()).sort((a, b) => b.costValue - a.costValue),
  };
}

// ---------------------------------------------------------------------------
// Positions (what we're owed / what we owe / what we're holding)
// ---------------------------------------------------------------------------

export type BalancePositions = {
  /** Owed to us by customers on credit sales. */
  receivables: number;
  customersOwing: number;
  /** Owed by us to suppliers. */
  payables: number;
  suppliersOwed: number;
  /** Cost-basis value of stock on hand. */
  stockCostValue: number;
  /** stock + receivables − payables. A working-capital snapshot, not a full balance sheet:
   * it deliberately excludes cash on hand, which this app does not track as an account. */
  netPosition: number;
};

export async function getBalancePositions(stockCostValue: number): Promise<BalancePositions> {
  // Sequential (not Promise.all) — the local Prisma Postgres dev server has been unreliable
  // under several concurrent connections in this environment (see README's migration note).
  const receivableAgg = await prisma.customer.aggregate({
    where: { isActive: true, balance: { gt: 0 } },
    _sum: { balance: true },
    _count: true,
  });
  const payableAgg = await prisma.supplier.aggregate({
    where: { isActive: true, balance: { gt: 0 } },
    _sum: { balance: true },
    _count: true,
  });

  const receivables = receivableAgg._sum.balance?.toNumber() ?? 0;
  const payables = payableAgg._sum.balance?.toNumber() ?? 0;

  return {
    receivables,
    customersOwing: receivableAgg._count,
    payables,
    suppliersOwed: payableAgg._count,
    stockCostValue,
    netPosition: stockCostValue + receivables - payables,
  };
}

// ---------------------------------------------------------------------------
// Pricing variance — sold above / below the catalog price
// ---------------------------------------------------------------------------

export type PricingVarianceRow = {
  partId: string;
  name: string;
  partNumber: string;
  category: string;
  quantitySold: number;
  listPrice: number;
  costPrice: number;
  /** Quantity-weighted average price this part actually sold for in the range. */
  avgSoldPrice: number;
  /** avgSoldPrice − listPrice. Positive = sold above list, negative = discounted. */
  diffPerUnit: number;
  diffPct: number;
  /** Total shillings gained (positive) or given away (negative) across every unit sold. */
  totalVariance: number;
  /** Realized gross profit on this part in the range: revenue − cost. */
  grossProfit: number;
  /** True when the average sold price fell below what the part cost to buy. */
  soldBelowCost: boolean;
};

export type PricingVariance = {
  overpriced: PricingVarianceRow[];
  underpriced: PricingVarianceRow[];
  belowCost: PricingVarianceRow[];
  /** Extra shillings earned on lines sold above list. */
  totalGained: number;
  /** Shillings given away as discounts on lines sold below list. */
  totalGivenAway: number;
  /** totalGained − totalGivenAway. Negative means discounting outweighed premiums. */
  netVariance: number;
  /** Lines that matched list price exactly. */
  atListCount: number;
  /** Non-catalog lines, which have no list price to compare against and are excluded here. */
  manualItemsExcluded: number;
};

/** Compares what each part actually sold for against its catalog selling price
 * (`Part.unitPrice`), so the admin can see where staff are discounting and where they're
 * charging a premium. Manual (off-catalog) items are excluded — they have no list price to
 * compare against — and counted separately so the exclusion is visible rather than silent. */
export async function getPricingVariance(
  range: DateRange,
  filters: { branchId?: string } = {}
): Promise<PricingVariance> {
  const saleWhere: Prisma.SaleWhereInput = {
    status: { not: "VOIDED" },
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) saleWhere.branchId = filters.branchId;

  const items = await prisma.saleItem.findMany({
    where: { sale: saleWhere },
    select: {
      quantity: true,
      unitPrice: true,
      isManualEntry: true,
      partId: true,
      part: {
        select: {
          id: true,
          name: true,
          partNumber: true,
          category: true,
          unitPrice: true,
          costPrice: true,
        },
      },
    },
  });

  type Acc = {
    row: PricingVarianceRow;
    revenue: number;
    cost: number;
  };
  const byPart = new Map<string, Acc>();
  let manualItemsExcluded = 0;
  let atListCount = 0;

  for (const it of items) {
    if (it.isManualEntry || !it.part) {
      manualItemsExcluded += 1;
      continue;
    }
    const sold = it.unitPrice.toNumber();
    const list = it.part.unitPrice.toNumber();
    const cost = it.part.costPrice.toNumber();
    if (sold === list) atListCount += 1;

    const acc =
      byPart.get(it.part.id) ??
      ({
        row: {
          partId: it.part.id,
          name: it.part.name,
          partNumber: it.part.partNumber,
          category: it.part.category,
          quantitySold: 0,
          listPrice: list,
          costPrice: cost,
          avgSoldPrice: 0,
          diffPerUnit: 0,
          diffPct: 0,
          totalVariance: 0,
          grossProfit: 0,
          soldBelowCost: false,
        },
        revenue: 0,
        cost: 0,
      } satisfies Acc);

    acc.row.quantitySold += it.quantity;
    acc.revenue += sold * it.quantity;
    acc.cost += cost * it.quantity;
    byPart.set(it.part.id, acc);
  }

  const rows: PricingVarianceRow[] = [];
  for (const acc of byPart.values()) {
    const r = acc.row;
    r.avgSoldPrice = r.quantitySold > 0 ? acc.revenue / r.quantitySold : 0;
    r.diffPerUnit = r.avgSoldPrice - r.listPrice;
    r.diffPct = r.listPrice > 0 ? (r.diffPerUnit / r.listPrice) * 100 : 0;
    r.totalVariance = r.diffPerUnit * r.quantitySold;
    r.grossProfit = acc.revenue - acc.cost;
    r.soldBelowCost = r.avgSoldPrice < r.costPrice;
    rows.push(r);
  }

  // Rounding guard: prices are Decimal(12,2), so anything under half a cent per unit is
  // float noise from the division above, not a real price difference.
  const EPSILON = 0.005;
  const overpriced = rows
    .filter((r) => r.diffPerUnit > EPSILON)
    .sort((a, b) => b.totalVariance - a.totalVariance);
  const underpriced = rows
    .filter((r) => r.diffPerUnit < -EPSILON)
    .sort((a, b) => a.totalVariance - b.totalVariance);
  const belowCost = rows
    .filter((r) => r.soldBelowCost)
    .sort((a, b) => a.grossProfit - b.grossProfit);

  const totalGained = overpriced.reduce((s, r) => s + r.totalVariance, 0);
  const totalGivenAway = underpriced.reduce((s, r) => s + Math.abs(r.totalVariance), 0);

  return {
    overpriced,
    underpriced,
    belowCost,
    totalGained,
    totalGivenAway,
    netVariance: totalGained - totalGivenAway,
    atListCount,
    manualItemsExcluded,
  };
}

// ---------------------------------------------------------------------------
// Dead stock — capital tied up in things that aren't selling
// ---------------------------------------------------------------------------

export type DeadStockRow = {
  partId: string;
  name: string;
  partNumber: string;
  units: number;
  costValue: number;
  lastSoldAt: Date | null;
  daysIdle: number | null;
};

/** Stock on hand that hasn't sold in `minDaysIdle` days, valued at cost — the money sitting
 * still on the shelf. Parts that have never sold are included, with a null last-sold date. */
export async function getDeadStock(minDaysIdle = 90, limit = 25): Promise<DeadStockRow[]> {
  const parts = await prisma.part.findMany({
    where: { isActive: true, inventory: { some: { quantity: { gt: 0 } } } },
    select: {
      id: true,
      name: true,
      partNumber: true,
      costPrice: true,
      inventory: { select: { quantity: true } },
      saleItems: {
        where: { sale: { status: { not: "VOIDED" } } },
        select: { sale: { select: { createdAt: true } } },
        orderBy: { sale: { createdAt: "desc" } },
        take: 1,
      },
    },
  });

  const now = Date.now();
  return parts
    .map((p) => {
      const units = p.inventory.reduce((s, i) => s + i.quantity, 0);
      const lastSoldAt = p.saleItems[0]?.sale.createdAt ?? null;
      const daysIdle = lastSoldAt ? Math.floor((now - lastSoldAt.getTime()) / DAY_MS) : null;
      return {
        partId: p.id,
        name: p.name,
        partNumber: p.partNumber,
        units,
        costValue: units * p.costPrice.toNumber(),
        lastSoldAt,
        daysIdle,
      };
    })
    .filter((r) => r.units > 0 && (r.daysIdle === null || r.daysIdle >= minDaysIdle))
    .sort((a, b) => b.costValue - a.costValue)
    .slice(0, limit);
}
