"use client";

import { useEffect, useState } from "react";
import type { AuditLogRow } from "@/lib/data/audit-logs";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getSaleDetailForAudit, type SaleAuditDetail } from "@/lib/actions/auditLogs";
import { actionBadgeVariant, displayMetadata, formatMetadataValue, humanizeKey } from "@/lib/auditLogDisplay";
import { Badge } from "@/components/ui/Badge";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Full detail of one audit log entry — the "View" action next to Undo. The table row already
 * shows a truncated one-line summary of `metadata`; this is the same data, untruncated and laid
 * out as readable label/value pairs instead of a single stringified blob.
 *
 * For a Sale-entity row (SALE_COMPLETED / SALE_UPDATED / SALE_VOIDED) that generic metadata list
 * is not enough — it only ever carried a total and an item count, never what was actually sold —
 * so this additionally fetches and shows the sale's real line items, the same data the receipt
 * shows.
 */
export function AuditLogDetailModal({
  row,
  onClose,
  t,
}: {
  row: AuditLogRow;
  onClose: () => void;
  t: Dictionary;
}) {
  const metadata = displayMetadata(row.metadata);
  const entries = metadata ? Object.entries(metadata) : [];

  const isSale = row.entityType === "Sale";
  const [saleDetail, setSaleDetail] = useState<SaleAuditDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!isSale) return;
    // No reset-to-undefined here: AuditLogsTable mounts a fresh modal per row (`viewRow &&
    // <AuditLogDetailModal .../>`), never reuses one across a different row, so the initial
    // `useState(undefined)` above already is the loading state for this specific sale.
    let cancelled = false;
    getSaleDetailForAudit(row.entityId).then((detail) => {
      if (!cancelled) setSaleDetail(detail);
    });
    return () => {
      cancelled = true;
    };
  }, [isSale, row.entityId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface-elevated p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-medium text-primary">{t.adminOps.auditLogs.viewDetailTitle}</h2>
            <Badge status={actionBadgeVariant(row.action)}>{row.action}</Badge>
          </div>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 rounded-control border border-border bg-surface p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-secondary">{t.common.date}</p>
            <p className="text-primary">{row.createdAt.toLocaleString("sw-TZ")}</p>
          </div>
          <div>
            <p className="text-xs text-secondary">{t.adminOps.auditLogs.performedBy}</p>
            <p className="text-primary">{row.userName}</p>
          </div>
          <div>
            <p className="text-xs text-secondary">{t.adminOps.auditLogs.entityType}</p>
            <p className="text-primary">{row.entityType}</p>
          </div>
          <div>
            <p className="text-xs text-secondary">{t.adminOps.auditLogs.entityId}</p>
            <p className="truncate text-primary" title={row.entityId}>
              {row.entityId}
            </p>
          </div>
        </div>

        {isSale && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-secondary uppercase">
              {t.adminOps.auditLogs.saleItemsTitle}
            </p>
            {saleDetail === undefined ? (
              <p className="text-sm text-secondary">{t.common.loading}</p>
            ) : saleDetail === null ? (
              <p className="text-sm text-secondary">{t.adminOps.auditLogs.saleNotFound}</p>
            ) : (
              <div className="rounded-control border border-border">
                <div className="flex flex-col divide-y divide-border">
                  {saleDetail.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-primary">
                          {item.name}
                          {item.partNumber ? ` (${item.partNumber})` : ""}
                        </p>
                        <p className="text-xs text-secondary">
                          {item.quantity} x {currency.format(item.unitPrice)}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-primary">
                        {currency.format(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm font-medium">
                  <span className="text-secondary">{t.common.total}</span>
                  <span className="tabular-nums text-primary">{currency.format(saleDetail.total)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mb-2 text-xs font-medium text-secondary uppercase">
          {t.adminOps.auditLogs.details}
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-secondary">{t.adminOps.auditLogs.noDetails}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-control border border-border">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
                <span className="shrink-0 text-secondary">{humanizeKey(key)}</span>
                <span className="text-right break-all text-primary">{formatMetadataValue(value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control border border-border px-4 py-2 text-sm text-primary hover:bg-white/5"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
