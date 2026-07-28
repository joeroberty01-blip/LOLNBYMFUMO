"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseWorkbookAllSheets, detectHeaderRowIndex } from "@/lib/bulk/parse";
import {
  classifyRows,
  splitPartNumberCompatibility,
  type ExistingPart,
  type NumberedRow,
} from "@/lib/bulk/classify";
import {
  autoDetectMapping,
  normalizeStoreKey,
  type AnalysisSummary,
  type BulkField,
  type DuplicateDecision,
} from "@/lib/bulk/schema";
import { logAudit } from "@/lib/audit";

type Fail = { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const RAW_PREVIEW_ROWS = 20;

export type ParsedSheet = {
  sheetName: string;
  /** null when no header row could be detected anywhere in the scan window — the sheet is
   * shown as skipped/unreadable but never blocks the other sheets. */
  headerRowIndex: number | null;
  headers: string[];
  /** Each row keeps its real Excel row number, so error/report messages point at the exact
   * line to fix even when blank rows are scattered through the sheet. */
  rows: NumberedRow[];
  /** First rows of the raw sheet, header detection included, for "View Raw Data". */
  rawPreview: string[][];
  mapping: Record<BulkField, number | null>;
  resolvedStoreId: string | null;
  resolvedStoreName: string | null;
};

export type ParseResult =
  | { success: true; sheets: ParsedSheet[]; stores: { id: string; name: string }[] }
  | Fail;

/** Step 1 — read every sheet in the workbook, detect each one's header row, propose a column
 * mapping, and try to match its tab name to an existing Store. Writes nothing. */
export async function parseBulkFile(formData: FormData): Promise<ParseResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Chagua faili la .xlsx au .csv" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "Faili ni kubwa kuliko 10MB" };
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
    return { success: false, error: "Aina ya faili hairuhusiwi — tumia .xlsx au .csv" };
  }

  try {
    const rawSheets = await parseWorkbookAllSheets(file);
    const stores = await prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const storeByKey = new Map(stores.map((s) => [normalizeStoreKey(s.name), s]));

    const sheets: ParsedSheet[] = rawSheets.map((raw) => {
      const headerRowIndex = detectHeaderRowIndex(raw.grid);
      const rawPreview = raw.grid.slice(0, RAW_PREVIEW_ROWS);
      const matchedStore = storeByKey.get(normalizeStoreKey(raw.name)) ?? null;

      if (headerRowIndex === null) {
        return {
          sheetName: raw.name,
          headerRowIndex: null,
          headers: [],
          rows: [],
          rawPreview,
          mapping: {} as Record<BulkField, number | null>,
          resolvedStoreId: matchedStore?.id ?? null,
          resolvedStoreName: matchedStore?.name ?? null,
        };
      }

      const headers = raw.grid[headerRowIndex];
      const dataRows: NumberedRow[] = raw.grid
        .map((cells, idx) => ({ rowNumber: idx + 1, cells }))
        .slice(headerRowIndex + 1)
        .filter((r) => r.cells.some((c) => c !== ""));

      return {
        sheetName: raw.name,
        headerRowIndex,
        headers,
        rows: dataRows,
        rawPreview,
        mapping: autoDetectMapping(headers),
        resolvedStoreId: matchedStore?.id ?? null,
        resolvedStoreName: matchedStore?.name ?? null,
      };
    });

    return { success: true, sheets, stores };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type SheetAnalysisRequest = {
  sheetName: string;
  rows: NumberedRow[];
  mapping: Record<BulkField, number | null>;
  storeId: string;
};

export type AnalyzeResult =
  | { success: true; results: { sheetName: string; analysis: AnalysisSummary }[] }
  | Fail;

/** Step 2 — validate and classify every ready sheet's rows against the database, scoped to
 * each sheet's own target store. Still writes nothing. */
export async function analyzeBulkSheets(requests: SheetAnalysisRequest[]): Promise<AnalyzeResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    const results: { sheetName: string; analysis: AnalysisSummary }[] = [];

    for (const req of requests) {
      const partNumberIdx = req.mapping.partNumber;
      const partNumbers = [
        ...new Set(
          req.rows
            .map((r) => (partNumberIdx === null ? "" : (r.cells[partNumberIdx] ?? "").trim()))
            .map((raw) => splitPartNumberCompatibility(raw).partNumber)
            .filter(Boolean)
        ),
      ];

      const found = await prisma.part.findMany({
        where: { partNumber: { in: partNumbers, mode: "insensitive" } },
        select: {
          id: true,
          partNumber: true,
          name: true,
          category: true,
          costPrice: true,
          unitPrice: true,
          inventory: { where: { branchId: req.storeId }, select: { quantity: true } },
        },
      });

      const existingParts: ExistingPart[] = found.map((p) => ({
        id: p.id,
        partNumber: p.partNumber,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice.toNumber(),
        unitPrice: p.unitPrice.toNumber(),
        quantityAtStore: p.inventory[0]?.quantity ?? 0,
      }));

      const analysis = classifyRows({
        rows: req.rows,
        mapping: req.mapping,
        existingParts,
      });

      results.push({ sheetName: req.sheetName, analysis });
    }

    return { success: true, results };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type CommitRow = {
  sheetName: string;
  rowNumber: number;
  outcome: "NEW" | "DUPLICATE";
  decision: DuplicateDecision;
  storeId: string;
  values: {
    partNumber: string;
    name: string;
    oemNumber: string | null;
    category: string;
    costPrice: number;
    unitPrice: number;
    quantity: number;
    compatibility: string | null;
  };
};

export type CommitOutcome = {
  sheetName: string;
  rowNumber: number;
  partNumber: string;
  action: "CREATED" | "STOCK_ADDED" | "STOCK_REPLACED" | "SKIPPED";
  detail: string;
};

export type CommitResult = { success: true; outcomes: CommitOutcome[] } | Fail;

const WRITE_CHUNK = 500;

/**
 * Step 3 — apply the admin's decisions in a single transaction, across every sheet at once.
 * Only NEW rows and DUPLICATE rows the admin explicitly chose to ADD/REPLACE are written;
 * CONFLICT and ERROR rows are never sent here by the UI. Every store referenced must already
 * exist (multi-sheet mode resolves stores from the existing 5, it never invents new ones).
 */
export async function commitBulkImport(rowsToCommit: CommitRow[]): Promise<CommitResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  if (rowsToCommit.length === 0) {
    return { success: false, error: "Hakuna rows za kuandika" };
  }

  try {
    const outcomes: CommitOutcome[] = [];

    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < rowsToCommit.length; i += WRITE_CHUNK) {
          const chunk = rowsToCommit.slice(i, i + WRITE_CHUNK);

          for (const row of chunk) {
            const { values } = row;

            if (row.outcome === "DUPLICATE" && row.decision === "SKIP") {
              outcomes.push({
                sheetName: row.sheetName,
                rowNumber: row.rowNumber,
                partNumber: values.partNumber,
                action: "SKIPPED",
                detail: "Admin alichagua Skip — hakuna kilichobadilishwa",
              });
              continue;
            }

            const description = values.compatibility
              ? `Compatibility: ${values.compatibility}`
              : undefined;

            const existing = await tx.part.findFirst({
              where: { partNumber: { equals: values.partNumber, mode: "insensitive" } },
              select: { id: true },
            });

            if (!existing) {
              const part = await tx.part.create({
                data: {
                  partNumber: values.partNumber,
                  name: values.name,
                  oemNumber: values.oemNumber,
                  category: values.category,
                  costPrice: values.costPrice,
                  unitPrice: values.unitPrice,
                  description,
                },
                select: { id: true },
              });
              await tx.inventory.create({
                data: { partId: part.id, branchId: row.storeId, quantity: values.quantity },
              });
              outcomes.push({
                sheetName: row.sheetName,
                rowNumber: row.rowNumber,
                partNumber: values.partNumber,
                action: "CREATED",
                detail: `Part mpya imeundwa na stock ${values.quantity}`,
              });
              continue;
            }

            const current = await tx.inventory.findUnique({
              where: { partId_branchId: { partId: existing.id, branchId: row.storeId } },
              select: { quantity: true },
            });
            const before = current?.quantity ?? 0;
            const after = row.decision === "ADD" ? before + values.quantity : values.quantity;

            await tx.inventory.upsert({
              where: { partId_branchId: { partId: existing.id, branchId: row.storeId } },
              update: { quantity: after },
              create: { partId: existing.id, branchId: row.storeId, quantity: after },
            });

            outcomes.push({
              sheetName: row.sheetName,
              rowNumber: row.rowNumber,
              partNumber: values.partNumber,
              action: row.decision === "ADD" ? "STOCK_ADDED" : "STOCK_REPLACED",
              detail: `${before} → ${after}`,
            });
          }
        }

        await logAudit(tx, {
          userId: session.user.id,
          action: "PARTS_BULK_IMPORTED",
          entityType: "Part",
          entityId: "bulk",
          metadata: {
            rows: rowsToCommit.length,
            sheets: [...new Set(rowsToCommit.map((r) => r.sheetName))],
            created: outcomes.filter((o) => o.action === "CREATED").length,
            stockAdded: outcomes.filter((o) => o.action === "STOCK_ADDED").length,
            stockReplaced: outcomes.filter((o) => o.action === "STOCK_REPLACED").length,
            skipped: outcomes.filter((o) => o.action === "SKIPPED").length,
          },
        });
      },
      { timeout: 120_000, maxWait: 20_000 }
    );

    revalidatePath("/dashboard/admin/parts");
    revalidatePath("/dashboard/admin/stores");
    revalidatePath("/dashboard/admin");
    return { success: true, outcomes };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
