"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  approveSalesStaff,
  rejectSalesStaff,
  deactivateSalesStaff,
  createUserByAdmin,
} from "@/lib/actions/admin";
import { adminCreateUserSchema } from "@/lib/validators/auth";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Staff = {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED";
  createdAt: Date;
};

type Admin = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

const STATUS_BADGE: Record<Staff["status"], BadgeStatus> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  DEACTIVATED: "neutral",
};

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof adminCreateUserSchema>, unknown, z.output<typeof adminCreateUserSchema>>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", role: "SALES_STAFF" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await createUserByAdmin(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    onCreated();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">{t.adminOps.salesStaff.addUser.title}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>{t.adminOps.salesStaff.addUser.role}</Label>
            <select
              {...register("role")}
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary"
            >
              <option value="SALES_STAFF">{t.adminOps.salesStaff.addUser.roleSalesStaff}</option>
              <option value="ADMIN">{t.adminOps.salesStaff.addUser.roleAdmin}</option>
            </select>
          </div>
          <div>
            <Label>{t.adminOps.salesStaff.addUser.name}</Label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <Label>{t.adminOps.salesStaff.addUser.email}</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
          </div>
          <div>
            <Label>{t.adminOps.salesStaff.addUser.password}</Label>
            <Input type="password" {...register("password")} />
            {errors.password && (
              <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label>{t.adminOps.salesStaff.addUser.confirmPassword}</Label>
            <Input type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.adminOps.salesStaff.addUser.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? t.adminOps.salesStaff.addUser.submitting
                : t.adminOps.salesStaff.addUser.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SalesStaffTable({
  initialStaff,
  admins,
}: {
  initialStaff: Staff[];
  admins: Admin[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-secondary uppercase tracking-wide">
            {t.adminOps.salesStaff.admins.title} ({admins.length})
          </h2>
          <Button type="button" variant="primary" onClick={() => setAddUserOpen(true)}>
            {t.adminOps.salesStaff.addUser.button}
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {admins.map((a) => (
            <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-primary">{a.name}</p>
                <p className="truncate text-sm text-secondary">{a.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-xs text-secondary">
                  {t.adminOps.salesStaff.admins.since} {a.createdAt.toLocaleDateString()}
                </p>
                <Link href={`/dashboard/admin/sales-staff/${a.id}/edit`}>
                  <Button type="button" variant="secondary">
                    {t.common.edit}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}

        {staff.length === 0 && <EmptyState title={t.adminOps.salesStaff.noStaff} />}

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
            <Link href={`/dashboard/admin/sales-staff/${s.id}/edit`}>
              <Button type="button" variant="secondary">
                {t.common.edit}
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

      {addUserOpen && (
        <AddUserModal
          onClose={() => setAddUserOpen(false)}
          onCreated={() => {
            setAddUserOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
