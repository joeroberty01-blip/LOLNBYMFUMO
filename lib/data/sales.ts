import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type POSInventoryItem = {
  partId: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  quantity: number;
  /** Present only when the item comes from the "All Stores" search (not a single selected
   * branch) — lets the cashier see, and the UI derive the sale's source branch from, where the
   * stock actually is. */
  branchId?: string;
  branchName?: string;
};

/** Cashier-facing search only ever needs a handful of matches at a time — matches the old
 * client-side slice(0, 20) behavior, just applied in the database instead of after fetching
 * everything. Keeps the query fast and the payload small no matter how large the catalog gets. */
const POS_SEARCH_LIMIT = 20;

function partSearchFilter(query?: string) {
  const q = query?.trim();
  if (!q) return {};
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { partNumber: { contains: q, mode: "insensitive" as const } },
    ],
  };
}

export async function getBranchInventoryForPOS(
  branchId: string,
  query?: string
): Promise<POSInventoryItem[]> {
  const rows = await prisma.inventory.findMany({
    where: {
      branchId,
      quantity: { gt: 0 },
      part: { isActive: true, ...partSearchFilter(query) },
    },
    select: {
      quantity: true,
      part: { select: { id: true, name: true, partNumber: true, unitPrice: true } },
    },
    orderBy: { part: { name: "asc" } },
    take: POS_SEARCH_LIMIT,
  });

  return rows.map((r) => ({
    partId: r.part.id,
    name: r.part.name,
    partNumber: r.part.partNumber,
    unitPrice: r.part.unitPrice.toNumber(),
    quantity: r.quantity,
  }));
}

/** Every part in stock at ANY store, not just one — lets a selling point sell the whole
 * business's inventory instead of only what happens to be stocked at its own store. Each row is
 * one (part, branch) combination, since the same part can sit at several stores with different
 * quantities; the cashier picks which store's stock to actually pull from. */
export async function getAllStoresInventoryForPOS(query?: string): Promise<POSInventoryItem[]> {
  const rows = await prisma.inventory.findMany({
    where: {
      quantity: { gt: 0 },
      part: { isActive: true, ...partSearchFilter(query) },
    },
    select: {
      quantity: true,
      branch: { select: { id: true, name: true } },
      part: { select: { id: true, name: true, partNumber: true, unitPrice: true } },
    },
    orderBy: [{ part: { name: "asc" } }, { branch: { name: "asc" } }],
    take: POS_SEARCH_LIMIT,
  });

  return rows.map((r) => ({
    partId: r.part.id,
    name: r.part.name,
    partNumber: r.part.partNumber,
    unitPrice: r.part.unitPrice.toNumber(),
    quantity: r.quantity,
    branchId: r.branch.id,
    branchName: r.branch.name,
  }));
}

export type SaleListRow = {
  id: string;
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  sellerName: string;
  userId: string;
  paymentMethod: string;
  isCredit: boolean;
  status: "COMPLETED" | "VOIDED";
  total: number;
  hasManualItems: boolean;
  customerName: string | null;
};

export type SaleFilters = {
  branchId?: string;
  userId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  manualOnly?: boolean;
  /** Free-text search: matches invoice number exactly (when numeric), or customer/seller name
   * partially — covers "find this invoice" and "find this customer's invoices" in one box. */
  q?: string;
};

function buildSaleWhere(filters: SaleFilters): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {};
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod as Prisma.SaleWhereInput["paymentMethod"];
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(`${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) where.createdAt.lte = new Date(`${filters.dateTo}T23:59:59`);
  }
  if (filters.manualOnly) {
    where.items = { some: { isManualEntry: true } };
  }
  const q = filters.q?.trim();
  if (q) {
    const asInvoiceNumber = /^\d+$/.test(q) ? Number(q) : null;
    where.OR = [
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      ...(asInvoiceNumber !== null ? [{ invoiceNumber: asInvoiceNumber }] : []),
    ];
  }
  return where;
}

async function listSales(filters: SaleFilters, page: PageArgs): Promise<Paginated<SaleListRow>> {
  const where = buildSaleWhere(filters);

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        paymentMethod: true,
        isCredit: true,
        status: true,
        total: true,
        userId: true,
        branch: { select: { name: true } },
        user: { select: { name: true } },
        customer: { select: { name: true } },
        items: { select: { isManualEntry: true } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  const rows = sales.map((s) => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    createdAt: s.createdAt,
    branchName: s.branch.name,
    sellerName: s.user.name,
    userId: s.userId,
    paymentMethod: s.paymentMethod,
    isCredit: s.isCredit,
    status: s.status,
    total: s.total.toNumber(),
    hasManualItems: s.items.some((i) => i.isManualEntry),
    customerName: s.customer?.name ?? null,
  }));

  return paginated(rows, total, page);
}

export function getSalesForStaff(userId: string, filters: Omit<SaleFilters, "userId">, page: PageArgs) {
  return listSales({ ...filters, userId }, page);
}

export function getSalesForAdmin(filters: SaleFilters, page: PageArgs) {
  return listSales(filters, page);
}

export async function getSaleWithItems(saleId: string) {
  return prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      branch: true,
      sourceBranch: true,
      user: true,
      customer: true,
      voidedBy: true,
      items: { include: { part: true } },
    },
  });
}

export type SaleInvoiceItem = { description: string; quantity: number; unitPrice: number; amount: number };

export type SaleInvoiceData = {
  id: string;
  invoiceNumber: number;
  createdAt: Date;
  traReceiptNo: string | null;
  customerId: string | null;
  customerName: string;
  customerAddress: string | null;
  customerTin: string | null;
  customerVrn: string | null;
  items: SaleInvoiceItem[];
  /** VAT-inclusive, same figure as Sale.total — no separate VAT step exists in the sales flow,
   * so the invoice backs Sub Total/VAT out of this one number (see lib/companyInfo.ts). */
  total: number;
};

export async function getSaleInvoiceData(saleId: string): Promise<SaleInvoiceData | null> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      traReceiptNo: true,
      total: true,
      customer: { select: { id: true, name: true, address: true, tin: true, vrn: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          isManualEntry: true,
          manualItemName: true,
          manualPartNumber: true,
          part: { select: { name: true, partNumber: true } },
        },
      },
    },
  });
  if (!sale) return null;

  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    createdAt: sale.createdAt,
    traReceiptNo: sale.traReceiptNo,
    customerId: sale.customer?.id ?? null,
    customerName: sale.customer?.name ?? "",
    customerAddress: sale.customer?.address ?? null,
    customerTin: sale.customer?.tin ?? null,
    customerVrn: sale.customer?.vrn ?? null,
    items: sale.items.map((i) => {
      const name = i.isManualEntry ? (i.manualItemName ?? "Manual item") : (i.part?.name ?? "Part");
      const partNumber = i.isManualEntry ? i.manualPartNumber : i.part?.partNumber;
      return {
        description: partNumber ? `${name} (${partNumber})` : name,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toNumber(),
        amount: i.quantity * i.unitPrice.toNumber(),
      };
    }),
    total: sale.total.toNumber(),
  };
}

/** Rebuilds the same ReceiptData shape completeSale returns, for any past sale, so the receipt
 * can be viewed/reprinted later instead of existing only once right after checkout. */
export async function getSaleReceipt(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      branch: true,
      user: true,
      customer: true,
      items: { include: { part: true } },
    },
  });
  if (!sale) return null;

  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    createdAt: sale.createdAt.toISOString(),
    branchName: sale.branch.name,
    branchLocation: sale.branch.location,
    sellerName: sale.user.name,
    paymentMethod: sale.paymentMethod,
    isCredit: sale.isCredit,
    customerName: sale.customer?.name ?? null,
    customerPhone: sale.customer?.phone ?? null,
    status: sale.status,
    userId: sale.userId,
    total: sale.total.toNumber(),
    items: sale.items.map((i) => ({
      name: i.isManualEntry ? (i.manualItemName ?? "Manual item") : (i.part?.name ?? "Part"),
      partNumber: i.isManualEntry ? (i.manualPartNumber ?? null) : (i.part?.partNumber ?? null),
      quantity: i.quantity,
      unitPrice: i.unitPrice.toNumber(),
      subtotal: i.quantity * i.unitPrice.toNumber(),
      isManualEntry: i.isManualEntry,
    })),
  };
}

export type ManualItemGroup = {
  name: string;
  partNumber: string | null;
  timesSold: number;
  lastUnitPrice: number;
  lastCostPrice: number;
  lastSoldAt: Date;
};

export async function getManualItemGroups(): Promise<ManualItemGroup[]> {
  const rows = await prisma.saleItem.findMany({
    where: { isManualEntry: true, sale: { status: "COMPLETED" } },
    select: {
      manualItemName: true,
      manualPartNumber: true,
      unitPrice: true,
      manualCostPrice: true,
      sale: { select: { createdAt: true } },
    },
    orderBy: { sale: { createdAt: "desc" } },
  });

  const groups = new Map<string, ManualItemGroup>();
  for (const r of rows) {
    const key = r.manualItemName ?? "—";
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        name: key,
        partNumber: r.manualPartNumber,
        timesSold: 1,
        lastUnitPrice: r.unitPrice.toNumber(),
        lastCostPrice: r.manualCostPrice?.toNumber() ?? 0,
        lastSoldAt: r.sale.createdAt,
      });
    } else {
      existing.timesSold += 1;
    }
  }

  return Array.from(groups.values());
}
