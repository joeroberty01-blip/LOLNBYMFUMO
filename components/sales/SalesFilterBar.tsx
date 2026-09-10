"use client";

import { paymentMethods } from "@/lib/validators/sales";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { DateInput, Select, Label, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type Props = {
  action: string;
  branches: { id: string; name: string }[];
  staff?: { id: string; name: string }[];
  values: {
    branchId?: string;
    userId?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    manualOnly?: string;
    q?: string;
  };
};

export function SalesFilterBar({ action, branches, staff, values }: Props) {
  const t = useTranslations();
  return (
    <form action={action} method="GET" className="mb-6 flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <Label>{t.common.search}</Label>
        <Input
          type="text"
          name="q"
          defaultValue={values.q}
          placeholder="Namba ya invoice au jina la customer..."
        />
      </div>
      <div>
        <Label>{t.common.from}</Label>
        <DateInput name="dateFrom" defaultValue={values.dateFrom} />
      </div>
      <div>
        <Label>{t.common.to}</Label>
        <DateInput name="dateTo" defaultValue={values.dateTo} />
      </div>
      <div>
        <Label>{t.common.branch}</Label>
        <Select name="branchId" defaultValue={values.branchId ?? ""} className="w-auto">
          <option value="">{t.common.allBranches}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      {staff && (
        <div>
          <Label>{t.sales.historyFilter.staffLabel}</Label>
          <Select name="userId" defaultValue={values.userId ?? ""} className="w-auto">
            <option value="">{t.sales.historyFilter.allStaff}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div>
        <Label>{t.sales.historyFilter.paymentLabel}</Label>
        <Select name="paymentMethod" defaultValue={values.paymentMethod ?? ""} className="w-auto">
          <option value="">{t.sales.historyFilter.allPayments}</option>
          {paymentMethods.map((pm) => (
            <option key={pm} value={pm}>
              {PAYMENT_LABEL[pm]}
            </option>
          ))}
        </Select>
      </div>
      {staff && (
        <label className="flex items-center gap-1.5 pb-2 text-sm text-primary">
          <input
            type="checkbox"
            name="manualOnly"
            value="1"
            defaultChecked={values.manualOnly === "1"}
          />
          {t.sales.historyFilter.manualOnlyLabel}
        </label>
      )}
      <Button type="submit" variant="secondary">
        {t.common.filter}
      </Button>
    </form>
  );
}
