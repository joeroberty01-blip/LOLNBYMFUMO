import type { ReactNode } from "react";

export type BadgeStatus = "success" | "warning" | "danger" | "neutral" | "info";

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-white/10 text-secondary",
  info: "bg-accent-3/15 text-accent-3",
};

export function Badge({
  status = "neutral",
  children,
}: {
  status?: BadgeStatus;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {children}
    </span>
  );
}

/** Maps common ERP status strings to a consistent Badge color everywhere they appear. */
export function statusBadgeVariant(status: string): BadgeStatus {
  const s = status.toUpperCase();
  if (["PAID", "COMPLETED", "APPROVED", "ACTIVE"].includes(s)) return "success";
  if (["PENDING"].includes(s)) return "warning";
  if (["VOIDED", "REJECTED", "DEACTIVATED", "OVERDUE"].includes(s)) return "danger";
  return "neutral";
}
