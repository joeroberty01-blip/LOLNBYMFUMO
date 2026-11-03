import "server-only";
import { prisma } from "@/lib/db";
import { getCustomerDebtItems } from "@/lib/data/reports/customers";
import { getSupplierDebtItems } from "@/lib/data/suppliers";
import { searchPartSaleHistory, getLowStockReport, getTopSellingParts } from "@/lib/data/reports/inventory";
import type Anthropic from "@anthropic-ai/sdk";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Every tool the admin chatbot can call, each wrapping an existing read-only data-layer
 * function (or a small direct query) and shrinking its output to what a brief chat answer
 * needs — full lists are capped and numbers pre-formatted so the model doesn't have to restate
 * a huge payload back to the admin. Nothing here writes to the database. */
export const CHATBOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_customer_debts",
    description:
      "Get customers who owe money (credit sales not yet paid). Pass customerName to look up one customer; omit it to get the overall total and the biggest debtors.",
    input_schema: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Customer name to search for (partial match ok)" },
      },
    },
  },
  {
    name: "get_supplier_debts",
    description:
      "Get suppliers the business owes money to (unpaid credit purchases). Pass supplierName to look up one; omit it for the overall total and biggest debts.",
    input_schema: {
      type: "object",
      properties: {
        supplierName: { type: "string", description: "Supplier name to search for (partial match ok)" },
      },
    },
  },
  {
    name: "search_part",
    description:
      "Look up a spare part by name or part number: current stock per store and how many times/when it has sold.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part name or part number to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_sales_summary",
    description: "Total sales, count, and profit over the trailing N days (cash + credit sales combined).",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "integer", description: "Number of trailing days to include (default 1 = today)" },
      },
    },
  },
  {
    name: "get_top_selling_parts",
    description: "The best-selling parts over the trailing N days, by quantity sold.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "integer", description: "Number of trailing days to include (default 30)" },
      },
    },
  },
  {
    name: "get_low_stock",
    description: "Parts currently below their low-stock threshold at any branch.",
    input_schema: { type: "object", properties: {} },
  },
];

async function toolGetCustomerDebts(input: { customerName?: string }) {
  const debtors = await getCustomerDebtItems({ scope: "all" });
  if (input.customerName) {
    const q = input.customerName.trim().toLowerCase();
    const matches = debtors
      .filter((d) => d.name.toLowerCase().includes(q))
      .map((d) => ({
        name: d.name,
        phone: d.phone,
        balance: currency.format(d.balance),
        openInvoices: d.items.length,
      }));
    return { matches: matches.length > 0 ? matches : `No debtor found matching "${input.customerName}"` };
  }
  const total = debtors.reduce((sum, d) => sum + d.balance, 0);
  const top = debtors.slice(0, 10).map((d) => ({ name: d.name, balance: currency.format(d.balance) }));
  return { totalDebt: currency.format(total), debtorCount: debtors.length, topDebtors: top };
}

async function toolGetSupplierDebts(input: { supplierName?: string }) {
  const debtors = await getSupplierDebtItems();
  if (input.supplierName) {
    const q = input.supplierName.trim().toLowerCase();
    const matches = debtors
      .filter((d) => d.name.toLowerCase().includes(q))
      .map((d) => ({ name: d.name, balance: currency.format(d.balance), openPurchases: d.items.length }));
    return { matches: matches.length > 0 ? matches : `No supplier debt found matching "${input.supplierName}"` };
  }
  const total = debtors.reduce((sum, d) => sum + d.balance, 0);
  const top = debtors.slice(0, 10).map((d) => ({ name: d.name, balance: currency.format(d.balance) }));
  return { totalOwed: currency.format(total), supplierCount: debtors.length, topOwed: top };
}

async function toolSearchPart(input: { query: string }) {
  const [results, stock] = await Promise.all([
    searchPartSaleHistory(input.query, 5),
    prisma.part.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: input.query, mode: "insensitive" } },
          { partNumber: { contains: input.query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: {
        name: true,
        partNumber: true,
        unitPrice: true,
        inventory: { select: { quantity: true, branch: { select: { name: true } } } },
      },
    }),
  ]);

  if (results.length === 0 && stock.length === 0) {
    return { result: `No part found matching "${input.query}"` };
  }

  return {
    matches: results.map((r) => ({
      name: r.name,
      partNumber: r.partNumber,
      timesSold: r.timesSold,
      totalQuantitySold: r.totalQuantity,
      lastSoldAt: r.lastSoldAt ? r.lastSoldAt.toISOString().slice(0, 10) : null,
    })),
    currentStock: stock.map((p) => ({
      name: p.name,
      partNumber: p.partNumber,
      unitPrice: currency.format(p.unitPrice.toNumber()),
      stockByBranch: p.inventory.map((i) => `${i.branch.name}: ${i.quantity}`),
    })),
  };
}

async function toolGetSalesSummary(input: { days?: number }) {
  const days = input.days && input.days > 0 ? input.days : 1;
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { status: "COMPLETED", createdAt: { gte: since } },
    select: {
      total: true,
      isCredit: true,
      items: { select: { quantity: true, unitPrice: true, part: { select: { costPrice: true } } } },
    },
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.total.toNumber(), 0);
  const creditRevenue = sales.filter((s) => s.isCredit).reduce((sum, s) => sum + s.total.toNumber(), 0);
  const estProfit = sales.reduce(
    (sum, s) =>
      sum +
      s.items.reduce(
        (isum, i) => isum + i.quantity * (i.unitPrice.toNumber() - (i.part?.costPrice.toNumber() ?? 0)),
        0
      ),
    0
  );

  return {
    periodDays: days,
    saleCount: sales.length,
    totalRevenue: currency.format(totalRevenue),
    creditRevenue: currency.format(creditRevenue),
    cashRevenue: currency.format(totalRevenue - creditRevenue),
    estimatedProfit: currency.format(estProfit),
  };
}

async function toolGetTopSellingParts(input: { days?: number }) {
  const days = input.days && input.days > 0 ? input.days : 30;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const items = await getTopSellingParts({ start, end, label: "", granularity: "day" }, 10);
  return {
    periodDays: days,
    topParts: items.map((i) => ({
      name: i.name,
      partNumber: i.partNumber,
      quantitySold: i.quantitySold,
      valueSold: currency.format(i.valueSold),
    })),
  };
}

async function toolGetLowStock() {
  const rows = await getLowStockReport();
  return {
    lowStockCount: rows.length,
    items: rows.slice(0, 20).map((r) => ({
      name: r.name,
      partNumber: r.partNumber,
      branch: r.branchName,
      quantity: r.quantity,
      threshold: r.lowStockThreshold,
    })),
  };
}

export async function executeChatbotTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_customer_debts":
      return toolGetCustomerDebts(input as { customerName?: string });
    case "get_supplier_debts":
      return toolGetSupplierDebts(input as { supplierName?: string });
    case "search_part":
      return toolSearchPart(input as { query: string });
    case "get_sales_summary":
      return toolGetSalesSummary(input as { days?: number });
    case "get_top_selling_parts":
      return toolGetTopSellingParts(input as { days?: number });
    case "get_low_stock":
      return toolGetLowStock();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
