import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

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

/** Admin-only. Includes costPrice — never reuse this for sales-staff-facing code. */
export async function getPartsForAdminTable(filters: PartFilters): Promise<AdminPartRow[]> {
  const parts = await prisma.part.findMany({
    where: buildWhere(filters),
    orderBy: { name: "asc" },
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
  });

  return parts.flatMap((part): AdminPartRow[] => {
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
export async function getInventoryForSalesTable(filters: PartFilters): Promise<SalesInventoryRow[]> {
  const parts = await prisma.part.findMany({
    where: buildWhere(filters),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      partNumber: true,
      unitPrice: true,
      inventory: {
        select: { quantity: true, branch: { select: { name: true } } },
      },
    },
  });

  return parts.flatMap((part) => {
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

export async function getDashboardSummary() {
  const [activePartsCount, inventoryRows] = await Promise.all([
    prisma.part.count({ where: { isActive: true } }),
    prisma.inventory.findMany({
      where: { part: { isActive: true } },
      select: { quantity: true, part: { select: { lowStockThreshold: true, costPrice: true } } },
    }),
  ]);

  let lowStockCount = 0;
  let inventoryValue = 0;
  for (const row of inventoryRows) {
    if (row.quantity < row.part.lowStockThreshold) lowStockCount += 1;
    inventoryValue += row.quantity * row.part.costPrice.toNumber();
  }

  return { activePartsCount, lowStockCount, inventoryValue };
}
