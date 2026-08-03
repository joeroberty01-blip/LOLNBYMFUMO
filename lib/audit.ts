import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "SALE_COMPLETED"
  | "SALE_VOIDED"
  | "STOCK_ADJUSTED"
  | "MANUAL_ITEM_CONVERTED"
  | "PARTS_BULK_IMPORTED"
  | "STORE_CREATED"
  | "STORE_UPDATED"
  | "BACKUP_RESTORED"
  | "SUPPLIER_PAYMENT_RECORDED"
  | "CUSTOMER_PAYMENT_RECORDED"
  | "EXPENSE_CREATED"
  | "EXPENSE_UPDATED"
  | "EXPENSE_DELETED"
  | "USER_CREATED"
  | "PURCHASE_CREATED"
  | "PURCHASE_UPDATED"
  | "PURCHASE_DELETED";

export type AuditEntityType =
  | "Sale"
  | "StockAdjustment"
  | "Part"
  | "SupplierPayment"
  | "CustomerPayment"
  | "Expense"
  | "Branch"
  | "User"
  | "Purchase";

/**
 * Writes one audit log row inside the same transaction as the operation it's recording, so the
 * audit trail can never drift from what actually happened (no operation without a log, no log
 * without the operation actually committing).
 */
export async function logAudit(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
