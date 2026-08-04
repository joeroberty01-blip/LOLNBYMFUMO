"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUndoableAuditAction } from "@/lib/undoableActions";
import { voidSale } from "@/lib/actions/sales";
import { deletePurchase } from "@/lib/actions/purchases";
import { deleteCustomerPayment } from "@/lib/actions/customers";
import { deleteSupplierPayment } from "@/lib/actions/suppliers";
import { deleteExpense } from "@/lib/actions/expenses";
import { adjustStock } from "@/lib/actions/inventory";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Reverses whatever an audit log entry recorded, by delegating to the same void/delete action a
 * human would use for that entity — never re-implements the reversal logic here. Only actions
 * registered in isUndoableAuditAction (lib/audit.ts) are handled; everything else (renames,
 * status changes, anything where the log only has the new value and not the old one) returns an
 * error rather than guessing.
 */
export async function undoAuditLog(logId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Huna ruhusa ya kufanya hili" };
  }

  const log = await prisma.auditLog.findUnique({ where: { id: logId } });
  if (!log) return { success: false, error: "Log hii haipo" };

  if (!isUndoableAuditAction(log.action)) {
    return { success: false, error: "Kitendo hiki hakiwezi kuondolewa (undo)" };
  }

  const metadata = (log.metadata as Record<string, unknown> | null) ?? {};
  let result: ActionResult;

  switch (log.action) {
    case "SALE_COMPLETED":
      result = await voidSale(log.entityId);
      break;

    case "PURCHASE_CREATED":
      result = await deletePurchase(log.entityId);
      break;

    case "SUPPLIER_PAYMENT_RECORDED":
      result = await deleteSupplierPayment(log.entityId);
      break;

    case "CUSTOMER_PAYMENT_RECORDED":
      result = await deleteCustomerPayment(log.entityId);
      break;

    case "EXPENSE_CREATED":
      result = await deleteExpense(log.entityId);
      break;

    case "STOCK_ADJUSTED": {
      const { partId, branchId, quantityChange } = metadata;
      if (
        typeof partId !== "string" ||
        typeof branchId !== "string" ||
        typeof quantityChange !== "number"
      ) {
        result = { success: false, error: "Taarifa za log hii hazitoshi kuondoa kitendo" };
      } else {
        result = await adjustStock({
          partId,
          branchId,
          quantityChange: -quantityChange,
          reason: "CORRECTION",
        });
      }
      break;
    }

    default:
      result = { success: false, error: "Kitendo hiki hakiwezi kuondolewa (undo)" };
  }

  if (result.success) {
    revalidatePath("/dashboard/admin/logs");
  }
  return result;
}
