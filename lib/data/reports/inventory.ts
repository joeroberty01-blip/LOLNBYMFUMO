import "server-only";
import { prisma } from "@/lib/db";
import type { DateRange } from "@/lib/dateRanges";

export type TopSellingPart = {
  partId: string;
  name: string;
  partNumber: string;
  quantitySold: number;
  valueSold: number;
};

export async function getTopSellingParts(range: DateRange, limit = 10): Promise<TopSellingPart[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      isManualEntry: false,
      partId: { not: null },
      sale: { status: "COMPLETED", createdAt: { gte: range.start, lte: range.end } },
    },
    select: {
      partId: true,
      quantity: true,
      unitPrice: true,
      part: { select: { name: true, partNumber: true } },
    },
  });

  const byPart = new Map<string, TopSellingPart>();
  for (const item of items) {
    if (!item.partId || !item.part) continue;
    const existing = byPart.get(item.partId) ?? {
      partId: item.partId,
      name: item.part.name,
      partNumber: item.part.partNumber,
      quantitySold: 0,
      valueSold: 0,
    };
    existing.quantitySold += item.quantity;
    existing.valueSold += item.quantity * item.unitPrice.toNumber();
    byPart.set(item.partId, existing);
  }

  return Array.from(byPart.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit);
}

export type SlowMovingPart = {
  partId: string;
  name: string;
  partNumber: string;
  lastSoldAt: Date | null;
  daysSinceLastSale: number | null;
};

export async function getSlowMovingParts(minDaysIdle = 30): Promise<SlowMovingPart[]> {
  const parts = await prisma.part.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      partNumber: true,
      saleItems: {
        where: { sale: { status: "COMPLETED" } },
        select: { sale: { select: { createdAt: true } } },
        orderBy: { sale: { createdAt: "desc" } },
        take: 1,
      },
    },
  });

  const now = Date.now();
  const cutoffMs = minDaysIdle * 24 * 60 * 60 * 1000;

  return parts
    .map((p) => {
      const lastSoldAt = p.saleItems[0]?.sale.createdAt ?? null;
      const daysSinceLastSale = lastSoldAt
        ? Math.floor((now - lastSoldAt.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      return { partId: p.id, name: p.name, partNumber: p.partNumber, lastSoldAt, daysSinceLastSale };
    })
    .filter((p) => p.lastSoldAt === null || now - p.lastSoldAt.getTime() >= cutoffMs)
    .sort((a, b) => (b.daysSinceLastSale ?? Infinity) - (a.daysSinceLastSale ?? Infinity));
}

export type PartSaleOccurrence = {
  saleId: string;
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  customerName: string | null;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type PartSaleSummary = {
  partId: string;
  name: string;
  partNumber: string;
  timesSold: number;
  totalQuantity: number;
  totalValue: number;
  lastSoldAt: Date | null;
  occurrences: PartSaleOccurrence[];
};

/** Matches parts by name/number (same contains-search as POS), then replays every COMPLETED sale
 * of each match — one row per sale (not per unit), newest first — so an admin can answer "how
 * many times has this part sold, to/by whom, and when" without exporting the whole ledger. */
export async function searchPartSaleHistory(query: string, limit = 15): Promise<PartSaleSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const parts = await prisma.part.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { partNumber: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, partNumber: true },
    orderBy: { name: "asc" },
    take: limit,
  });
  if (parts.length === 0) return [];
  const partIds = parts.map((p) => p.id);

  const items = await prisma.saleItem.findMany({
    where: { partId: { in: partIds }, sale: { status: "COMPLETED" } },
    select: {
      partId: true,
      quantity: true,
      unitPrice: true,
      sale: {
        select: {
          id: true,
          invoiceNumber: true,
          createdAt: true,
          branch: { select: { name: true } },
          customer: { select: { name: true } },
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { sale: { createdAt: "desc" } },
  });

  const byPart = new Map<string, PartSaleOccurrence[]>();
  for (const it of items) {
    if (!it.partId) continue;
    const arr = byPart.get(it.partId) ?? [];
    arr.push({
      saleId: it.sale.id,
      invoiceNumber: it.sale.invoiceNumber,
      createdAt: it.sale.createdAt,
      branchName: it.sale.branch.name,
      customerName: it.sale.customer?.name ?? null,
      sellerName: it.sale.user.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toNumber(),
      amount: it.quantity * it.unitPrice.toNumber(),
    });
    byPart.set(it.partId, arr);
  }

  return parts.map((p) => {
    const occurrences = byPart.get(p.id) ?? [];
    return {
      partId: p.id,
      name: p.name,
      partNumber: p.partNumber,
      timesSold: occurrences.length,
      totalQuantity: occurrences.reduce((sum, o) => sum + o.quantity, 0),
      totalValue: occurrences.reduce((sum, o) => sum + o.amount, 0),
      lastSoldAt: occurrences[0]?.createdAt ?? null,
      occurrences,
    };
  });
}

export type StockAdjustmentRow = {
  id: string;
  createdAt: Date;
  partName: string;
  branchName: string;
  quantityChange: number;
  reason: string;
  userName: string;
};

export async function getStockAdjustmentsInRange(range: DateRange): Promise<StockAdjustmentRow[]> {
  const rows = await prisma.stockAdjustment.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      quantityChange: true,
      reason: true,
      part: { select: { name: true } },
      branch: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    partName: r.part.name,
    branchName: r.branch.name,
    quantityChange: r.quantityChange,
    reason: r.reason,
    userName: r.user.name,
  }));
}

export type InventoryValueByBranch = { branchId: string; branchName: string; value: number };

export async function getInventoryValueByBranch(): Promise<InventoryValueByBranch[]> {
  const rows = await prisma.inventory.findMany({
    where: { part: { isActive: true } },
    select: {
      quantity: true,
      branch: { select: { id: true, name: true } },
      part: { select: { costPrice: true } },
    },
  });

  const byBranch = new Map<string, InventoryValueByBranch>();
  for (const r of rows) {
    const existing = byBranch.get(r.branch.id) ?? {
      branchId: r.branch.id,
      branchName: r.branch.name,
      value: 0,
    };
    existing.value += r.quantity * r.part.costPrice.toNumber();
    byBranch.set(r.branch.id, existing);
  }

  return Array.from(byBranch.values()).sort((a, b) => b.value - a.value);
}

export type LowStockRow = {
  partId: string;
  name: string;
  partNumber: string;
  branchName: string;
  quantity: number;
  lowStockThreshold: number;
};

export async function getLowStockReport(): Promise<LowStockRow[]> {
  const rows = await prisma.inventory.findMany({
    where: { part: { isActive: true } },
    select: {
      quantity: true,
      branch: { select: { name: true } },
      part: { select: { id: true, name: true, partNumber: true, lowStockThreshold: true } },
    },
  });

  return rows
    .filter((r) => r.quantity < r.part.lowStockThreshold)
    .map((r) => ({
      partId: r.part.id,
      name: r.part.name,
      partNumber: r.part.partNumber,
      branchName: r.branch.name,
      quantity: r.quantity,
      lowStockThreshold: r.part.lowStockThreshold,
    }))
    .sort((a, b) => a.quantity - b.quantity);
}
