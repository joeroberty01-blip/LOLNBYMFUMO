/** Plain data, safe to import from both server actions and client components (unlike
 * lib/audit.ts, which is server-only) — the set of audit actions that have a safe, well-defined
 * reversal already implemented elsewhere in the app (void/delete actions that themselves fully
 * undo the side effects). Actions that only changed a value in place (e.g. *_UPDATED) aren't
 * included — the audit log stores the new value, not the old one, so there is nothing safe to
 * restore to. */
const UNDOABLE_ACTIONS = new Set([
  "SALE_COMPLETED",
  "STOCK_ADJUSTED",
  "SUPPLIER_PAYMENT_RECORDED",
  "CUSTOMER_PAYMENT_RECORDED",
  "EXPENSE_CREATED",
  "PURCHASE_CREATED",
]);

export function isUndoableAuditAction(action: string): boolean {
  return UNDOABLE_ACTIONS.has(action);
}
