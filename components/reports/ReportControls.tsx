"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { periods, type Period } from "@/lib/dateRanges";
import { paymentMethods } from "@/lib/validators/sales";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annually",
  custom: "Custom",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

const MONTHS = [
  "Januari", "Februari", "Machi", "Aprili", "Mei", "Juni",
  "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba",
];

type Props = {
  branches?: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  showPaymentMethod?: boolean;
  showManualOnly?: boolean;
};

export function ReportControls({
  branches,
  staff,
  showPaymentMethod,
  showManualOnly,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPeriod = (searchParams.get("period") as Period) || "daily";
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setPeriod(period: Period) {
    updateParams({
      period,
      date: undefined,
      weekOf: undefined,
      month: undefined,
      year: undefined,
      from: undefined,
      to: undefined,
    });
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap gap-1 rounded-md border border-black/10 dark:border-white/15 p-1 w-fit">
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded px-3 py-1.5 text-sm ${
              currentPeriod === p
                ? "bg-foreground text-background"
                : "hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {currentPeriod === "daily" && (
          <div>
            <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Tarehe</label>
            <input
              type="date"
              defaultValue={searchParams.get("date") ?? ""}
              onChange={(e) => updateParams({ date: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            />
          </div>
        )}

        {currentPeriod === "weekly" && (
          <div>
            <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
              Siku yoyote ndani ya wiki
            </label>
            <input
              type="date"
              defaultValue={searchParams.get("weekOf") ?? ""}
              onChange={(e) => updateParams({ weekOf: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            />
          </div>
        )}

        {currentPeriod === "monthly" && (
          <>
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Mwezi</label>
              <select
                defaultValue={searchParams.get("month") ?? String(now.getMonth() + 1)}
                onChange={(e) => updateParams({ month: e.target.value })}
                className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Mwaka</label>
              <select
                defaultValue={searchParams.get("year") ?? String(currentYear)}
                onChange={(e) => updateParams({ year: e.target.value })}
                className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {currentPeriod === "annually" && (
          <div>
            <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Mwaka</label>
            <select
              defaultValue={searchParams.get("year") ?? String(currentYear)}
              onChange={(e) => updateParams({ year: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentPeriod === "custom" && (
          <>
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Kutoka</label>
              <input
                type="date"
                defaultValue={searchParams.get("from") ?? ""}
                onChange={(e) => updateParams({ from: e.target.value })}
                className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Hadi</label>
              <input
                type="date"
                defaultValue={searchParams.get("to") ?? ""}
                onChange={(e) => updateParams({ to: e.target.value })}
                className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {branches && (
          <div>
            <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Branch</label>
            <select
              defaultValue={searchParams.get("branchId") ?? ""}
              onChange={(e) => updateParams({ branchId: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Branches zote</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {staff && (
          <div>
            <label className="block text-xs text-black/60 dark:text-white/60 mb-1">
              Sales Staff
            </label>
            <select
              defaultValue={searchParams.get("userId") ?? ""}
              onChange={(e) => updateParams({ userId: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Wote</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showPaymentMethod && (
          <div>
            <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Payment</label>
            <select
              defaultValue={searchParams.get("paymentMethod") ?? ""}
              onChange={(e) => updateParams({ paymentMethod: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Zote</option>
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {PAYMENT_LABEL[pm]}
                </option>
              ))}
            </select>
          </div>
        )}

        {showManualOnly && (
          <label className="flex items-center gap-1.5 text-sm pb-2">
            <input
              type="checkbox"
              defaultChecked={searchParams.get("manualOnly") === "1"}
              onChange={(e) => updateParams({ manualOnly: e.target.checked ? "1" : undefined })}
            />
            Manual Items Only
          </label>
        )}
      </div>
    </div>
  );
}
