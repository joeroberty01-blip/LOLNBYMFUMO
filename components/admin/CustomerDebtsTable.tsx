import Link from "next/link";
import type { DebtorRow } from "@/lib/data/reports/customers";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PayCustomerButton } from "@/components/admin/PayCustomerButton";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function CustomerDebtsTable({
  debtors,
  branches,
  t,
}: {
  debtors: DebtorRow[];
  branches: { id: string; name: string }[];
  t: Dictionary;
}) {
  if (debtors.length === 0) {
    return <EmptyState title={t.reports.customers.noDebtors} />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>{t.common.name}</Th>
          <Th>{t.common.phone}</Th>
          <Th className="text-right">{t.reports.customers.balance}</Th>
          <Th className="text-right">{t.reports.customers.creditLimit}</Th>
          <Th>{t.common.actions}</Th>
        </THeadRow>
      </THead>
      <TBody>
        {debtors.map((d, i) => (
          <Tr key={d.id} index={i}>
            <Td className="font-medium text-primary">{d.name}</Td>
            <Td>{d.phone ?? "—"}</Td>
            <Td className="text-right font-medium text-danger tabular-nums">
              {currency.format(d.balance)}
            </Td>
            <Td className="text-right tabular-nums">{currency.format(d.creditLimit)}</Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <PayCustomerButton
                  customerId={d.id}
                  customerName={d.name}
                  currentBalance={d.balance}
                  branches={branches}
                />
                <Link
                  href={`/dashboard/admin/reports/customers/${d.id}`}
                  className="text-sm text-accent hover:underline"
                >
                  {t.reports.customers.history}
                </Link>
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
