"use client";

import type { AuditLogRow } from "@/lib/data/audit-logs";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { actionBadgeVariant, displayMetadata, formatMetadataValue, humanizeKey } from "@/lib/auditLogDisplay";
import { Badge } from "@/components/ui/Badge";

/** Full detail of one audit log entry — the "View" action next to Undo. The table row already
 * shows a truncated one-line summary of `metadata`; this is the same data, untruncated and laid
 * out as readable label/value pairs instead of a single stringified blob. */
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
