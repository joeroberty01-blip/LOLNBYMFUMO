"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveSalesStaff,
  rejectSalesStaff,
  deactivateSalesStaff,
} from "@/lib/actions/admin";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Staff = {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED";
  createdAt: Date;
};

const STATUS_BADGE: Record<Staff["status"], BadgeStatus> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  DEACTIVATED: "neutral",
};

export function SalesStaffTable({ initialStaff }: { initialStaff: Staff[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    staff: Staff;
    action: (id: string) => Promise<{ success: true } | { success: false; error: string }>;
    nextStatus: Staff["status"];
    label: string;
  } | null>(null);

  const STATUS_LABEL: Record<Staff["status"], string> = {
    PENDING: t.adminOps.salesStaff.status.pending,
    APPROVED: t.adminOps.salesStaff.status.approved,
    REJECTED: t.adminOps.salesStaff.status.rejected,
    DEACTIVATED: t.adminOps.salesStaff.status.deactivated,
  };

  function runAction(
    id: string,
    action: (id: string) => Promise<{ success: true } | { success: false; error: string }>,
    nextStatus: Staff["status"]
  ) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s)));
      router.refresh();
    });
  }

  function confirmPendingAction() {
    if (!confirmTarget) return;
    const { staff: s, action, nextStatus } = confirmTarget;
    setConfirmTarget(null);
    runAction(s.id, action, nextStatus);
  }

  if (staff.length === 0) {
    return <EmptyState title={t.adminOps.salesStaff.noStaff} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}

      {staff.map((s) => (
        <Card key={s.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium text-primary">{s.name}</p>
            <p className="truncate text-sm text-secondary">{s.email}</p>
            <span className="mt-1 inline-block">
              <Badge status={STATUS_BADGE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
            </span>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link href={`/dashboard/admin/sales-staff/${s.id}`}>
              <Button type="button" variant="secondary">
                {t.common.view}
              </Button>
            </Link>

            {s.status === "PENDING" && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending && pendingId === s.id}
                  onClick={() => runAction(s.id, approveSalesStaff, "APPROVED")}
                >
                  {t.adminOps.salesStaff.approve}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending && pendingId === s.id}
                  onClick={() =>
                    setConfirmTarget({
                      staff: s,
                      action: rejectSalesStaff,
                      nextStatus: "REJECTED",
                      label: t.adminOps.salesStaff.reject,
                    })
                  }
                >
                  {t.adminOps.salesStaff.reject}
                </Button>
              </>
            )}

            {s.status === "APPROVED" && (
              <Button
                type="button"
                variant="danger"
                disabled={isPending && pendingId === s.id}
                onClick={() =>
                  setConfirmTarget({
                    staff: s,
                    action: deactivateSalesStaff,
                    nextStatus: "DEACTIVATED",
                    label: t.adminOps.salesStaff.deactivate,
                  })
                }
              >
                {t.adminOps.salesStaff.deactivate}
              </Button>
            )}

            {(s.status === "REJECTED" || s.status === "DEACTIVATED") && (
              <Button
                type="button"
                variant="secondary"
                disabled={isPending && pendingId === s.id}
                onClick={() => runAction(s.id, approveSalesStaff, "APPROVED")}
              >
                {t.adminOps.salesStaff.reapprove}
              </Button>
            )}
          </div>
        </Card>
      ))}

      {confirmTarget && (
        <ConfirmDialog
          title={`${confirmTarget.label} — ${confirmTarget.staff.name}`}
          lines={[
            { label: t.common.name, value: confirmTarget.staff.name },
            { label: "Email", value: confirmTarget.staff.email },
          ]}
          confirmLabel={confirmTarget.label}
          confirmVariant="danger"
          isSubmitting={isPending}
          onConfirm={confirmPendingAction}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
