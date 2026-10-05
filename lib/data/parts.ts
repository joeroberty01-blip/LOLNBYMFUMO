import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
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

export const PART_SORTS = [
  "name_asc",
  "name_desc",
  "partNumber_asc",
  "quantity_desc",
  "quantity_asc",
  "lowStock",
  "negative",
  "price_desc",
  "price_asc",
  "newest",
] as const;
export type PartSort = (typeof PART_SORTS)[number];

export const PART_STOCK_FILTERS = ["low", "negative", "out", "instock"] as const;
export type PartStockFilter = (typeof PART_STOCK_FILTERS)[number];

export type PartLite = {
  id: string;
  partNumber: string;
  name: string;
  costPrice: number;
  unitPrice: number;
};

/** Full unpaginated list of active parts (id/partNumber/name/costPrice/unitPrice only) — for
 * client-side search pickers, e.g. the Credit Purchase item picker and the Sale item editor,
 * where the admin needs to find any part by typing rather than paging through the catalog. */
export async function getAllActivePartsLite(): Promise<PartLite[]> {
  const parts = await prisma.part.findMany({
    where: { isActive: true },
    select: { id: true, partNumber: true, name: true, costPrice: true, unitPrice: true },
    orderBy: { name: "asc" },
  });
  return parts.map((p) => ({
    ...p,
    costPrice: p.costPrice.toNumber(),
    unitPrice: p.unitPrice.toNumber(),
  }));
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
  hasPhoto: boolean;
};

/** Whitelisted ORDER BY fragments. User input only ever selects a key here — it is never
 * interpolated into SQL, so this stays injection-safe despite the raw query below. */
const PART_ORDER_BY: Record<PartSort, Prisma.Sql> = {
  name_asc: Prisma.sql`f.name ASC`,
  name_desc: Prisma.sql`f.name DESC`,
  partNumber_asc: Prisma.sql`f."partNumber" ASC`,
  quantity_desc: Prisma.sql`f.total_qty DESC, f.name ASC`,
  quantity_asc: Prisma.sql`f.total_qty ASC, f.name ASC`,
  // Worst first: negative stock, then below threshold, then by how deep the shortfall is.
  lowStock: Prisma.sql`f.any_negative DESC, f.any_low DESC, f.total_qty ASC, f.name ASC`,
  negative: Prisma.sql`f.any_negative DESC, f.total_qty ASC, f.name ASC`,
  price_desc: Prisma.sql`f."unitPrice" DESC, f.name ASC`,
  price_asc: Prisma.sql`f."unitPrice" ASC, f.name ASC`,
  newest: Prisma.sql`f."createdAt" DESC`,
};

type AdminPartSqlRow = {
  id: string;
  name: string;
  partNumber: string;
  costPrice: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lowStockThreshold: number;
  has_photo: boolean;
  branch_id: string | null;
  branch_name: string | null;
  branch_qty: number | null;
  total_count: number;
};

/**
 * Admin-only. Includes costPrice — never reuse this for sales-staff-facing code.
 *
 * Paginated at the Part level: `total` counts matching parts, while the returned rows are
 * expanded one-per-branch, so a page of 50 parts can render more than 50 table rows.
 *
 * Deliberately one raw SQL statement rather than Prisma's query builder. Prisma issues a
 * separate round trip for the nested `inventory` relation and another for the count, and this
 * app talks to a remote Neon instance where each round trip costs ~270ms on its own. Folding
 * page + relation + total into a single statement takes the list from ~4 trips to 1. It also
 * makes the stock-aware sorts possible at all: `quantity < lowStockThreshold` compares two
 * columns, which Prisma's filter API cannot express.
 */
export async function getPartsForAdminTable(
  filters: PartFilters & { sort?: string; stock?: string; categories?: string[] },
  page: PageArgs
): Promise<Paginated<AdminPartRow>> {
  const sort: PartSort = PART_SORTS.includes(filters.sort as PartSort)
    ? (filters.sort as PartSort)
    : "name_asc";
  const orderBy = PART_ORDER_BY[sort];

  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];

  // A multi-select category list (used by "print only these categories") takes precedence over
  // the single-category dropdown; they drive the same column.
  if (filters.categories && filters.categories.length > 0) {
    conditions.push(Prisma.sql`p.category IN (${Prisma.join(filters.categories)})`);
  } else if (filters.category) {
    conditions.push(Prisma.sql`p.category = ${filters.category}`);
  }

  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      Prisma.sql`(p.name ILIKE ${like} OR p."partNumber" ILIKE ${like} OR p."oemNumber" ILIKE ${like})`
    );
  }

  const stock = PART_STOCK_FILTERS.includes(filters.stock as PartStockFilter)
    ? (filters.stock as PartStockFilter)
    : undefined;
  if (stock === "low") conditions.push(Prisma.sql`agg.any_low = true`);
  if (stock === "negative") conditions.push(Prisma.sql`agg.any_negative = true`);
  if (stock === "out") conditions.push(Prisma.sql`COALESCE(agg.total_qty, 0) <= 0`);
  if (stock === "instock") conditions.push(Prisma.sql`COALESCE(agg.total_qty, 0) > 0`);

  const rows = await prisma.$queryRaw<AdminPartSqlRow[]>`
    WITH f AS (
      SELECT p.id, p.name, p."partNumber", p."costPrice", p."unitPrice",
             p."lowStockThreshold", p."createdAt",
             EXISTS(SELECT 1 FROM "PartPhoto" ph WHERE ph."partId" = p.id) AS has_photo,
             COALESCE(agg.total_qty, 0) AS total_qty,
             COALESCE(agg.any_low, true) AS any_low,
             COALESCE(agg.any_negative, false) AS any_negative,
             COUNT(*) OVER () :: int AS total_count
      FROM "Part" p
      LEFT JOIN LATERAL (
        SELECT SUM(i.quantity)::int AS total_qty,
               BOOL_OR(i.quantity < p."lowStockThreshold") AS any_low,
               BOOL_OR(i.quantity < 0) AS any_negative
        FROM "Inventory" i
        WHERE i."partId" = p.id
      ) agg ON TRUE
      WHERE ${Prisma.join(conditions, " AND ")}
    ),
    paged AS (
      SELECT * FROM f
      ORDER BY ${orderBy}
      LIMIT ${page.take} OFFSET ${page.skip}
    )
    SELECT f.id, f.name, f."partNumber", f."costPrice", f."unitPrice", f."lowStockThreshold",
           f.has_photo, f.total_count,
           b.id   AS branch_id,
           b.name AS branch_name,
           i.quantity AS branch_qty
    FROM paged f
    LEFT JOIN "Inventory" i ON i."partId" = f.id
    LEFT JOIN "Branch" b ON b.id = i."branchId"
    ORDER BY ${orderBy}, b.name ASC NULLS FIRST
  `;

  const total = rows[0]?.total_count ?? 0;

  const mapped: AdminPartRow[] = rows.map((r) => {
    const hasBranch = r.branch_id !== null;
    const quantity = r.branch_qty ?? 0;
    return {
      partId: r.id,
      name: r.name,
      partNumber: r.partNumber,
      costPrice: Number(r.costPrice),
      unitPrice: Number(r.unitPrice),
      lowStockThreshold: r.lowStockThreshold,
      branchId: r.branch_id,
      branchName: hasBranch ? (r.branch_name ?? "") : "— (hakuna stock bado)",
      quantity,
      isLowStock: quantity < r.lowStockThreshold,
      hasPhoto: r.has_photo,
    };
  });

  return paginated(mapped, total, page);
}

export type SalesInventoryRow = {
  partId: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  branchName: string;
  quantity: number;
  hasPhoto: boolean;
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
        photo: { select: { id: true } },
        inventory: {
          select: { quantity: true, branch: { select: { name: true } } },
        },
      },
    }),
    prisma.part.count({ where }),
  ]);

  const rows = parts.flatMap((part): SalesInventoryRow[] => {
    const unitPrice = part.unitPrice.toNumber();
    const hasPhoto = part.photo !== null;

    if (part.inventory.length === 0) {
      return [
        {
          partId: part.id,
          name: part.name,
          partNumber: part.partNumber,
          unitPrice,
          branchName: "—",
          quantity: 0,
          hasPhoto,
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
      hasPhoto,
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
  hasPhoto: boolean;
};

export async function getPartDetail(id: string): Promise<PartDetail | null> {
  const part = await prisma.part.findUnique({
    where: { id },
    include: { photo: { select: { id: true } } },
  });
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
    hasPhoto: part.photo !== null,
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
