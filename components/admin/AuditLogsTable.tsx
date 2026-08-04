"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AuditLogRow } from "@/lib/data/audit-logs";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isUndoableAuditAction } from "@/lib/undoableActions";
import { undoAuditLog } from "@/lib/actions/auditLogs";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

function actionBadgeVariant(action: string): ReturnType<typeof statusBadgeVariant> {
  if (action.endsWith("_DELETED") || action === "SALE_VOIDED") return "danger";
  if (action.endsWith("_CREATED") || action.endsWith("_COMPLETED") || action.endsWith("_RECORDED"))
    return "success";
  if (action.endsWith("_UPDATED") || action.endsWith("_ADJUSTED")) return "warning";
  return "neutral";
}

export function AuditLogsTable({ rows, t }: { rows: AuditLogRow[]; t: Dictionary }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUndo(row: AuditLogRow) {
    const confirmed = window.confirm(`${t.adminOps.auditLogs.confirmUndo} — ${row.action}?`);
    if (!confirmed) return;

    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      const result = await undoAuditLog(row.id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState title={t.adminOps.auditLogs.empty} />;
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <Table>
        <THead>
          <THeadRow>
            <Th>{t.common.date}</Th>
            <Th>{t.adminOps.auditLogs.action}</Th>
            <Th>{t.adminOps.auditLogs.entityType}</Th>
            <Th>{t.adminOps.auditLogs.performedBy}</Th>
            <Th>{t.adminOps.auditLogs.details}</Th>
            <Th>{t.common.actions}</Th>
          </THeadRow>
        </THead>
        <TBody>
          {rows.map((r, i) => (
            <Tr key={r.id} index={i}>
              <Td className="whitespace-nowrap text-secondary">
                {r.createdAt.toLocaleString("sw-TZ")}
              </Td>
              <Td>
                <Badge status={actionBadgeVariant(r.action)}>{r.action}</Badge>
              </Td>
              <Td className="text-primary">{r.entityType}</Td>
              <Td className="text-secondary">{r.userName}</Td>
              <Td className="max-w-[360px] truncate text-secondary">
                <span title={r.metadata ? JSON.stringify(r.metadata) : undefined}>
                  {r.metadata ? JSON.stringify(r.metadata) : "—"}
                </span>
              </Td>
              <Td>
                {isUndoableAuditAction(r.action) && (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={isPending && pendingId === r.id}
                    onClick={() => handleUndo(r)}
                  >
                    {t.adminOps.auditLogs.undo}
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </>
  );
}
