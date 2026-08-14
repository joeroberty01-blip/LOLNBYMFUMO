import type { ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * Whether a block's figures move when the date range changes. Accounting screens mix the two
 * constantly — a P&L is for a period, stock and debts are as-of-now — and reading a
 * point-in-time figure as if it belonged to the selected month is an easy and costly mistake.
 * Every section states which it is.
 */
export type Basis = "period" | "now";

const BASIS_STYLE: Record<Basis, { label: string; className: string }> = {
  period: { label: "KIPINDI", className: "border-accent/40 bg-accent/10 text-accent" },
  now: { label: "SASA HIVI", className: "border-border bg-white/[0.04] text-secondary" },
};

export function Section({
  title,
  subtitle,
  basis,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  basis?: Basis;
  /** Optional control or figure pinned to the header's right edge. */
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const badge = basis ? BASIS_STYLE[basis] : null;
  return (
    <section className={`flex min-w-0 flex-col ${className}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
          {badge && (
            <span
              className={`rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        {right && <div className="shrink-0 text-xs text-secondary">{right}</div>}
      </div>
      {subtitle && <p className="mb-3 text-xs text-secondary">{subtitle}</p>}
      {children}
    </section>
  );
}

/**
 * A caveat that must stay available but must not dominate the page. Collapsed to one line by
 * default — the earlier full-height amber blocks pushed the actual figures below the fold and
 * broke the reading flow between tables.
 */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mt-2 rounded-card border border-warning/30 bg-warning/5 px-3 py-2">
      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-warning">
        <Info size={13} />
        {title}
      </summary>
      <div className="mt-2 text-xs leading-relaxed text-secondary">{children}</div>
    </details>
  );
}
