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
};

export async function getBranchInventoryForPOS(branchId: string): Promise<POSInventoryItem[]> {
  const rows = await prisma.inventory.findMany({
    where: { branchId, quantity: { gt: 0 }, part: { isActive: true } },
    select: {
      quantity: true,
      part: { select: { id: true, name: true, partNumber: true, unitPrice: true } },
    },
    orderBy: { part: { name: "asc" } },
  });

  return rows.map((r) => ({
    partId: r.part.id,
    name: r.part.name,
    partNumber: r.part.partNumber,
    unitPrice: r.part.unitPrice.toNumber(),
    quantity: r.quantity,
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
