"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBackupJson, restoreBackupData, type RestoreTableSummary } from "@/lib/backup/restore";
import { logAudit } from "@/lib/audit";

type Fail = { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Huna ruhusa ya kufanya hili");
  }
  return session;
}

const MAX_FILE_BYTES = 30 * 1024 * 1024;

export type RestorePreview = {
  createdAt: string | null;
  backupCounts: Record<string, number>;
  currentCounts: Record<string, number>;
};

export type PreviewResult = { success: true; preview: RestorePreview; rawJson: string } | Fail;

/** Step 1 — read and validate the uploaded backup file, and show what's in it next to what's
 * currently in the database. Writes nothing. */
export async function previewBackupRestore(formData: FormData): Promise<PreviewResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Chagua faili la backup (.json)" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "Faili ni kubwa kuliko 30MB" };
  }

  try {
    const rawJson = await file.text();
    const parsed = parseBackupJson(rawJson);

    const [
      branches, suppliers, customers, parts, inventory, stockAdjustments,
      supplierPayments, customerPayments, expenses, sales, saleItems, purchases, purchaseItems,
    ] = await Promise.all([
      prisma.branch.count(), prisma.supplier.count(), prisma.customer.count(), prisma.part.count(),
      prisma.inventory.count(), prisma.stockAdjustment.count(), prisma.supplierPayment.count(),
      prisma.customerPayment.count(), prisma.expense.count(), prisma.sale.count(),
      prisma.saleItem.count(), prisma.purchase.count(), prisma.purchaseItem.count(),
    ]);

    return {
      success: true,
      rawJson,
      preview: {
        createdAt: parsed.createdAt,
        backupCounts: parsed.counts,
        currentCounts: {
          branches, suppliers, customers, parts, inventory, stockAdjustments,
          supplierPayments, customerPayments, expenses, sales, saleItems, purchases, purchaseItems,
        },
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type CommitRestoreResult = { success: true; summary: RestoreTableSummary[] } | Fail;

/** Step 2 — the admin confirmed. Upserts every row in the backup (never deletes, never
 * touches Users). Runs as one transaction so a mid-way failure leaves the database exactly
 * as it was before the restore was attempted. */
export async function commitBackupRestore(rawJson: string): Promise<CommitRestoreResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  let parsed;
  try {
    parsed = parseBackupJson(rawJson);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    const currentUserIds = new Set(users.map((u) => u.id));

    const summary = await prisma.$transaction(
      async (tx) => {
        const result = await restoreBackupData(tx, parsed.data, currentUserIds);

        // Restored sales may carry invoiceNumber values ahead of the live autoincrement
        // sequence — realign it so the next new sale doesn't collide with a restored one.
        await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('"Sale"', 'invoiceNumber'), COALESCE((SELECT MAX("invoiceNumber") FROM "Sale"), 0) + 1, false)`;

        await logAudit(tx, {
          userId: session.user.id,
          action: "BACKUP_RESTORED",
          entityType: "Branch",
          entityId: "restore",
          metadata: {
            createdAt: parsed.createdAt,
            summary: result.map((r) => ({ table: r.table, upserted: r.upserted, skipped: r.skipped })),
          },
        });

        return result;
      },
      { timeout: 180_000, maxWait: 20_000 }
    );

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/parts");
    revalidatePath("/dashboard/admin/customers");
    revalidatePath("/dashboard/admin/suppliers");
    revalidatePath("/dashboard/admin/sales");
    revalidatePath("/dashboard/admin/expenses");
    revalidatePath("/dashboard/admin/stores");

    return { success: true, summary };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
