import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export type StatAccent = "primary" | "secondary" | "tertiary" | "success" | "danger" | "warning";

const ACCENT_CLASSES: Record<StatAccent, { icon: string }> = {
  primary: { icon: "bg-accent/15 text-accent" },
  secondary: { icon: "bg-accent-2/15 text-accent-2" },
  tertiary: { icon: "bg-accent-3/15 text-accent-3" },
  success: { icon: "bg-success/15 text-success" },
  danger: { icon: "bg-danger/15 text-danger" },
  warning: { icon: "bg-warning/15 text-warning" },
};

export function StatCard({
  icon,
  label,
  value,
  change,
  accent = "primary",
  alert = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  change?: { value: number; direction: "up" | "down" };
  accent?: StatAccent;
  /** Real-alert styling (e.g. customer debt) — tinted red card, not just an accent icon. */
  alert?: boolean;
}) {
  const iconClasses = alert ? "bg-danger/15 text-danger" : ACCENT_CLASSES[accent].icon;

  return (
    <div
      className={`relative rounded-card border p-5 ${
        alert ? "border-danger/30 bg-danger/[0.07]" : "border-border bg-surface"
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-control ${iconClasses}`}>
          {icon}
        </div>
        <button
          type="button"
          className="text-secondary hover:text-primary"
          aria-label="More options"
          tabIndex={-1}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      <p className="mb-1 text-sm text-secondary">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-semibold tabular-nums text-primary">{value}</p>
        {change && (
          <span
            className={`mb-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums ${
              change.direction === "up" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            }`}
          >
            {change.direction === "up" ? "↑" : "↓"} {Math.abs(change.value).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
