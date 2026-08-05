import "server-only";
import { prisma } from "@/lib/db";
import { paginated, type PageArgs, type Paginated } from "@/lib/pagination";
import { Prisma } from "@/generated/prisma/client";

export type ChinaMasterItemRow = {
  id: string;
  batchId: string;
  batchLabel: string | null;
  batchDate: string | null;
  sourceSheet: string;
  lineNo: number | null;
  description: string;
  partNumber: string | null;
  quantity: number | null;
  currencyLabel: string | null;
  unitPriceForeign: number | null;
  totalForeign: number | null;
  unitPriceTzs: number | null;
  totalTzs: number | null;
  salePrice1: number | null;
  salePrice2: number | null;
  saleTotal: number | null;
};

export type ChinaMasterFilters = {
  q?: string;
  sourceSheet?: string;
  batchId?: string;
};

function buildWhere(filters: ChinaMasterFilters): Prisma.ChinaMasterItemWhereInput {
  const where: Prisma.ChinaMasterItemWhereInput = {};
  if (filters.q) {
    where.OR = [
      { description: { contains: filters.q, mode: "insensitive" } },
      { partNumber: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.batchId) where.batchId = filters.batchId;
  if (filters.sourceSheet) where.batch = { sourceSheet: filters.sourceSheet };
  return where;
}

/** The archive's items, flattened across every batch for a single searchable/paginated table —
 * matches how someone actually uses "kumbukumbu" (a reference archive): looking up whether a
 * part was ever imported before, not browsing block-by-block through 192 spreadsheet sections. */
export async function getChinaMasterItems(
  filters: ChinaMasterFilters,
  page: PageArgs
): Promise<Paginated<ChinaMasterItemRow>> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.chinaMasterItem.findMany({
      where,
      orderBy: [{ batch: { orderIndex: "asc" } }, { lineNo: "asc" }],
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        batchId: true,
        lineNo: true,
        description: true,
        partNumber: true,
        quantity: true,
        unitPriceForeign: true,
        totalForeign: true,
        unitPriceTzs: true,
        totalTzs: true,
        salePrice1: true,
        salePrice2: true,
        saleTotal: true,
        batch: { select: { label: true, sourceSheet: true, currencyLabel: true, dateLabel: true } },
      },
    }),
    prisma.chinaMasterItem.count({ where }),
  ]);

  const mapped = rows.map((r) => ({
    id: r.id,
    batchId: r.batchId,
    batchLabel: r.batch.label,
    batchDate: r.batch.dateLabel,
    sourceSheet: r.batch.sourceSheet,
    lineNo: r.lineNo,
    description: r.description,
    partNumber: r.partNumber,
    quantity: r.quantity?.toNumber() ?? null,
    currencyLabel: r.batch.currencyLabel,
    unitPriceForeign: r.unitPriceForeign?.toNumber() ?? null,
    totalForeign: r.totalForeign?.toNumber() ?? null,
    unitPriceTzs: r.unitPriceTzs?.toNumber() ?? null,
    totalTzs: r.totalTzs?.toNumber() ?? null,
    salePrice1: r.salePrice1?.toNumber() ?? null,
    salePrice2: r.salePrice2?.toNumber() ?? null,
    saleTotal: r.saleTotal?.toNumber() ?? null,
  }));

  return paginated(mapped, total, page);
}

export type ChinaMasterBatchOption = { id: string; label: string; sourceSheet: string };

export async function getChinaMasterBatchOptions(): Promise<ChinaMasterBatchOption[]> {
  const rows = await prisma.chinaMasterBatch.findMany({
    where: { label: { not: null } },
    orderBy: { orderIndex: "asc" },
    select: { id: true, label: true, sourceSheet: true },
  });
  return rows.map((r) => ({ id: r.id, label: r.label ?? "", sourceSheet: r.sourceSheet }));
}

export type ChinaMasterRawNote = {
  id: string;
  sourceSheet: string;
  label: string | null;
  dateLabel: string | null;
  rows: string[][];
};

/** The handful of spreadsheet sections that didn't follow the standard NO/DESCRIPTION/PART NO
 * table layout closely enough to parse into typed items. Kept as one array of cells per original
 * row (not one giant blob of text) so the UI can still render them as a proper table of their
 * own — nothing from the original file is silently dropped, it's just not force-fit into the
 * typed columns the standard batches use. */
export async function getChinaMasterRawNotes(): Promise<ChinaMasterRawNote[]> {
  const rows = await prisma.chinaMasterBatch.findMany({
    where: { rawLines: { not: Prisma.JsonNull } },
    orderBy: { orderIndex: "asc" },
    select: { id: true, sourceSheet: true, label: true, dateLabel: true, rawLines: true },
  });
  return rows.map((r) => ({
    id: r.id,
    sourceSheet: r.sourceSheet,
    label: r.label,
    dateLabel: r.dateLabel,
    rows: (r.rawLines as string[][] | null) ?? [],
  }));
}

export async function getChinaMasterStats(): Promise<{
  totalItems: number;
  totalBatches: number;
  totalTzsValue: number;
}> {
  const [totalItems, totalBatches, sumResult] = await Promise.all([
    prisma.chinaMasterItem.count(),
    prisma.chinaMasterBatch.count(),
    prisma.chinaMasterItem.aggregate({ _sum: { totalTzs: true } }),
  ]);
  return {
    totalItems,
    totalBatches,
    totalTzsValue: sumResult._sum.totalTzs?.toNumber() ?? 0,
  };
}
