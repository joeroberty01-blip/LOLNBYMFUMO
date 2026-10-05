import "server-only";
import { Prisma } from "@/generated/prisma/client";

/**
 * Restoring a backup UPSERTS every row it contains (by id) — it never deletes anything.
 * Two deliberate safety properties:
 *   1. It can never destroy data created after the backup was taken (no wipe step).
 *   2. It never touches the User table. Backups never contain passwordHash (stripped for
 *      security when the backup was built), so recreating Users from a backup would produce
 *      accounts nobody can log into. Any row whose userId (or other FK) doesn't match a
 *      currently-existing row is skipped and reported, not silently dropped or crashed on.
 */

export type BackupData = {
  branches: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  parts: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  stockAdjustments: Record<string, unknown>[];
  supplierPayments: Record<string, unknown>[];
  customerPayments: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  saleItems: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  purchaseItems: Record<string, unknown>[];
};

const REQUIRED_KEYS: (keyof BackupData)[] = [
  "branches",
  "suppliers",
  "customers",
  "parts",
  "inventory",
  "stockAdjustments",
  "supplierPayments",
  "customerPayments",
  "expenses",
  "sales",
  "saleItems",
  "purchases",
  "purchaseItems",
];

export type ParsedBackup = { createdAt: string | null; counts: Record<string, number>; data: BackupData };

/** Parses and structurally validates an uploaded backup file. Never touches the database. */
export function parseBackupJson(raw: string): ParsedBackup {
  let root: unknown;
  try {
    root = JSON.parse(raw);
  } catch {
    throw new Error("Faili si JSON sahihi");
  }

  if (typeof root !== "object" || root === null || !("data" in root)) {
    throw new Error('Faili halina muundo sahihi wa backup (hakuna "data")');
  }
  const data = (root as { data: unknown }).data;
  if (typeof data !== "object" || data === null) {
    throw new Error('Sehemu ya "data" si object sahihi');
  }

  const missing = REQUIRED_KEYS.filter((k) => !Array.isArray((data as Record<string, unknown>)[k]));
  if (missing.length > 0) {
    throw new Error(`Faili halina tables hizi: ${missing.join(", ")}`);
  }

  const typedData = data as unknown as BackupData;
  const counts: Record<string, number> = {};
  for (const k of REQUIRED_KEYS) counts[k] = typedData[k].length;

  const rootCreatedAt = (root as Record<string, unknown>).createdAt;
  const createdAt = typeof rootCreatedAt === "string" ? rootCreatedAt : null;

  return { createdAt, counts, data: typedData };
}

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type RestoreTableSummary = { table: string; upserted: number; skipped: number; skipReasons: string[] };

const SKIP_REASON_LIMIT = 20;

// Same chunk size bulkUpload.ts uses for its batched createMany/INSERT..ON CONFLICT writes.
const WRITE_CHUNK = 500;

/**
 * Applies every row in `data` to the database via the given transaction client, in
 * dependency order (parents before children). Must be called inside `prisma.$transaction`.
 * currentUserIds must be the set of User ids that exist RIGHT NOW — any restored row whose
 * userId/voidedById isn't in that set is skipped rather than violating a foreign key.
 *
 * Each table is written via one batched `INSERT ... ON CONFLICT ("id") DO ...` statement per
 * WRITE_CHUNK rows, instead of one upsert round trip per row — a real restore here covers years
 * of sales/inventory/purchase history (tens of thousands of rows across these tables), and at
 * one round trip per row that reliably risks both Postgres's transaction timeout and Vercel's
 * function timeout even with both raised (see commitBackupRestore). If a chunk's batched
 * statement throws — a malformed row, an unexpected value — only that chunk falls back to the
 * slower row-by-row upsert, so the exact row and reason are still identifiable.
 */
export async function restoreBackupData(
  tx: Prisma.TransactionClient,
  data: BackupData,
  currentUserIds: Set<string>
): Promise<RestoreTableSummary[]> {
  const summaries: RestoreTableSummary[] = [];
  const knownBranchIds = new Set<string>();
  const knownSupplierIds = new Set<string>();
  const knownCustomerIds = new Set<string>();
  const knownPartIds = new Set<string>();
  const knownPurchaseIds = new Set<string>();
  const knownSaleIds = new Set<string>();
  const knownSupplierPaymentIds = new Set<string>();

  function track<T>(fn: () => Promise<T>): Promise<{ ok: true } | { ok: false; error: string }> {
    return fn()
      .then(() => ({ ok: true as const }))
      .catch((e) => ({ ok: false as const, error: (e as Error).message }));
  }

  async function upsertTable<Row extends Record<string, unknown>>(
    table: string,
    rows: Row[],
    buildChunkSql: (chunk: Row[]) => Prisma.Sql,
    applyOne: (row: Row) => Promise<void>,
    onWritten: (row: Row) => void,
    guard?: (row: Row) => string | null // returns a skip reason, or null to proceed
  ): Promise<void> {
    const skipReasons: string[] = [];
    const toWrite: Row[] = [];
    for (const row of rows) {
      const reason = guard?.(row) ?? null;
      if (reason) {
        if (skipReasons.length < SKIP_REASON_LIMIT) skipReasons.push(reason);
        continue;
      }
      toWrite.push(row);
    }

    let upserted = 0;
    for (let i = 0; i < toWrite.length; i += WRITE_CHUNK) {
      const chunk = toWrite.slice(i, i + WRITE_CHUNK);
      // A failed statement aborts the WHOLE surrounding Postgres transaction, not just itself —
      // every later statement on this connection (including in other tables, and the caller's
      // final commit) would then fail too with "current transaction is aborted", and everything
      // already restored would be silently rolled back. SAVEPOINT scopes the failure to just
      // this chunk (or, in the fallback, just this one row) so the rest of the restore survives.
      await tx.$executeRawUnsafe("SAVEPOINT restore_chunk");
      try {
        await tx.$executeRaw(buildChunkSql(chunk));
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT restore_chunk");
        upserted += chunk.length;
        for (const row of chunk) onWritten(row);
      } catch {
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT restore_chunk");
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT restore_chunk");
        for (const row of chunk) {
          await tx.$executeRawUnsafe("SAVEPOINT restore_row");
          const result = await track(() => applyOne(row));
          if (result.ok) {
            await tx.$executeRawUnsafe("RELEASE SAVEPOINT restore_row");
            upserted++;
            onWritten(row);
          } else {
            await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT restore_row");
            await tx.$executeRawUnsafe("RELEASE SAVEPOINT restore_row");
            if (skipReasons.length < SKIP_REASON_LIMIT) {
              skipReasons.push(`id=${String(row.id)}: ${result.error}`);
            }
          }
        }
      }
    }
    summaries.push({ table, upserted, skipped: rows.length - upserted, skipReasons });
  }

  const noop = () => {};

  // --- Branch (no FKs of its own) --------------------------------------------------------
  await upsertTable(
    "branches",
    data.branches,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Branch" ("id","name","location","isSellingPoint","isActive","createdAt")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.name as string}, ${r.location as string}, ${Boolean(r.isSellingPoint)}, ${r.isActive === undefined ? true : Boolean(r.isActive)}, ${toDate(r.createdAt) ?? new Date()})`
          )
        )}
        ON CONFLICT ("id") DO UPDATE SET
          "name" = excluded."name",
          "location" = excluded."location",
          "isSellingPoint" = excluded."isSellingPoint",
          "isActive" = excluded."isActive"
      `,
    async (r) => {
      await tx.branch.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          name: r.name as string,
          location: r.location as string,
          isSellingPoint: Boolean(r.isSellingPoint),
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {
          name: r.name as string,
          location: r.location as string,
          isSellingPoint: Boolean(r.isSellingPoint),
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
        },
      });
    },
    (r) => knownBranchIds.add(r.id as string)
  );

  // --- Supplier / Customer / Part (independent of each other) ----------------------------
  await upsertTable(
    "suppliers",
    data.suppliers,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Supplier" ("id","name","phone","email","address","balance","isActive","createdAt")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.name as string}, ${(r.phone as string | null) ?? null}, ${(r.email as string | null) ?? null}, ${(r.address as string | null) ?? null}, ${r.balance as string}::numeric, ${r.isActive === undefined ? true : Boolean(r.isActive)}, ${toDate(r.createdAt) ?? new Date()})`
          )
        )}
        ON CONFLICT ("id") DO UPDATE SET
          "name" = excluded."name",
          "phone" = excluded."phone",
          "email" = excluded."email",
          "address" = excluded."address",
          "balance" = excluded."balance",
          "isActive" = excluded."isActive"
      `,
    async (r) => {
      await tx.supplier.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          name: r.name as string,
          phone: (r.phone as string | null) ?? null,
          email: (r.email as string | null) ?? null,
          address: (r.address as string | null) ?? null,
          balance: r.balance as string,
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {
          name: r.name as string,
          phone: (r.phone as string | null) ?? null,
          email: (r.email as string | null) ?? null,
          address: (r.address as string | null) ?? null,
          balance: r.balance as string,
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
        },
      });
    },
    (r) => knownSupplierIds.add(r.id as string)
  );

  await upsertTable(
    "customers",
    data.customers,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Customer" ("id","name","phone","email","creditLimit","balance","isActive","createdAt")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.name as string}, ${(r.phone as string | null) ?? null}, ${(r.email as string | null) ?? null}, ${r.creditLimit as string}::numeric, ${r.balance as string}::numeric, ${r.isActive === undefined ? true : Boolean(r.isActive)}, ${toDate(r.createdAt) ?? new Date()})`
          )
        )}
        ON CONFLICT ("id") DO UPDATE SET
          "name" = excluded."name",
          "phone" = excluded."phone",
          "email" = excluded."email",
          "creditLimit" = excluded."creditLimit",
          "balance" = excluded."balance",
          "isActive" = excluded."isActive"
      `,
    async (r) => {
      await tx.customer.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          name: r.name as string,
          phone: (r.phone as string | null) ?? null,
          email: (r.email as string | null) ?? null,
          creditLimit: r.creditLimit as string,
          balance: r.balance as string,
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {
          name: r.name as string,
          phone: (r.phone as string | null) ?? null,
          email: (r.email as string | null) ?? null,
          creditLimit: r.creditLimit as string,
          balance: r.balance as string,
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
        },
      });
    },
    (r) => knownCustomerIds.add(r.id as string)
  );

  await upsertTable(
    "parts",
    data.parts,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Part" ("id","partNumber","oemNumber","name","category","unitPrice","costPrice","description","lowStockThreshold","isActive","createdAt")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.partNumber as string}, ${(r.oemNumber as string | null) ?? null}, ${r.name as string}, ${r.category as string}, ${r.unitPrice as string}::numeric, ${r.costPrice as string}::numeric, ${(r.description as string | null) ?? null}, ${(r.lowStockThreshold as number) ?? 10}, ${r.isActive === undefined ? true : Boolean(r.isActive)}, ${toDate(r.createdAt) ?? new Date()})`
          )
        )}
        ON CONFLICT ("id") DO UPDATE SET
          "oemNumber" = excluded."oemNumber",
          "name" = excluded."name",
          "category" = excluded."category",
          "unitPrice" = excluded."unitPrice",
          "costPrice" = excluded."costPrice",
          "description" = excluded."description",
          "lowStockThreshold" = excluded."lowStockThreshold",
          "isActive" = excluded."isActive"
      `,
    async (r) => {
      await tx.part.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          partNumber: r.partNumber as string,
          oemNumber: (r.oemNumber as string | null) ?? null,
          name: r.name as string,
          category: r.category as string,
          unitPrice: r.unitPrice as string,
          costPrice: r.costPrice as string,
          description: (r.description as string | null) ?? null,
          lowStockThreshold: (r.lowStockThreshold as number) ?? 10,
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {
          oemNumber: (r.oemNumber as string | null) ?? null,
          name: r.name as string,
          category: r.category as string,
          unitPrice: r.unitPrice as string,
          costPrice: r.costPrice as string,
          description: (r.description as string | null) ?? null,
          lowStockThreshold: (r.lowStockThreshold as number) ?? 10,
          isActive: r.isActive === undefined ? true : Boolean(r.isActive),
        },
      });
    },
    (r) => knownPartIds.add(r.id as string)
  );

  // --- Purchase (depends on Supplier + Branch + User) — moved ahead of Inventory/Payments so
  // SupplierPayment.purchaseId below has something to validate against. ----------------------
  await upsertTable(
    "purchases",
    data.purchases,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Purchase" ("id","supplierId","branchId","userId","total","dueDate","notes","createdAt")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.supplierId as string}, ${r.branchId as string}, ${r.userId as string}, ${r.total as string}::numeric, ${toDate(r.dueDate)}, ${(r.notes as string | null) ?? null}, ${toDate(r.createdAt) ?? new Date()})`
          )
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      await tx.purchase.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          supplierId: r.supplierId as string,
          branchId: r.branchId as string,
          userId: r.userId as string,
          total: r.total as string,
          dueDate: toDate(r.dueDate),
          notes: (r.notes as string | null) ?? null,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
    },
    (r) => knownPurchaseIds.add(r.id as string),
    (r) =>
      !knownSupplierIds.has(r.supplierId as string)
        ? "Supplier haipo"
        : !knownBranchIds.has(r.branchId as string)
          ? "Store haipo"
          : !currentUserIds.has(r.userId as string)
            ? "User wa mwanzo hayupo tena kwenye system"
            : null
  );

  // --- Sale (depends on Branch, User, optional Customer + source Branch) — moved ahead of
  // SaleItem/CustomerPayment so the latter can validate against it. --------------------------
  await upsertTable(
    "sales",
    data.sales,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Sale" ("id","invoiceNumber","customerId","branchId","sourceBranchId","userId","total","paymentMethod","isCredit","status","createdAt","voidedAt","voidedById")
        VALUES ${Prisma.join(
          chunk.map((r) => {
            const sourceBranchId = r.sourceBranchId as string | null;
            const voidedById = r.voidedById as string | null;
            return Prisma.sql`(${r.id as string}, ${r.invoiceNumber as number}, ${(r.customerId as string | null) ?? null}, ${r.branchId as string}, ${sourceBranchId && knownBranchIds.has(sourceBranchId) ? sourceBranchId : null}, ${r.userId as string}, ${r.total as string}::numeric, ${r.paymentMethod as string}::"PaymentMethod", ${Boolean(r.isCredit)}, ${r.status as string}::"SaleStatus", ${toDate(r.createdAt) ?? new Date()}, ${toDate(r.voidedAt)}, ${voidedById && currentUserIds.has(voidedById) ? voidedById : null})`;
          })
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      const sourceBranchId = r.sourceBranchId as string | null;
      const voidedById = r.voidedById as string | null;
      await tx.sale.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          invoiceNumber: r.invoiceNumber as number,
          customerId: (r.customerId as string | null) ?? null,
          branchId: r.branchId as string,
          sourceBranchId: sourceBranchId && knownBranchIds.has(sourceBranchId) ? sourceBranchId : null,
          userId: r.userId as string,
          total: r.total as string,
          paymentMethod: r.paymentMethod as never,
          isCredit: Boolean(r.isCredit),
          status: r.status as never,
          createdAt: toDate(r.createdAt) ?? undefined,
          voidedAt: toDate(r.voidedAt),
          voidedById: voidedById && currentUserIds.has(voidedById) ? voidedById : null,
        },
        update: {},
      });
    },
    (r) => knownSaleIds.add(r.id as string),
    (r) =>
      !knownBranchIds.has(r.branchId as string)
        ? "Store haipo"
        : !currentUserIds.has(r.userId as string)
          ? "User wa mwanzo hayupo tena kwenye system"
          : null
  );

  // --- PurchaseItem (depends on Purchase + Part) ------------------------------------------
  await upsertTable(
    "purchaseItems",
    data.purchaseItems,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "PurchaseItem" ("id","purchaseId","partId","quantity","unitPrice")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.purchaseId as string}, ${r.partId as string}, ${r.quantity as number}, ${r.unitPrice as string}::numeric)`
          )
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      await tx.purchaseItem.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          purchaseId: r.purchaseId as string,
          partId: r.partId as string,
          quantity: r.quantity as number,
          unitPrice: r.unitPrice as string,
        },
        update: {},
      });
    },
    noop,
    (r) =>
      !knownPurchaseIds.has(r.purchaseId as string)
        ? "Purchase haijarudishwa"
        : !knownPartIds.has(r.partId as string)
          ? "Part haipo"
          : null
  );

  // --- SaleItem (depends on Sale, optional Part + source Branch) -------------------------
  await upsertTable(
    "saleItems",
    data.saleItems,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "SaleItem" ("id","saleId","partId","quantity","unitPrice","isManualEntry","manualItemName","manualPartNumber","manualCostPrice","sourceBranchId")
        VALUES ${Prisma.join(
          chunk.map((r) => {
            const sourceBranchId = r.sourceBranchId as string | null;
            return Prisma.sql`(${r.id as string}, ${r.saleId as string}, ${(r.partId as string | null) ?? null}, ${r.quantity as number}, ${r.unitPrice as string}::numeric, ${Boolean(r.isManualEntry)}, ${(r.manualItemName as string | null) ?? null}, ${(r.manualPartNumber as string | null) ?? null}, ${r.manualCostPrice ? `${r.manualCostPrice as string}` : null}::numeric, ${sourceBranchId && knownBranchIds.has(sourceBranchId) ? sourceBranchId : null})`;
          })
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      const sourceBranchId = r.sourceBranchId as string | null;
      await tx.saleItem.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          saleId: r.saleId as string,
          partId: (r.partId as string | null) ?? null,
          quantity: r.quantity as number,
          unitPrice: r.unitPrice as string,
          isManualEntry: Boolean(r.isManualEntry),
          manualItemName: (r.manualItemName as string | null) ?? null,
          manualPartNumber: (r.manualPartNumber as string | null) ?? null,
          manualCostPrice: (r.manualCostPrice as string | null) ?? null,
          sourceBranchId: sourceBranchId && knownBranchIds.has(sourceBranchId) ? sourceBranchId : null,
        },
        update: {},
      });
    },
    noop,
    (r) => (!knownSaleIds.has(r.saleId as string) ? "Sale haijarudishwa" : null)
  );

  // --- Inventory / StockAdjustment (depend on Part + Branch [+ User]) --------------------
  await upsertTable(
    "inventory",
    data.inventory,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Inventory" ("id","partId","branchId","quantity")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.partId as string}, ${r.branchId as string}, ${(r.quantity as number) ?? 0})`
          )
        )}
        ON CONFLICT ("id") DO UPDATE SET "quantity" = excluded."quantity"
      `,
    async (r) => {
      await tx.inventory.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          partId: r.partId as string,
          branchId: r.branchId as string,
          quantity: (r.quantity as number) ?? 0,
        },
        update: { quantity: (r.quantity as number) ?? 0 },
      });
    },
    noop,
    (r) =>
      !knownPartIds.has(r.partId as string)
        ? "Part haipo (haijarudishwa)"
        : !knownBranchIds.has(r.branchId as string)
          ? "Store haipo"
          : null
  );

  await upsertTable(
    "stockAdjustments",
    data.stockAdjustments,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "StockAdjustment" ("id","partId","branchId","quantityChange","reason","userId","createdAt")
        VALUES ${Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.id as string}, ${r.partId as string}, ${r.branchId as string}, ${r.quantityChange as number}, ${r.reason as string}::"AdjustmentReason", ${r.userId as string}, ${toDate(r.createdAt) ?? new Date()})`
          )
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      await tx.stockAdjustment.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          partId: r.partId as string,
          branchId: r.branchId as string,
          quantityChange: r.quantityChange as number,
          reason: r.reason as never,
          userId: r.userId as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
    },
    noop,
    (r) =>
      !knownPartIds.has(r.partId as string)
        ? "Part haipo"
        : !knownBranchIds.has(r.branchId as string)
          ? "Store haipo"
          : !currentUserIds.has(r.userId as string)
            ? "User wa mwanzo hayupo tena kwenye system"
            : null
  );

  // --- Payments (depend on Supplier/Customer + User, optional Purchase/Sale) -------------
  await upsertTable(
    "supplierPayments",
    data.supplierPayments,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "SupplierPayment" ("id","supplierId","purchaseId","amount","paymentMethod","branchId","userId","createdAt")
        VALUES ${Prisma.join(
          chunk.map((r) => {
            const purchaseId = r.purchaseId as string | null;
            return Prisma.sql`(${r.id as string}, ${r.supplierId as string}, ${purchaseId && knownPurchaseIds.has(purchaseId) ? purchaseId : null}, ${r.amount as string}::numeric, ${r.paymentMethod as string}::"PaymentMethod", ${(r.branchId as string | null) ?? null}, ${r.userId as string}, ${toDate(r.createdAt) ?? new Date()})`;
          })
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      const purchaseId = r.purchaseId as string | null;
      await tx.supplierPayment.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          supplierId: r.supplierId as string,
          purchaseId: purchaseId && knownPurchaseIds.has(purchaseId) ? purchaseId : null,
          amount: r.amount as string,
          paymentMethod: r.paymentMethod as never,
          branchId: (r.branchId as string | null) ?? null,
          userId: r.userId as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
    },
    (r) => knownSupplierPaymentIds.add(r.id as string),
    (r) =>
      !knownSupplierIds.has(r.supplierId as string)
        ? "Supplier haipo"
        : !currentUserIds.has(r.userId as string)
          ? "User wa mwanzo hayupo tena kwenye system"
          : null
  );

  await upsertTable(
    "customerPayments",
    data.customerPayments,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "CustomerPayment" ("id","customerId","saleId","amount","paymentMethod","branchId","userId","createdAt")
        VALUES ${Prisma.join(
          chunk.map((r) => {
            const saleId = r.saleId as string | null;
            return Prisma.sql`(${r.id as string}, ${r.customerId as string}, ${saleId && knownSaleIds.has(saleId) ? saleId : null}, ${r.amount as string}::numeric, ${r.paymentMethod as string}::"PaymentMethod", ${(r.branchId as string | null) ?? null}, ${r.userId as string}, ${toDate(r.createdAt) ?? new Date()})`;
          })
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      const saleId = r.saleId as string | null;
      await tx.customerPayment.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          customerId: r.customerId as string,
          saleId: saleId && knownSaleIds.has(saleId) ? saleId : null,
          amount: r.amount as string,
          paymentMethod: r.paymentMethod as never,
          branchId: (r.branchId as string | null) ?? null,
          userId: r.userId as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
    },
    noop,
    (r) =>
      !knownCustomerIds.has(r.customerId as string)
        ? "Customer haipo"
        : !currentUserIds.has(r.userId as string)
          ? "User wa mwanzo hayupo tena kwenye system"
          : null
  );

  // --- Expense (may reference a just-restored SupplierPayment) ---------------------------
  await upsertTable(
    "expenses",
    data.expenses,
    (chunk) =>
      Prisma.sql`
        INSERT INTO "Expense" ("id","category","amount","description","paymentMethod","relatedSupplierPaymentId","branchId","userId","createdAt")
        VALUES ${Prisma.join(
          chunk.map((r) => {
            const relatedId = r.relatedSupplierPaymentId as string | null;
            return Prisma.sql`(${r.id as string}, ${r.category as string}::"ExpenseCategory", ${r.amount as string}::numeric, ${(r.description as string | null) ?? null}, ${r.paymentMethod as string}::"PaymentMethod", ${relatedId && knownSupplierPaymentIds.has(relatedId) ? relatedId : null}, ${(r.branchId as string | null) ?? null}, ${r.userId as string}, ${toDate(r.createdAt) ?? new Date()})`;
          })
        )}
        ON CONFLICT ("id") DO NOTHING
      `,
    async (r) => {
      const relatedId = r.relatedSupplierPaymentId as string | null;
      await tx.expense.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          category: r.category as never,
          amount: r.amount as string,
          description: (r.description as string | null) ?? null,
          paymentMethod: r.paymentMethod as never,
          relatedSupplierPaymentId: relatedId && knownSupplierPaymentIds.has(relatedId) ? relatedId : null,
          branchId: (r.branchId as string | null) ?? null,
          userId: r.userId as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
    },
    noop,
    (r) => (!currentUserIds.has(r.userId as string) ? "User wa mwanzo hayupo tena kwenye system" : null)
  );

  return summaries;
}
