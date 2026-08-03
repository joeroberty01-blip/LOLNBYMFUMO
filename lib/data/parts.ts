import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type PartFilters = { q?: string; category?: string };

function buildWhere(filters: PartFilters): Prisma.PartWhereInput {
  const where: Prisma.PartWhereInput = { isActive: true };
  if (filters.category) where.category = filters.category;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { partNumber: { contains: filters.q, mode: "insensitive" } },
      { oemNumber: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export type PartLite = {
  id: string;
  partNumber: string;
  name: string;
  costPrice: number;
};

/** Full unpaginated list of active parts (id/partNumber/name/costPrice only) — for client-side
 * search pickers, e.g. the Credit Purchase item picker, where the admin needs to find any part
 * by typing rather than paging through the catalog. */
export async function getAllActivePartsLite(): Promise<PartLite[]> {
  const parts = await prisma.part.findMany({
    where: { isActive: true },
    select: { id: true, partNumber: true, name: true, costPrice: true },
    orderBy: { name: "asc" },
  });
  return parts.map((p) => ({ ...p, costPrice: p.costPrice.toNumber() }));
}

export type AdminPartRow = {
  partId: string;
  name: string;
  partNumber: string;
  costPrice: number;
  unitPrice: number;
  lowStockThreshold: number;
  branchId: string | null;
  branchName: string;
  quantity: number;
  isLowStock: boolean;
};

/** Admin-only. Includes costPrice — never reuse this for sales-staff-facing code.
 *
 * Paginated at the Part level: `total` counts matching parts, while the returned rows are
 * expanded one-per-branch, so a page of 50 parts can render more than 50 table rows. */
export async function getPartsForAdminTable(
  filters: PartFilters,
  page: PageArgs
): Promise<Paginated<AdminPartRow>> {
  const where = buildWhere(filters);

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { name: "asc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        name: true,
        partNumber: true,
        costPrice: true,
        unitPrice: true,
        lowStockThreshold: true,
        inventory: {
          select: { quantity: true, branch: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.part.count({ where }),
  ]);

  const rows = parts.flatMap((part): AdminPartRow[] => {
    const costPrice = part.costPrice.toNumber();
    const unitPrice = part.unitPrice.toNumber();

    if (part.inventory.length === 0) {
      return [
        {
          partId: part.id,
          name: part.name,
          partNumber: part.partNumber,
          costPrice,
          unitPrice,
          lowStockThreshold: part.lowStockThreshold,
          branchId: null,
          branchName: "— (hakuna stock bado)",
          quantity: 0,
          isLowStock: 0 < part.lowStockThreshold,
        },
      ];
    }

    return part.inventory.map((inv) => ({
      partId: part.id,
      name: part.name,
      partNumber: part.partNumber,
      costPrice,
      unitPrice,
      lowStockThreshold: part.lowStockThreshold,
      branchId: inv.branch.id,
      branchName: inv.branch.name,
      quantity: inv.quantity,
      isLowStock: inv.quantity < part.lowStockThreshold,
    }));
  });

  return paginated(rows, total, page);
}

export type SalesInventoryRow = {
  partId: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  branchName: string;
  quantity: number;
};

/**
 * Sales-staff-facing. `select` deliberately omits costPrice at the query level so it is never
 * fetched, never present in the RSC payload sent to the client, and never visible in the
 * Network tab — not just hidden in the UI.
 */
export async function getInventoryForSalesTable(
  filters: PartFilters,
  page: PageArgs
): Promise<Paginated<SalesInventoryRow>> {
  const where = buildWhere(filters);

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { name: "asc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        name: true,
        partNumber: true,
        unitPrice: true,
        inventory: {
          select: { quantity: true, branch: { select: { name: true } } },
        },
      },
    }),
    prisma.part.count({ where }),
  ]);

  const rows = parts.flatMap((part): SalesInventoryRow[] => {
    const unitPrice = part.unitPrice.toNumber();

    if (part.inventory.length === 0) {
      return [
        {
          partId: part.id,
          name: part.name,
          partNumber: part.partNumber,
          unitPrice,
          branchName: "—",
          quantity: 0,
        },
      ];
    }

    return part.inventory.map((inv) => ({
      partId: part.id,
      name: part.name,
      partNumber: part.partNumber,
      unitPrice,
      branchName: inv.branch.name,
      quantity: inv.quantity,
    }));
  });

  return paginated(rows, total, page);
}

export async function getPartCategories(): Promise<string[]> {
  const rows = await prisma.part.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

export type PartDetail = {
  id: string;
  partNumber: string;
  oemNumber: string | null;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  description: string | null;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
};

export async function getPartDetail(id: string): Promise<PartDetail | null> {
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) return null;

  return {
    id: part.id,
    partNumber: part.partNumber,
    oemNumber: part.oemNumber,
    name: part.name,
    category: part.category,
    unitPrice: part.unitPrice.toNumber(),
    costPrice: part.costPrice.toNumber(),
    description: part.description,
    lowStockThreshold: part.lowStockThreshold,
    isActive: part.isActive,
    createdAt: part.createdAt,
  };
}

export type PartBranchStock = { branchId: string; branchName: string; quantity: number };

export async function getPartInventoryByBranch(partId: string): Promise<PartBranchStock[]> {
  const rows = await prisma.inventory.findMany({
    where: { partId },
    select: { quantity: true, branch: { select: { id: true, name: true } } },
    orderBy: { branch: { name: "asc" } },
  });
  return rows.map((r) => ({ branchId: r.branch.id, branchName: r.branch.name, quantity: r.quantity }));
}

export type PartAdjustmentRow = {
  id: string;
  createdAt: Date;
  branchName: string;
  quantityChange: number;
  reason: string;
  userName: string;
};

export async function getPartAdjustmentHistory(partId: string): Promise<PartAdjustmentRow[]> {
  const rows = await prisma.stockAdjustment.findMany({
    where: { partId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      quantityChange: true,
      reason: true,
      branch: { select: { name: true } },
      user: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    branchName: r.branch.name,
    quantityChange: r.quantityChange,
    reason: r.reason,
    userName: r.user.name,
  }));
}

export type PartSaleRow = {
  id: string;
  invoiceNumber: number;
  createdAt: Date;
  branchName: string;
  quantity: number;
  unitPrice: number;
  status: "COMPLETED" | "VOIDED";
};

export async function getPartSaleHistory(partId: string): Promise<PartSaleRow[]> {
  const rows = await prisma.saleItem.findMany({
    where: { partId },
    orderBy: { sale: { createdAt: "desc" } },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      sale: {
        select: {
          invoiceNumber: true,
          createdAt: true,
          status: true,
          branch: { select: { name: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.sale.invoiceNumber,
    createdAt: r.sale.createdAt,
    branchName: r.sale.branch.name,
    quantity: r.quantity,
    unitPrice: r.unitPrice.toNumber(),
    status: r.sale.status,
  }));
}

/** Aggregates in SQL rather than pulling every Inventory row into Node — at 100k+ parts the
 * old in-memory loop fetched the entire inventory table on every dashboard render. The
 * low-stock test compares two columns across tables, which Prisma's query API can't express,
 * so this uses $queryRaw. */
export async function getDashboardSummary() {
  const [activePartsCount, aggregate] = await Promise.all([
    prisma.part.count({ where: { isActive: true } }),
    prisma.$queryRaw<{ lowStockCount: bigint; inventoryValue: string }[]>`
      SELECT
        COUNT(*) FILTER (WHERE i.quantity < p."lowStockThreshold") AS "lowStockCount",
        COALESCE(SUM(i.quantity * p."costPrice"), 0)               AS "inventoryValue"
      FROM "Inventory" i
      JOIN "Part" p ON p.id = i."partId"
      WHERE p."isActive" = true
    `,
  ]);

  const row = aggregate[0];
  return {
    activePartsCount,
    lowStockCount: Number(row?.lowStockCount ?? 0),
    inventoryValue: Number(row?.inventoryValue ?? 0),
  };
}
