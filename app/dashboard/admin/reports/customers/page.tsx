import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomersWithDebt } from "@/lib/data/reports/customers";
import { ReportActions } from "@/components/reports/ReportActions";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function CustomersDebtReportPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  const debtors = await getCustomersWithDebt();
  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-primary">{t.reports.customers.title}</h1>
      <p className="mb-6 text-sm text-secondary">
        {t.reports.customers.snapshotAsOf}
        {new Date().toLocaleDateString("sw-TZ")}
      </p>

      <ReportActions reportType="customers" title={t.reports.customers.title} />

      <div className="mb-6 w-fit">
        <StatCard
          icon={<CreditCard size={18} />}
          label={t.reports.customers.totalDebt}
          value={currency.format(totalDebt)}
          alert
        />
      </div>

      {debtors.length === 0 ? (
        <EmptyState title={t.reports.customers.noDebtors} />
      ) : (
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
                <Td>{d.name}</Td>
                <Td>{d.phone ?? "—"}</Td>
                <Td className="text-right font-medium text-danger tabular-nums">
                  {currency.format(d.balance)}
                </Td>
                <Td className="text-right tabular-nums">{currency.format(d.creditLimit)}</Td>
                <Td>
                  <Link
                    href={`/dashboard/admin/reports/customers/${d.id}`}
                    className="text-accent no-print hover:underline"
                  >
                    {t.reports.customers.history}
                  </Link>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
