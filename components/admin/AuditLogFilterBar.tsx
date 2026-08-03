"use client";

import { useTranslations } from "@/lib/i18n/I18nProvider";
import { DateInput, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  action: string;
  actions: string[];
  entityTypes: string[];
  values: {
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export function AuditLogFilterBar({ action, actions, entityTypes, values }: Props) {
  const t = useTranslations();
  return (
    <form action={action} method="GET" className="mb-6 flex flex-wrap items-end gap-2">
      <div>
        <Label>{t.common.from}</Label>
        <DateInput name="dateFrom" defaultValue={values.dateFrom} />
      </div>
      <div>
        <Label>{t.common.to}</Label>
        <DateInput name="dateTo" defaultValue={values.dateTo} />
      </div>
      <div>
        <Label>{t.adminOps.auditLogs.action}</Label>
        <Select name="action" defaultValue={values.action ?? ""} className="w-auto">
          <option value="">{t.adminOps.auditLogs.allActions}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{t.adminOps.auditLogs.entityType}</Label>
        <Select name="entityType" defaultValue={values.entityType ?? ""} className="w-auto">
          <option value="">{t.adminOps.auditLogs.allEntityTypes}</option>
          {entityTypes.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary">
        {t.common.filter}
      </Button>
    </form>
  );
}
