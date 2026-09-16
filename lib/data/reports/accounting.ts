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

// ---------------------------------------------------------------------------
// Balance sheet
// ---------------------------------------------------------------------------

export type BalanceSheetLine = { label: string; amount: number; note?: string };

export type BalanceSheet = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  /** Assets − Liabilities. Derived, not a reconciled capital account. */
  netWorth: number;
};

/**
 * A partial balance sheet built from what this app actually records, and honest about its gaps
 * rather than presenting figures it cannot support:
 *   - No cash/bank balances. The app stores a payment *method* on each transaction but never
 *     maintains account balances, so cash on hand is genuinely unknown.
 *   - No fixed assets, prepayments, accruals, loans, tax, or owner capital accounts.
 * What remains is working capital, and Net Worth is therefore a derivation
 * (Assets − Liabilities), not a reconciled equity figure.
 */
export async function getBalanceSheet(stockCostValue: number): Promise<BalanceSheet> {
  // Sequential (not Promise.all) — see the note in getBalancePositions.
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

  const assets: BalanceSheetLine[] = [
    { label: "Stock Iliyopo (kwa gharama)", amount: stockCostValue, note: "Inventory at cost" },
    {
      label: "Tunaowadai (Receivables)",
      amount: receivables,
      note: `Wateja ${receivableAgg._count} wenye deni kwetu`,
    },
  ];
  const liabilities: BalanceSheetLine[] = [
    {
      label: "Wanaotudai (Payables)",
      amount: payables,
      note: `Suppliers ${payableAgg._count} tunaowadai`,
    },
  ];

  const totalAssets = assets.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);

  return {
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

// ---------------------------------------------------------------------------
// Trial balance
// ---------------------------------------------------------------------------

export type TrialBalanceRow = { account: string; debit: number; credit: number; note?: string };

export type TrialBalance = {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
};

/**
 * A trial balance *derived* from single-entry data. This app records transactions, not journal
 * entries, so there are no real Dr/Cr postings to list — each figure below is computed from the
 * source tables and placed on its natural side.
 *
 * Consequence worth being explicit about: the two columns cannot independently corroborate each
 * other the way a genuine double-entry trial balance does, because the Mtaji/Retained line is a
 * balancing figure. The totals therefore always agree by construction. Read this as a
 * structured summary for review, never as evidence that the books balance.
 */
export async function getTrialBalance(
  range: DateRange,
  stockCostValue: number,
  summary: { totalRevenue: number; cogs: number; totalExpenses: number }
): Promise<TrialBalance> {
  const receivableAgg = await prisma.customer.aggregate({
    where: { isActive: true, balance: { gt: 0 } },
    _sum: { balance: true },
  });
  const payableAgg = await prisma.supplier.aggregate({
    where: { isActive: true, balance: { gt: 0 } },
    _sum: { balance: true },
  });

  const receivables = receivableAgg._sum.balance?.toNumber() ?? 0;
  const payables = payableAgg._sum.balance?.toNumber() ?? 0;

  const rows: TrialBalanceRow[] = [
    { account: "Stock (Inventory)", debit: stockCostValue, credit: 0, note: "Kwa gharama" },
    { account: "Tunaowadai (Receivables)", debit: receivables, credit: 0 },
    { account: "Gharama ya Mauzo (COGS)", debit: summary.cogs, credit: 0, note: range.label },
    { account: "Matumizi (Expenses)", debit: summary.totalExpenses, credit: 0, note: range.label },
    { account: "Wanaotudai (Payables)", debit: 0, credit: payables },
    { account: "Mauzo (Sales Revenue)", debit: 0, credit: summary.totalRevenue, note: range.label },
  ];

  const plug =
    rows.reduce((s, r) => s + r.debit, 0) - rows.reduce((s, r) => s + r.credit, 0);

  rows.push({
    account: "Mtaji / Retained",
    debit: plug < 0 ? -plug : 0,
    credit: plug > 0 ? plug : 0,
    note: "Kiasi cha kusawazisha — si akaunti halisi",
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return { rows, totalDebit, totalCredit, difference: totalDebit - totalCredit };
}

// ---------------------------------------------------------------------------
// Expense breakdown
// ---------------------------------------------------------------------------

export type ExpenseBreakdownRow = { category: string; amount: number; count: number; pct: number };

export async function getExpenseBreakdown(
  range: DateRange,
  filters: { branchId?: string } = {}
): Promise<ExpenseBreakdownRow[]> {
  const where: Prisma.ExpenseWhereInput = { createdAt: { gte: range.start, lte: range.end } };
  if (filters.branchId) where.branchId = filters.branchId;

  const grouped = await prisma.expense.groupBy({
    by: ["category"],
    where,
    _sum: { amount: true },
    _count: true,
  });

  const total = grouped.reduce((s, g) => s + (g._sum.amount?.toNumber() ?? 0), 0);
  return grouped
    .map((g) => {
      const amount = g._sum.amount?.toNumber() ?? 0;
      return {
        category: g.category,
        amount,
        count: g._count,
        pct: total > 0 ? (amount / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditEntryRow = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
};

export type AuditSummary = {
  totalEvents: number;
  byAction: { action: string; count: number }[];
  byUser: { userName: string; count: number }[];
  sensitive: AuditEntryRow[];
  sensitiveCount: number;
};

/** Void/delete/update actions — everything that alters or removes a record after it was first
 * written, plus stock adjustments and backup restores. These are what an owner actually needs
 * to review; routine creates are just normal trading. */
const SENSITIVE_ACTIONS = [
  "SALE_VOIDED",
  "SALE_UPDATED",
  "PURCHASE_DELETED",
  "PURCHASE_UPDATED",
  "EXPENSE_DELETED",
  "EXPENSE_UPDATED",
  "CUSTOMER_PAYMENT_DELETED",
  "SUPPLIER_PAYMENT_DELETED",
  "BACKUP_RESTORED",
  "STOCK_ADJUSTED",
];

export async function getAuditSummary(range: DateRange, limit = 30): Promise<AuditSummary> {
  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };

  const grouped = await prisma.auditLog.groupBy({ by: ["action"], where, _count: true });

  const logs = await prisma.auditLog.findMany({
    where,
    select: { user: { select: { name: true } } },
  });

  const sensitiveWhere: Prisma.AuditLogWhereInput = { ...where, action: { in: SENSITIVE_ACTIONS } };
  const sensitiveRows = await prisma.auditLog.findMany({
    where: sensitiveWhere,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      entityType: true,
      entityId: true,
      user: { select: { name: true } },
    },
  });
  const sensitiveCount = await prisma.auditLog.count({ where: sensitiveWhere });

  const byUserMap = new Map<string, number>();
  for (const l of logs) {
    const name = l.user?.name ?? "—";
    byUserMap.set(name, (byUserMap.get(name) ?? 0) + 1);
  }

  return {
    totalEvents: logs.length,
    byAction: grouped
      .map((g) => ({ action: g.action, count: g._count }))
      .sort((a, b) => b.count - a.count),
    byUser: Array.from(byUserMap.entries())
      .map(([userName, count]) => ({ userName, count }))
      .sort((a, b) => b.count - a.count),
    sensitive: sensitiveRows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      userName: r.user?.name ?? "—",
    })),
    sensitiveCount,
  };
}

// ---------------------------------------------------------------------------
// Data integrity checks
// ---------------------------------------------------------------------------

export type IntegrityCheck = {
  key: string;
  label: string;
  count: number;
  detail: string;
  severity: "danger" | "warning" | "ok";
  href?: string;
};

/** States that mean the books or the stock records need a human to look. Each is a concrete,
 * checkable condition read straight from the data — none of these is a heuristic guess. */
export async function getIntegrityChecks(range: DateRange): Promise<IntegrityCheck[]> {
  const negativeStock = await prisma.inventory.count({
    where: { quantity: { lt: 0 }, part: { isActive: true } },
  });

  // Two-column comparisons, which Prisma's filter API cannot express.
  const lossMaking = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "Part"
    WHERE "isActive" = true AND "unitPrice" <= "costPrice"
  `;
  const overLimit = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "Customer"
    WHERE "isActive" = true AND "creditLimit" > 0 AND balance > "creditLimit"
  `;

  const voided = await prisma.sale.count({
    where: { status: "VOIDED", createdAt: { gte: range.start, lte: range.end } },
  });
  const negativeCustomerBalance = await prisma.customer.count({
    where: { isActive: true, balance: { lt: 0 } },
  });
  const manualNoCost = await prisma.saleItem.count({
    where: { isManualEntry: true, manualCostPrice: null },
  });

  // Customer.balance is a running total kept in step by completeSale / voidSale / the payment
  // actions. It should always equal what the underlying documents say: credit sales less
  // collections. Any gap means one of those paths wrote one side and not the other, which no
  // screen would otherwise reveal — the balance would simply be quietly wrong.
  const customerBalanceDrift = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN (
        SELECT "customerId", SUM(total) AS charged FROM "Sale"
        WHERE "isCredit" = true AND status = 'COMPLETED' GROUP BY "customerId"
      ) s ON s."customerId" = c.id
      LEFT JOIN (
        SELECT "customerId", SUM(amount) AS paid FROM "CustomerPayment" GROUP BY "customerId"
      ) p ON p."customerId" = c.id
      WHERE ROUND(c.balance, 2)
          <> ROUND(COALESCE(s.charged, 0) - COALESCE(p.paid, 0), 2)
    ) drift
  `;

  const supplierBalanceDrift = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT sup.id
      FROM "Supplier" sup
      LEFT JOIN (
        SELECT "supplierId", SUM(total) AS charged FROM "Purchase" GROUP BY "supplierId"
      ) pu ON pu."supplierId" = sup.id
      LEFT JOIN (
        SELECT "supplierId", SUM(amount) AS paid FROM "SupplierPayment" GROUP BY "supplierId"
      ) pa ON pa."supplierId" = sup.id
      WHERE ROUND(sup.balance, 2)
          <> ROUND(COALESCE(pu.charged, 0) - COALESCE(pa.paid, 0), 2)
    ) drift
  `;

  // Payments that name a specific invoice must never add up to more than that invoice. The
  // payment actions refuse it, so a row here means something wrote around them.
  const overPaidInvoices = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT p."saleId"
      FROM "CustomerPayment" p
      JOIN "Sale" s ON s.id = p."saleId"
      WHERE p."saleId" IS NOT NULL
      GROUP BY p."saleId", s.total
      HAVING ROUND(SUM(p.amount), 2) > ROUND(s.total, 2)
    ) x
  `;

  const overPaidPurchases = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT p."purchaseId"
      FROM "SupplierPayment" p
      JOIN "Purchase" pu ON pu.id = p."purchaseId"
      WHERE p."purchaseId" IS NOT NULL
      GROUP BY p."purchaseId", pu.total
      HAVING ROUND(SUM(p.amount), 2) > ROUND(pu.total, 2)
    ) x
  `;

  return [
    {
      key: "negativeStock",
      label: "Stock hasi",
      count: negativeStock,
      detail: "Inventory iliyo chini ya sifuri — haiwezekani kimwili, inahitaji marekebisho.",
      severity: negativeStock > 0 ? "danger" : "ok",
      href: "/dashboard/admin/parts?stock=negative&sort=negative",
    },
    {
      key: "lossMakingPrices",
      label: "Parts zenye bei ya hasara",
      count: lossMaking[0]?.n ?? 0,
      detail: "Bei ya kuuzia iko chini au sawa na bei ya kununua — kila mauzo ni hasara.",
      severity: (lossMaking[0]?.n ?? 0) > 0 ? "danger" : "ok",
    },
    {
      key: "overCreditLimit",
      label: "Wateja waliozidi kikomo cha mkopo",
      count: overLimit[0]?.n ?? 0,
      detail: "Deni lao limezidi credit limit uliyowawekea.",
      severity: (overLimit[0]?.n ?? 0) > 0 ? "warning" : "ok",
      href: "/dashboard/admin/customers",
    },
    {
      key: "negativeCustomerBalance",
      label: "Wateja wenye balance hasi",
      count: negativeCustomerBalance,
      detail: "Wamelipa zaidi ya deni lao — huenda kuna malipo yaliyoingizwa mara mbili.",
      severity: negativeCustomerBalance > 0 ? "warning" : "ok",
      href: "/dashboard/admin/customers",
    },
    {
      key: "voidedSales",
      label: "Mauzo yaliyofutwa (kipindi hiki)",
      count: voided,
      detail: "Si kosa lenyewe, lakini idadi kubwa inastahili kuangaliwa.",
      severity: voided > 0 ? "warning" : "ok",
    },
    {
      key: "manualNoCost",
      label: "Manual items zisizo na gharama",
      count: manualNoCost,
      detail: "Hazina bei ya kununua, kwa hiyo faida yake inaonekana kubwa kuliko ilivyo.",
      severity: manualNoCost > 0 ? "warning" : "ok",
    },
    {
      key: "customerBalanceDrift",
      label: "Wateja: balance haikubaliani na invoice zao",
      count: customerBalanceDrift[0]?.n ?? 0,
      detail:
        "Deni lililohifadhiwa halilingani na (mauzo ya mkopo - malipo). Moja ya pande mbili haikuandikwa.",
      severity: (customerBalanceDrift[0]?.n ?? 0) > 0 ? "danger" : "ok",
      href: "/dashboard/admin/reports/customers",
    },
    {
      key: "supplierBalanceDrift",
      label: "Suppliers: balance haikubaliani na manunuzi yao",
      count: supplierBalanceDrift[0]?.n ?? 0,
      detail:
        "Deni lililohifadhiwa halilingani na (manunuzi - malipo). Moja ya pande mbili haikuandikwa.",
      severity: (supplierBalanceDrift[0]?.n ?? 0) > 0 ? "danger" : "ok",
      href: "/dashboard/admin/suppliers",
    },
    {
      key: "overPaidInvoices",
      label: "Invoice zilizolipwa zaidi ya deni lake",
      count: overPaidInvoices[0]?.n ?? 0,
      detail: "Malipo yaliyotengwa kwa invoice moja yamezidi jumla yake.",
      severity: (overPaidInvoices[0]?.n ?? 0) > 0 ? "danger" : "ok",
      href: "/dashboard/admin/reports/customers",
    },
    {
      key: "overPaidPurchases",
      label: "Manunuzi yaliyolipwa zaidi ya deni lake",
      count: overPaidPurchases[0]?.n ?? 0,
      detail: "Malipo yaliyotengwa kwa manunuzi moja yamezidi jumla yake.",
      severity: (overPaidPurchases[0]?.n ?? 0) > 0 ? "danger" : "ok",
      href: "/dashboard/admin/suppliers",
    },
  ];
}
