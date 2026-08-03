"use client";

import type { ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type TabItem = {
  value: string;
  label: string;
  icon?: ReactNode;
};

/** URL-driven tab bar (?tab=value) — same live-navigation pattern as PeriodTabs, generalized to
 * any set of tabs. Switching tabs re-renders the Server Component page with fresh data, no full
 * page reload. */
export function Tabs({
  tabs,
  paramName = "tab",
  defaultValue,
}: {
  tabs: TabItem[];
  paramName?: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) || defaultValue;

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-control border border-border bg-surface-elevated p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => setTab(tab.value)}
          className={`flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
            current === tab.value
              ? "bg-accent/20 text-accent"
              : "text-secondary hover:text-primary"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
