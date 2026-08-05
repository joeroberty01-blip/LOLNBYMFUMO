import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";
import type { Prisma } from "@/generated/prisma/client";

const METHOD_LABEL: Record<string, string> = {
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  CASH: "Cash in Hand",
  TIGO_LIPA: "Tigo Lipa",
  VODA_LIPA: "M-Pesa Lipa",
};

/** Cosmetic account-code-style prefixes only, matching the reference report's numbering
 * convention — this app has no real chart of accounts, these are just display labels. */
const METHOD_CODE: Record<string, string> = {
  BANK_NMB: "10200",
  BANK_CRDB: "10201",
  CASH: "10300",
  TIGO_LIPA: "10400",
  VODA_LIPA: "10500",
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
  type: "SALE" | "PAYMENT" | "EXPENSE";
  date: Date;
  /** Invoice number for a cash sale; blank otherwise. */
  num: string;
  /** Customer name for a sale/payment; payee/description for an expense. */
  name: string;
  /** Item names for a sale, or a note for a payment; expense category for an expense. */
  memo: string;
  /** Secondary classification, QuickBooks-"Split"-style. */
  split: string;
  /** Signed: positive for a sale receipt/payment, negative for an expense. */
  amount: number;
};

export type LedgerSection = {
  method: string;
  code: string;
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

/**
 * A cash-basis ledger — this mirrors a bank statement, so it only shows money that actually
 * moved through an account, grouped by payment method:
 *   - Cash sales (isCredit: false) — cash is received in full at sale time, so the sale itself
 *     is the cash event.
 *   - Credit sales are deliberately EXCLUDED here (no cash changes hands at sale time — that's
 *     just a receivable). Including the full invoice amount here was the original bug: a
 *     customer who bought 1.2M on credit and later paid 1M would show as a 1.2M "Sales Receipt"
 *     even though only 1M had actually reached any account.
 *   - CustomerPayment rows (a customer paying down credit debt, in part or full) are the actual
 *     cash event for a credit sale, and are included here for the amount actually paid, dated
 *     when the payment happened — not when the original credit sale happened.
 *   - Expenses (including the auto-generated one from a SupplierPayment) are the cash-out side.
 * Deliberately simpler than getFinancialSummary in lib/accounting.ts (no COGS/Gross Profit,
 * no accrual revenue) — that function is the right one for "how much did we sell", this one is
 * for "what actually moved through the bank/cash/mobile-money accounts".
 */
export async function getLedgerReport(
  range: DateRange,
  filters: LedgerFilters = {}
): Promise<LedgerReport> {
  const saleWhere: Prisma.SaleWhereInput = {
    status: { not: "VOIDED" },
    isCredit: false,
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) saleWhere.branchId = filters.branchId;

  const expenseWhere: Prisma.ExpenseWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) expenseWhere.branchId = filters.branchId;

  const customerPaymentWhere: Prisma.CustomerPaymentWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };
  if (filters.branchId) customerPaymentWhere.branchId = filters.branchId;

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
  const customerPayments = await prisma.customerPayment.findMany({
    where: customerPaymentWhere,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      amount: true,
      paymentMethod: true,
      customer: { select: { name: true } },
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

  for (const p of customerPayments) {
    const entries = byMethod.get(p.paymentMethod) ?? [];
    entries.push({
      id: p.id,
      type: "PAYMENT",
      date: p.createdAt,
      num: "",
      name: p.customer.name,
      memo: "Debt Payment",
      split: "-SPLIT-",
      amount: p.amount.toNumber(),
    });
    byMethod.set(p.paymentMethod, entries);
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
      code: METHOD_CODE[method] ?? "",
      label: METHOD_LABEL[method] ?? method,
      entries,
      total: entries.reduce((sum, e) => sum + e.amount, 0),
    };
  }).filter((section) => section.entries.length > 0);

  const totalSales =
    sales.reduce((sum, s) => sum + s.total.toNumber(), 0) +
    customerPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0);

  return { sections, totalSales, totalExpenses, netProfit: totalSales - totalExpenses };
}
