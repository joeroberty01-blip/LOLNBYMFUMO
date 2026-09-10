"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { parseWorkbookAllSheets, detectHeaderRowIndex } from "@/lib/bulk/parse";
import { classifyRows, type ExistingPart, type NumberedRow } from "@/lib/bulk/classify";
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

/** Same identity rule as lib/bulk/classify.ts's catalogKey — Part Number alone isn't a unique
 * catalog key here (the same code is legitimately reused across different vehicle-specific
 * variants), so "the same part" means Part Number + Name + Buying + Selling Price all match. */
function catalogKey(partNumber: string, name: string, costPrice: number, unitPrice: number): string {
  return [partNumber.trim().toLowerCase(), name.trim().toLowerCase(), costPrice.toFixed(2), unitPrice.toFixed(2)].join("|");
}

/**
 * Step 3 — apply the admin's decisions in a single transaction, across every sheet at once.
 * Only NEW rows and DUPLICATE rows the admin explicitly chose to ADD/REPLACE are written;
 * CONFLICT and ERROR rows are never sent here by the UI. Every store referenced must already
 * exist (multi-sheet mode resolves stores from the existing 5, it never invents new ones).
 *
 * Writes in batches (createMany + one INSERT ... ON CONFLICT per chunk) instead of one
 * find/create/upsert round trip per row — a real spreadsheet import here runs to thousands of
 * rows, and at one round trip per row that reliably blew past both this function's own
 * transaction timeout and Vercel's serverless function timeout. The per-row DB lookups are
 * replaced with two batched reads up front (existing parts by Part Number, existing inventory
 * for those parts) and the rest is computed in memory — including replaying rows in their
 * original order to reproduce the old code's behavior when two rows in the same commit resolve
 * to the same new part (the second row finds the first row's not-yet-committed Part, exactly as
 * it would inside one sequential transaction).
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

    const skipped = rowsToCommit.filter((r) => r.outcome === "DUPLICATE" && r.decision === "SKIP");
    for (const row of skipped) {
      outcomes.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        partNumber: row.values.partNumber,
        action: "SKIPPED",
        detail: "Admin alichagua Skip — hakuna kilichobadilishwa",
      });
    }
    const writable = rowsToCommit.filter((r) => !(r.outcome === "DUPLICATE" && r.decision === "SKIP"));

    if (writable.length > 0) {
      await prisma.$transaction(
        async (tx) => {
          // 1. One batched lookup for every part these rows might already match, instead of a
          //    findFirst per row.
          const partNumbers = [...new Set(writable.map((r) => r.values.partNumber))];
          const dbParts = partNumbers.length
            ? await tx.part.findMany({
                where: { partNumber: { in: partNumbers, mode: "insensitive" } },
                select: { id: true, partNumber: true, name: true, costPrice: true, unitPrice: true },
              })
            : [];
          const partIdByKey = new Map(
            dbParts.map((p) => [catalogKey(p.partNumber, p.name, p.costPrice.toNumber(), p.unitPrice.toNumber()), p.id])
          );
          const dbPartIds = new Set(partIdByKey.values());

          // 2. One batched lookup for current Inventory quantities of every part that might
          //    already have stock somewhere, instead of a findUnique per row.
          const currentQtyByInvKey = new Map<string, number>();
          if (dbPartIds.size > 0) {
            const inv = await tx.inventory.findMany({
              where: { partId: { in: [...dbPartIds] } },
              select: { partId: true, branchId: true, quantity: true },
            });
            for (const i of inv) currentQtyByInvKey.set(`${i.partId}:${i.branchId}`, i.quantity);
          }

          // 3. Replay every row in its original order, resolving each to a Part id (reusing one
          //    already assigned to an earlier row with the same catalog identity — this is what
          //    makes a same-batch "new part appears in two sheets" resolve to one Part instead
          //    of two) and a running Inventory quantity per (part, store).
          const runningQty = new Map(currentQtyByInvKey);
          const newPartsToCreate: { id: string; row: CommitRow }[] = [];

          for (const row of writable) {
            const { values } = row;
            const key = catalogKey(values.partNumber, values.name, values.costPrice, values.unitPrice);
            let partId = partIdByKey.get(key);
            let isFirstCreate = false;
            if (!partId) {
              partId = randomUUID();
              partIdByKey.set(key, partId);
              newPartsToCreate.push({ id: partId, row });
              isFirstCreate = true;
            }

            const invKey = `${partId}:${row.storeId}`;
            const before = runningQty.get(invKey) ?? 0;
            const after = row.decision === "ADD" ? before + values.quantity : values.quantity;
            runningQty.set(invKey, after);

            outcomes.push({
              sheetName: row.sheetName,
              rowNumber: row.rowNumber,
              partNumber: values.partNumber,
              action: isFirstCreate ? "CREATED" : row.decision === "ADD" ? "STOCK_ADDED" : "STOCK_REPLACED",
              detail: isFirstCreate
                ? `Part mpya imeundwa na stock ${values.quantity}`
                : `${before} → ${after}`,
            });
          }

          // 4. Write every brand-new Part in chunks.
          for (let i = 0; i < newPartsToCreate.length; i += WRITE_CHUNK) {
            const chunk = newPartsToCreate.slice(i, i + WRITE_CHUNK);
            await tx.part.createMany({
              data: chunk.map(({ id, row }) => ({
                id,
                partNumber: row.values.partNumber,
                name: row.values.name,
                oemNumber: row.values.oemNumber,
                category: row.values.category,
                costPrice: row.values.costPrice,
                unitPrice: row.values.unitPrice,
                description: row.values.compatibility ? `Compatibility: ${row.values.compatibility}` : undefined,
              })),
            });
          }

          // 5. Write every final (part, store) quantity in chunks — one INSERT ... ON CONFLICT
          //    per chunk covers both "first stock at this store" (insert) and "stock already
          //    existed" (update) in a single statement. Each (partId, branchId) pair appears
          //    at most once here (runningQty already collapsed repeats within the batch), which
          //    Postgres requires for ON CONFLICT to affect a row only once per statement.
          const invEntries = [...runningQty.entries()];
          for (let i = 0; i < invEntries.length; i += WRITE_CHUNK) {
            const chunk = invEntries.slice(i, i + WRITE_CHUNK);
            const values = Prisma.join(
              chunk.map(([invKey, quantity]) => {
                const [partId, branchId] = invKey.split(":");
                return Prisma.sql`(${randomUUID()}, ${partId}, ${branchId}, ${quantity})`;
              })
            );
            await tx.$executeRaw`
              INSERT INTO "Inventory" ("id", "partId", "branchId", "quantity")
              VALUES ${values}
              ON CONFLICT ("partId", "branchId") DO UPDATE SET "quantity" = excluded."quantity"
            `;
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
    }

    // Skipped rows and written rows were collected into `outcomes` in two separate passes
    // above — restore the original row order (as the admin saw it in the preview table) rather
    // than leaving skips bunched at the front.
    const originalIndex = new Map(rowsToCommit.map((r, i) => [`${r.sheetName}::${r.rowNumber}`, i]));
    outcomes.sort(
      (a, b) =>
        (originalIndex.get(`${a.sheetName}::${a.rowNumber}`) ?? 0) -
        (originalIndex.get(`${b.sheetName}::${b.rowNumber}`) ?? 0)
    );

    revalidatePath("/dashboard/admin/parts");
    revalidatePath("/dashboard/admin/stores");
    revalidatePath("/dashboard/admin");
    return { success: true, outcomes };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
