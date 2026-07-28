"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type Period } from "@/lib/dateRanges";
import { useTranslations } from "@/lib/i18n/I18nProvider";

const DASHBOARD_PERIODS: Period[] = ["daily", "weekly", "monthly", "annually"];

export function PeriodTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const current = (searchParams.get("period") as Period) || "monthly";

  const labels: Record<Period, string> = {
    daily: t.reports.controls.daily,
    weekly: t.reports.controls.weekly,
    monthly: t.reports.controls.monthly,
    annually: t.reports.controls.annually,
    custom: t.reports.controls.custom,
  };

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex gap-1 rounded-control border border-border bg-surface-elevated p-1">
      {DASHBOARD_PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setPeriod(p)}
          className={`rounded-control px-3 py-1.5 text-xs font-medium transition-colors ${
            current === p ? "bg-accent/20 text-accent" : "text-secondary hover:text-primary"
          }`}
        >
          {labels[p]}
        </button>
      ))}
    </div>
  );
}
