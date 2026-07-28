"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { periods, type Period } from "@/lib/dateRanges";
import { paymentMethods } from "@/lib/validators/sales";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { DateInput, Select, Label } from "@/components/ui/Input";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type Props = {
  branches?: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  showPaymentMethod?: boolean;
  showManualOnly?: boolean;
  categories?: { value: string; label: string }[];
};

export function ReportControls({
  branches,
  staff,
  showPaymentMethod,
  showManualOnly,
  categories,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const PERIOD_LABEL: Record<Period, string> = {
    daily: t.reports.controls.daily,
    weekly: t.reports.controls.weekly,
    monthly: t.reports.controls.monthly,
    annually: t.reports.controls.annually,
    custom: t.reports.controls.custom,
  };

  const MONTHS = [
    t.reports.controls.january,
    t.reports.controls.february,
    t.reports.controls.march,
    t.reports.controls.april,
    t.reports.controls.may,
    t.reports.controls.june,
    t.reports.controls.july,
    t.reports.controls.august,
    t.reports.controls.september,
    t.reports.controls.october,
    t.reports.controls.november,
    t.reports.controls.december,
  ];

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
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex w-fit flex-wrap gap-1 rounded-control border border-border bg-surface-elevated p-1">
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
              currentPeriod === p
                ? "bg-accent/20 text-accent"
                : "text-secondary hover:text-primary"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {currentPeriod === "daily" && (
          <div>
            <Label>{t.common.date}</Label>
            <DateInput
              defaultValue={searchParams.get("date") ?? ""}
              onChange={(e) => updateParams({ date: e.target.value })}
            />
          </div>
        )}

        {currentPeriod === "weekly" && (
          <div>
            <Label>{t.reports.controls.anyDayInWeek}</Label>
            <DateInput
              defaultValue={searchParams.get("weekOf") ?? ""}
              onChange={(e) => updateParams({ weekOf: e.target.value })}
            />
          </div>
        )}

        {currentPeriod === "monthly" && (
          <>
            <div>
              <Label>{t.reports.controls.month}</Label>
              <Select
                defaultValue={searchParams.get("month") ?? String(now.getMonth() + 1)}
                onChange={(e) => updateParams({ month: e.target.value })}
                className="w-auto"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t.reports.controls.year}</Label>
              <Select
                defaultValue={searchParams.get("year") ?? String(currentYear)}
                onChange={(e) => updateParams({ year: e.target.value })}
                className="w-auto"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {currentPeriod === "annually" && (
          <div>
            <Label>{t.reports.controls.year}</Label>
            <Select
              defaultValue={searchParams.get("year") ?? String(currentYear)}
              onChange={(e) => updateParams({ year: e.target.value })}
              className="w-auto"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        )}

        {currentPeriod === "custom" && (
          <>
            <div>
              <Label>{t.common.from}</Label>
              <DateInput
                defaultValue={searchParams.get("from") ?? ""}
                onChange={(e) => updateParams({ from: e.target.value })}
              />
            </div>
            <div>
              <Label>{t.common.to}</Label>
              <DateInput
                defaultValue={searchParams.get("to") ?? ""}
                onChange={(e) => updateParams({ to: e.target.value })}
              />
            </div>
          </>
        )}

        {branches && (
          <div>
            <Label>{t.common.branch}</Label>
            <Select
              defaultValue={searchParams.get("branchId") ?? ""}
              onChange={(e) => updateParams({ branchId: e.target.value })}
              className="w-auto"
            >
              <option value="">{t.common.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {staff && (
          <div>
            <Label>{t.nav.salesStaff}</Label>
            <Select
              defaultValue={searchParams.get("userId") ?? ""}
              onChange={(e) => updateParams({ userId: e.target.value })}
              className="w-auto"
            >
              <option value="">{t.reports.controls.allStaff}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {categories && (
          <div>
            <Label>{t.common.category}</Label>
            <Select
              defaultValue={searchParams.get("category") ?? ""}
              onChange={(e) => updateParams({ category: e.target.value })}
              className="w-auto"
            >
              <option value="">{t.reports.controls.allOptions}</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {showPaymentMethod && (
          <div>
            <Label>{t.reports.controls.payment}</Label>
            <Select
              defaultValue={searchParams.get("paymentMethod") ?? ""}
              onChange={(e) => updateParams({ paymentMethod: e.target.value })}
              className="w-auto"
            >
              <option value="">{t.reports.controls.allOptions}</option>
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {PAYMENT_LABEL[pm]}
                </option>
              ))}
            </Select>
          </div>
        )}

        {showManualOnly && (
          <label className="flex items-center gap-1.5 pb-2 text-sm text-primary">
            <input
              type="checkbox"
              defaultChecked={searchParams.get("manualOnly") === "1"}
              onChange={(e) => updateParams({ manualOnly: e.target.checked ? "1" : undefined })}
            />
            {t.reports.controls.manualItemsOnly}
          </label>
        )}
      </div>
    </div>
  );
}
