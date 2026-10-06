"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  completeSaleSchema,
  editSaleSchema,
  type CompleteSaleInput,
  type EditSaleInput,
} from "@/lib/validators/sales";
import {
  getBranchInventoryForPOS,
  getAllStoresInventoryForPOS,
  type POSInventoryItem,
} from "@/lib/data/sales";
import { logAudit } from "@/lib/audit";

type ActionResult = { success: true } | { success: false; error: string };

const SALE_DELETE_WINDOW_MS = 30 * 60 * 1000;

async function requireApprovedSalesStaff() {
  const session = await auth();
  const isApprovedSalesStaff =
    session?.user.role === "SALES_STAFF" && session.user.status === "APPROVED";
  const isAdmin = session?.user.role === "ADMIN";
  if (!session || (!isAdmin && !isApprovedSalesStaff)) {
    throw new Error("You are not authorized to do this");
  }
  return session;
}

export async function getPOSInventory(branchId: string, query?: string): Promise<POSInventoryItem[]> {
  await requireApprovedSalesStaff();
  return getBranchInventoryForPOS(branchId, query);
}

export async function getPOSInventoryAllStores(query?: string): Promise<POSInventoryItem[]> {
  await requireApprovedSalesStaff();
  return getAllStoresInventoryForPOS(query);
}

export type ReceiptData = {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  branchName: string;
  /** Store address printed on the receipt — receipts identify the SHOP, never the software. */
  branchLocation: string;
  sellerName: string;
  paymentMethod: string;
  isCredit: boolean;
  customerName: string | null;
  /** Needed to offer "send this invoice on WhatsApp" straight from the receipt. */
  customerPhone: string | null;
  total: number;
  items: {
    name: string;
    partNumber: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    isManualEntry: boolean;
  }[];
};

type CompleteSaleResult = { success: true; data: ReceiptData } | { success: false; error: string };

export async function completeSale(input: CompleteSaleInput): Promise<CompleteSaleResult> {
  let session;
  try {
    session = await requireApprovedSalesStaff();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const parsed = completeSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const { branchId, paymentMethod, isCredit, customerId, items } = parsed.data;
  // Sale-level default when an item doesn't carry its own branchId — kept for backward
  // compatibility with the single-source-store case.
  const defaultSourceBranchId = parsed.data.sourceBranchId ?? branchId;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, error: "Branch not found" };
  if (!branch.isSellingPoint) {
    return { success: false, error: "This branch is not available for new sales" };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { success: false, error: "Customer not found" };

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  // No credit-limit check — a credit sale is always recorded regardless of how far over the
  // customer's limit it puts them; the limit is informational only (still shown/tracked on the
  // customer record), not a hard block.

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const itemSourceBranchIds = new Map<number, string>();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.isManualEntry) continue;

        const itemBranchId = item.branchId ?? defaultSourceBranchId;
        itemSourceBranchIds.set(i, itemBranchId);

        const inv = await tx.inventory.findUnique({
          where: { partId_branchId: { partId: item.partId, branchId: itemBranchId } },
        });
        if (!inv || inv.quantity < item.quantity) {
          const part = await tx.part.findUnique({ where: { id: item.partId } });
          throw new Error(
            `Insufficient stock for ${part?.name ?? "this part"} (available: ${inv?.quantity ?? 0})`
          );
        }

        await tx.inventory.update({
          where: { partId_branchId: { partId: item.partId, branchId: itemBranchId } },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      const created = await tx.sale.create({
        data: {
          branchId,
          sourceBranchId: defaultSourceBranchId !== branchId ? defaultSourceBranchId : null,
          userId: session.user.id,
          paymentMethod,
          isCredit,
          customerId,
          total,
          status: "COMPLETED",
          items: {
            create: items.map((item, i) =>
              item.isManualEntry
                ? {
                    partId: null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    isManualEntry: true,
                    manualItemName: item.manualItemName,
                    manualPartNumber: item.manualPartNumber ?? null,
                    manualCostPrice: item.manualCostPrice,
                  }
                : {
                    partId: item.partId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    isManualEntry: false,
                    sourceBranchId: itemSourceBranchIds.get(i),
                  }
            ),
          },
        },
        include: {
          items: { include: { part: true } },
          branch: true,
          user: true,
          customer: true,
        },
      });

      if (isCredit) {
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { increment: total } },
        });
      }

      await logAudit(tx, {
        userId: session.user.id,
        action: "SALE_COMPLETED",
        entityType: "Sale",
        entityId: created.id,
        metadata: { branchId, total, isCredit, itemCount: items.length },
      });

      return created;
    });

    revalidatePath("/dashboard/sales/history");
    revalidatePath("/dashboard/admin/sales");
    revalidatePath("/dashboard/sales/pos");
    revalidatePath("/dashboard/admin");

    const receipt: ReceiptData = {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      createdAt: sale.createdAt.toISOString(),
      branchName: sale.branch.name,
      branchLocation: sale.branch.location,
      sellerName: sale.user.name,
      paymentMethod: sale.paymentMethod,
      isCredit: sale.isCredit,
      customerName: sale.customer?.name ?? null,
      customerPhone: sale.customer?.phone ?? null,
      total: sale.total.toNumber(),
      items: sale.items.map((i) => ({
        name: i.isManualEntry ? (i.manualItemName ?? "Manual item") : (i.part?.name ?? "Part"),
        partNumber: i.isManualEntry ? (i.manualPartNumber ?? null) : (i.part?.partNumber ?? null),
        quantity: i.quantity,
        unitPrice: i.unitPrice.toNumber(),
        subtotal: i.quantity * i.unitPrice.toNumber(),
        isManualEntry: i.isManualEntry,
      })),
    };

    return { success: true, data: receipt };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Full invoice edit: date, branch, customer, payment method, credit flag, and the entire item
 * list — including re-parting an existing line, adding new lines, and removing lines. Reverses
 * every old line's stock effect, deletes all old SaleItems, then validates and applies the new
 * item list from scratch — same reverse-then-reapply-everything shape as updatePurchase, chosen
 * over a line-by-line diff because it's simpler to reason about and handles add/remove/re-part
 * uniformly. Cannot edit a voided sale (void it and record a new one instead).
 */
export async function updateSale(saleId: string, input: EditSaleInput): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "You are not authorized to do this" };
  }

  const parsed = editSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const { createdAt, branchId, customerId, paymentMethod, isCredit, items } = parsed.data;

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return { success: false, error: "Invalid date" };
  }

  const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (!sale) return { success: false, error: "Sale not found" };
  if (sale.status === "VOIDED") {
    return { success: false, error: "Cannot edit a voided sale" };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { success: false, error: "Customer not found" };

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, error: "Branch not found" };

  const partIds = items.flatMap((it) => (it.isManualEntry ? [] : [it.partId]));
  if (partIds.length > 0) {
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true },
    });
    if (parts.length !== new Set(partIds).size) {
      return { success: false, error: "Some products no longer exist" };
    }
  }

  const newTotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  try {
    await prisma.$transaction(async (tx) => {
      for (const old of sale.items) {
        if (!old.isManualEntry && old.partId) {
          const oldBranchId = old.sourceBranchId ?? sale.branchId;
          await tx.inventory.upsert({
            where: { partId_branchId: { partId: old.partId, branchId: oldBranchId } },
            update: { quantity: { increment: old.quantity } },
            create: { partId: old.partId, branchId: oldBranchId, quantity: old.quantity },
          });
        }
      }

      await tx.saleItem.deleteMany({ where: { saleId } });

      for (const it of items) {
        if (it.isManualEntry) {
          await tx.saleItem.create({
            data: {
              saleId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              isManualEntry: true,
              manualItemName: it.manualItemName,
              manualPartNumber: it.manualPartNumber ?? null,
              manualCostPrice: it.manualCostPrice,
            },
          });
          continue;
        }

        const itemBranchId = it.branchId ?? branchId;
        const inv = await tx.inventory.findUnique({
          where: { partId_branchId: { partId: it.partId, branchId: itemBranchId } },
        });
        if (!inv || inv.quantity < it.quantity) {
          const part = await tx.part.findUnique({ where: { id: it.partId } });
          throw new Error(
            `Insufficient stock for ${part?.name ?? "this part"} (available: ${inv?.quantity ?? 0})`
          );
        }
        await tx.inventory.update({
          where: { partId_branchId: { partId: it.partId, branchId: itemBranchId } },
          data: { quantity: { decrement: it.quantity } },
        });
        await tx.saleItem.create({
          data: {
            saleId,
            partId: it.partId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            isManualEntry: false,
            sourceBranchId: itemBranchId,
          },
        });
      }

      if (sale.isCredit && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: sale.total } },
        });
      }
      if (isCredit) {
        await tx.customer.update({
          where: { id: customerId },
          data: { balance: { increment: newTotal } },
        });
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { createdAt: parsedDate, branchId, customerId, paymentMethod, isCredit, total: newTotal },
      });

      await logAudit(tx, {
        userId: session.user.id,
        action: "SALE_UPDATED",
        entityType: "Sale",
        entityId: saleId,
        metadata: {
          previousTotal: sale.total.toNumber(),
          total: newTotal,
          previousCustomerId: sale.customerId,
          customerId,
          previousIsCredit: sale.isCredit,
          isCredit,
          itemCount: items.length,
        },
      });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message || "Imeshindikana kuhariri sale" };
  }

  revalidatePath("/dashboard/sales/history");
  revalidatePath("/dashboard/admin/sales");
  revalidatePath(`/dashboard/admin/sales/${saleId}`);
  revalidatePath("/dashboard/admin/customers");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/sales/inventory");
  return { success: true };
}

/**
 * Reverses a completed sale's effects — restocks inventory, reverses the customer's balance if it
 * was a credit sale — then permanently removes the sale and its items. Replaces the old "void"
 * behaviour (mark VOIDED, keep the row): the explicit choice, made after flagging two real risks
 * it carries, since neither is something to silently paper over:
 *
 *   - It leaves a permanent gap in the invoice number sequence. A customer holding a printed or
 *     WhatsApp-shared receipt for this invoice will find nothing if they ever ask about it again.
 *   - It could otherwise orphan a CustomerPayment recorded directly against this invoice (the
 *     per-invoice collection feature in lib/actions/customers.ts) — the foreign key would just
 *     null it out, silently turning "paid against invoice #46" into an unallocated payment that
 *     gets re-spread across the customer's OTHER open invoices. Refused outright below instead:
 *     there is no safe way to guess what should happen to money already paid against a specific
 *     invoice that no longer exists.
 *
 * What was actually sold is captured into the audit log's metadata before the row disappears,
 * since that becomes the only place it survives — AuditLogDetailModal falls back to it once the
 * live sale can no longer be found.
 */
export async function deleteSale(saleId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Not authorized" };

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { include: { part: true } } },
  });
  if (!sale) return { success: false, error: "Sale not found" };
  if (sale.status === "VOIDED") {
    return { success: false, error: "This sale was already voided under the old system" };
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwnerWithinWindow =
    session.user.role === "SALES_STAFF" &&
    sale.userId === session.user.id &&
    Date.now() - sale.createdAt.getTime() <= SALE_DELETE_WINDOW_MS;

  if (!isAdmin && !isOwnerWithinWindow) {
    return {
      success: false,
      error: "You cannot delete this sale (30 minutes have passed since the sale, or it is not your sale)",
    };
  }

  const directPayments = await prisma.customerPayment.count({ where: { saleId } });
  if (directPayments > 0) {
    return {
      success: false,
      error:
        "Mauzo haya yana malipo yaliyorekodiwa moja kwa moja dhidi yake — huwezi kuyafuta. Angalia malipo hayo kwanza (Customers → invoice hii).",
    };
  }

  const defaultRestockBranchId = sale.sourceBranchId ?? sale.branchId;

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        if (item.isManualEntry || !item.partId) continue;
        const restockBranchId = item.sourceBranchId ?? defaultRestockBranchId;
        await tx.inventory.upsert({
          where: { partId_branchId: { partId: item.partId, branchId: restockBranchId } },
          update: { quantity: { increment: item.quantity } },
          create: { partId: item.partId, branchId: restockBranchId, quantity: item.quantity },
        });
      }

      if (sale.isCredit && sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: { decrement: sale.total } },
        });
      }

      await logAudit(tx, {
        userId: session.user.id,
        action: "SALE_DELETED",
        entityType: "Sale",
        entityId: saleId,
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          total: sale.total.toNumber(),
          branchId: sale.branchId,
          customerId: sale.customerId,
          isCredit: sale.isCredit,
          items: sale.items.map((i) => ({
            name: i.isManualEntry ? (i.manualItemName ?? "Manual item") : (i.part?.name ?? "Part"),
            partNumber: i.isManualEntry ? (i.manualPartNumber ?? null) : (i.part?.partNumber ?? null),
            quantity: i.quantity,
            unitPrice: i.unitPrice.toNumber(),
          })),
        },
      });

      // SaleItem cascades automatically (onDelete: Cascade in schema.prisma).
      await tx.sale.delete({ where: { id: saleId } });
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath("/dashboard/sales/history");
  revalidatePath("/dashboard/admin/sales");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/logs");
  return { success: true };
}

/** The one Sale-level field the Tax Invoice page edits directly — an EFD/TRA receipt reference
 * the admin types in by hand (no EFD integration exists). Everything else on that invoice either
 * comes straight from the sale/items (not editable there — use the sale's own Edit page) or from
 * the Customer record (tin/vrn/address — updated via updateCustomer). */
export async function updateSaleTraReceiptNo(saleId: string, traReceiptNo: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "You are not authorized to do this" };
  }

  try {
    await prisma.sale.update({
      where: { id: saleId },
      data: { traReceiptNo: traReceiptNo.trim() || null },
    });
  } catch {
    return { success: false, error: "Sale hii haipo tena" };
  }

  revalidatePath(`/dashboard/admin/sales/${saleId}/invoice`);
  return { success: true };
}
