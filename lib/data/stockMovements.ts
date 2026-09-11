import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { DateRange } from "@/lib/dateRanges";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";

export type StockMovementRow = {
  id: string;
  movementType: "STOCK_IN" | "STOCK_OUT";
  branchId: string;
  branchName: string;
  itemName: string;
  partNumber: string;
  quantity: number;
  personName: string;
  description: string | null;
  userName: string;
  createdAt: Date;
};

export type StockMovementFilters = {
  movementType?: string;
  branchId?: string;
  partNumber?: string;
  personName?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
};

function buildWhere(filters: StockMovementFilters): Prisma.StockMovementWhereInput {
  const where: Prisma.StockMovementWhereInput = {};
  if (filters.movementType === "STOCK_IN" || filters.movementType === "STOCK_OUT") {
    where.movementType = filters.movementType;
  }
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.partNumber) {
    where.partNumber = { contains: filters.partNumber, mode: "insensitive" };
  }
  if (filters.personName) {
    where.personName = { contains: filters.personName, mode: "insensitive" };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(`${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) where.createdAt.lte = new Date(`${filters.dateTo}T23:59:59`);
  }
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { itemName: { contains: q, mode: "insensitive" } },
      { partNumber: { contains: q, mode: "insensitive" } },
      { personName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function getStockMovements(
  filters: StockMovementFilters,
  page: PageArgs
): Promise<Paginated<StockMovementRow>> {
  const where = buildWhere(filters);
  const orderBy = { createdAt: filters.sort === "oldest" ? ("asc" as const) : ("desc" as const) };

  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy,
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        movementType: true,
        branchId: true,
        itemName: true,
        partNumber: true,
        quantity: true,
        personName: true,
        description: true,
        createdAt: true,
        branch: { select: { name: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  const mapped = rows.map((r) => ({
    id: r.id,
    movementType: r.movementType,
    branchId: r.branchId,
    branchName: r.branch.name,
    itemName: r.itemName,
    partNumber: r.partNumber,
    quantity: r.quantity,
    personName: r.personName,
    description: r.description,
    userName: r.user.name,
    createdAt: r.createdAt,
  }));

  return paginated(mapped, total, page);
}

export type StockMovementSummary = {
  stockIn: { count: number; totalQuantity: number };
  stockOut: { count: number; totalQuantity: number };
  rows: StockMovementRow[];
};

/** Powers the daily/period report: totals for the range plus the detailed rows, unpaginated —
 * a report is meant to be read/printed/exported as one whole, not paged through. */
export async function getStockMovementReport(
  range: DateRange,
  filters: Omit<StockMovementFilters, "dateFrom" | "dateTo">
): Promise<StockMovementSummary> {
  const where = buildWhere(filters);
  where.createdAt = { gte: range.start, lte: range.end };

  const rows = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      movementType: true,
      branchId: true,
      itemName: true,
      partNumber: true,
      quantity: true,
      personName: true,
      description: true,
      createdAt: true,
      branch: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  const mapped: StockMovementRow[] = rows.map((r) => ({
    id: r.id,
    movementType: r.movementType,
    branchId: r.branchId,
    branchName: r.branch.name,
    itemName: r.itemName,
    partNumber: r.partNumber,
    quantity: r.quantity,
    personName: r.personName,
    description: r.description,
    userName: r.user.name,
    createdAt: r.createdAt,
  }));

  const stockIn = mapped.filter((r) => r.movementType === "STOCK_IN");
  const stockOut = mapped.filter((r) => r.movementType === "STOCK_OUT");

  return {
    stockIn: { count: stockIn.length, totalQuantity: stockIn.reduce((s, r) => s + r.quantity, 0) },
    stockOut: { count: stockOut.length, totalQuantity: stockOut.reduce((s, r) => s + r.quantity, 0) },
    rows: mapped,
  };
}
