import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";

const METHOD_LABEL: Record<string, string> = {
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  CASH: "Cash in Hand",
  TIGO_LIPA: "Tigo Lipa",
  VODA_LIPA: "M-Pesa / Voda Lipa",
};

const METHOD_ORDER = ["BANK_NMB", "BANK_CRDB", "CASH", "TIGO_LIPA", "VODA_LIPA"];

const CATEGORY_LABEL: Record<string, string> = {
  SUPPLIER_PAYMENT: "Supplier Payment",
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  OTHER: "Other",
};

export type LedgerEntry = {
  id: string;
  type: "SALE" | "EXPENSE";
  date: Date;
  /** Invoice number for a sale; blank for an expense. */
  num: string;
  /** Customer name for a sale; payee/description for an expense. */
  name: string;
  /** Item names for a sale; expense category for an expense. */
  memo: string;
  /** Secondary classification, QuickBooks-"Split"-style. */
  split: string;
  /** Signed: positive for a sale receipt, negative for an expense. */
  amount: number;
};

export type LedgerSection = {
  method: string;
  label: string;
  entries: LedgerEntry[];
  total: number;
};

export type LedgerReport = {
  sections: LedgerSection[];
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
};

export type LedgerFilters = { branchId?: string };

/** A clean cash-ledger view of the business — every Sale (as income) and Expense (as a negative
 * entry), grouped by payment method, with a per-method subtotal and an overall Total Sales /
 * Total Expenses / Net Profit at the bottom. Deliberately simpler than getFinancialSummary in
 * lib/accounting.ts (no COGS/Gross Profit split) — this mirrors a bank-statement-style ledger,
 * not a full P&L.
 */
export async function getLedgerReport(
  range: DateRange,
  filters: LedgerFilters = {}
): Promise<LedgerReport> {
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
  const sales = await prisma.sale.findMany({
    where: saleWhere,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      customer: { select: { name: true } },
      items: {
        select: {
          isManualEntry: true,
          manualItemName: true,
          part: { select: { name: true } },
        },
      },
    },
  });
  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      amount: true,
      paymentMethod: true,
      description: true,
      category: true,
    },
  });

  const byMethod = new Map<string, LedgerEntry[]>();
  for (const m of METHOD_ORDER) byMethod.set(m, []);

  for (const s of sales) {
    const entries = byMethod.get(s.paymentMethod) ?? [];
    const itemNames = s.items.map((i) => (i.isManualEntry ? i.manualItemName : i.part?.name) ?? "").filter(Boolean);
    entries.push({
      id: s.id,
      type: "SALE",
      date: s.createdAt,
      num: String(s.invoiceNumber),
      name: s.customer?.name ?? "",
      memo: itemNames.join(", "),
      split: "-SPLIT-",
      amount: s.total.toNumber(),
    });
    byMethod.set(s.paymentMethod, entries);
  }

  for (const e of expenses) {
    const entries = byMethod.get(e.paymentMethod) ?? [];
    const categoryLabel = CATEGORY_LABEL[e.category] ?? e.category;
    entries.push({
      id: e.id,
      type: "EXPENSE",
      date: e.createdAt,
      num: "",
      name: e.description ?? categoryLabel,
      memo: categoryLabel,
      split: categoryLabel,
      amount: -e.amount.toNumber(),
    });
    byMethod.set(e.paymentMethod, entries);
  }

  const sections: LedgerSection[] = METHOD_ORDER.map((method) => {
    const entries = (byMethod.get(method) ?? []).sort((a, b) => a.date.getTime() - b.date.getTime());
    return {
      method,
      label: METHOD_LABEL[method] ?? method,
      entries,
      total: entries.reduce((sum, e) => sum + e.amount, 0),
    };
  }).filter((section) => section.entries.length > 0);

  const totalSales = sales.reduce((sum, s) => sum + s.total.toNumber(), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0);

  return { sections, totalSales, totalExpenses, netProfit: totalSales - totalExpenses };
}
