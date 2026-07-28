import "server-only";
import type { Prisma } from "@/generated/prisma/client";

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

/**
 * Applies every row in `data` to the database via the given transaction client, in
 * dependency order (parents before children). Must be called inside `prisma.$transaction`.
 * currentUserIds must be the set of User ids that exist RIGHT NOW — any restored row whose
 * userId/voidedById isn't in that set is skipped rather than violating a foreign key.
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
  const knownSupplierPaymentIds = new Set<string>();
  const knownSaleIds = new Set<string>();
  const knownPurchaseIds = new Set<string>();

  function track<T>(fn: () => Promise<T>): Promise<{ ok: true } | { ok: false; error: string }> {
    return fn()
      .then(() => ({ ok: true as const }))
      .catch((e) => ({ ok: false as const, error: (e as Error).message }));
  }

  async function upsertTable<Row extends Record<string, unknown>>(
    table: string,
    rows: Row[],
    apply: (row: Row) => Promise<void>,
    guard?: (row: Row) => string | null // returns a skip reason, or null to proceed
  ): Promise<void> {
    let upserted = 0;
    const skipReasons: string[] = [];
    for (const row of rows) {
      const reason = guard?.(row) ?? null;
      if (reason) {
        if (skipReasons.length < SKIP_REASON_LIMIT) skipReasons.push(reason);
        continue;
      }
      const result = await track(() => apply(row));
      if (result.ok) {
        upserted++;
      } else if (skipReasons.length < SKIP_REASON_LIMIT) {
        skipReasons.push(`id=${String(row.id)}: ${result.error}`);
      }
    }
    summaries.push({ table, upserted, skipped: rows.length - upserted, skipReasons });
  }

  // --- Branch (no FKs of its own) --------------------------------------------------------
  await upsertTable("branches", data.branches, async (r) => {
    await tx.branch.upsert({
      where: { id: r.id as string },
      create: {
        id: r.id as string,
        name: r.name as string,
        location: r.location as string,
        isSellingPoint: Boolean(r.isSellingPoint),
        createdAt: toDate(r.createdAt) ?? undefined,
      },
      update: {
        name: r.name as string,
        location: r.location as string,
        isSellingPoint: Boolean(r.isSellingPoint),
      },
    });
    knownBranchIds.add(r.id as string);
  });

  // --- Supplier / Customer / Part (independent of each other) ----------------------------
  await upsertTable("suppliers", data.suppliers, async (r) => {
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
    knownSupplierIds.add(r.id as string);
  });

  await upsertTable("customers", data.customers, async (r) => {
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
    knownCustomerIds.add(r.id as string);
  });

  await upsertTable("parts", data.parts, async (r) => {
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
    knownPartIds.add(r.id as string);
  });

  // --- Inventory / StockAdjustment (depend on Part + Branch [+ User]) --------------------
  await upsertTable(
    "inventory",
    data.inventory,
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
    (r) =>
      !knownPartIds.has(r.partId as string)
        ? "Part haipo"
        : !knownBranchIds.has(r.branchId as string)
          ? "Store haipo"
          : !currentUserIds.has(r.userId as string)
            ? "User wa mwanzo hayupo tena kwenye system"
            : null
  );

  // --- Payments (depend on Supplier/Customer + User) --------------------------------------
  await upsertTable(
    "supplierPayments",
    data.supplierPayments,
    async (r) => {
      await tx.supplierPayment.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          supplierId: r.supplierId as string,
          amount: r.amount as string,
          paymentMethod: r.paymentMethod as never,
          branchId: (r.branchId as string | null) ?? null,
          userId: r.userId as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
      knownSupplierPaymentIds.add(r.id as string);
    },
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
    async (r) => {
      await tx.customerPayment.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          customerId: r.customerId as string,
          amount: r.amount as string,
          paymentMethod: r.paymentMethod as never,
          branchId: (r.branchId as string | null) ?? null,
          userId: r.userId as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
    },
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
    (r) => (!currentUserIds.has(r.userId as string) ? "User wa mwanzo hayupo tena kwenye system" : null)
  );

  // --- Sale / SaleItem (depend on Branch, User, optional Customer) -----------------------
  await upsertTable(
    "sales",
    data.sales,
    async (r) => {
      const voidedById = r.voidedById as string | null;
      await tx.sale.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          invoiceNumber: r.invoiceNumber as number,
          customerId: (r.customerId as string | null) ?? null,
          branchId: r.branchId as string,
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
      knownSaleIds.add(r.id as string);
    },
    (r) =>
      !knownBranchIds.has(r.branchId as string)
        ? "Store haipo"
        : !currentUserIds.has(r.userId as string)
          ? "User wa mwanzo hayupo tena kwenye system"
          : null
  );

  await upsertTable(
    "saleItems",
    data.saleItems,
    async (r) => {
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
        },
        update: {},
      });
    },
    (r) => (!knownSaleIds.has(r.saleId as string) ? "Sale haijarudishwa" : null)
  );

  // --- Purchase / PurchaseItem -------------------------------------------------------------
  await upsertTable(
    "purchases",
    data.purchases,
    async (r) => {
      await tx.purchase.upsert({
        where: { id: r.id as string },
        create: {
          id: r.id as string,
          supplierId: r.supplierId as string,
          branchId: r.branchId as string,
          userId: r.userId as string,
          total: r.total as string,
          createdAt: toDate(r.createdAt) ?? undefined,
        },
        update: {},
      });
      knownPurchaseIds.add(r.id as string);
    },
    (r) =>
      !knownSupplierIds.has(r.supplierId as string)
        ? "Supplier haipo"
        : !knownBranchIds.has(r.branchId as string)
          ? "Store haipo"
          : !currentUserIds.has(r.userId as string)
            ? "User wa mwanzo hayupo tena kwenye system"
            : null
  );

  await upsertTable(
    "purchaseItems",
    data.purchaseItems,
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
    (r) =>
      !knownPurchaseIds.has(r.purchaseId as string)
        ? "Purchase haijarudishwa"
        : !knownPartIds.has(r.partId as string)
          ? "Part haipo"
          : null
  );

  return summaries;
}
