import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerDetail, getCustomerSaleHistory, getCustomerPayments } from "@/lib/data/customers";
import { getBranches } from "@/lib/data/branches";
import { getServerDictionary } from "@/lib/i18n/server";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PayCustomerButton } from "@/components/admin/PayCustomerButton";
import { CreditCard, Wallet } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { id } = await params;
  const { t } = await getServerDictionary();

  const customer = await getCustomerDetail(id);
  if (!customer) notFound();
  const sales = await getCustomerSaleHistory(id);
  const payments = await getCustomerPayments(id);
  const branches = await getBranches();

  return (
    <div>
      <Link href="/dashboard/admin/customers" className="text-sm text-accent hover:underline">
        {t.adminCatalog.customers.backToCustomers}
      </Link>

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-primary">{customer.name}</h1>
            <Badge status={customer.isActive ? "success" : "neutral"}>
              {customer.isActive ? t.common.active : t.common.archived}
            </Badge>
          </div>
          <p className="text-sm text-secondary">
            {customer.phone ?? "—"} {customer.email ? `· ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {customer.balance > 0 && (
            <PayCustomerButton
              customerId={customer.id}
              customerName={customer.name}
              currentBalance={customer.balance}
              branches={branches}
            />
          )}
          <Link href={`/dashboard/admin/customers/${customer.id}/edit`}>
            <Button type="button" variant="secondary">
              {t.common.edit}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={<CreditCard size={18} />}
          label={t.adminCatalog.customers.balance}
          value={currency.format(customer.balance)}
          alert={customer.balance > 0}
        />
        <StatCard
          icon={<Wallet size={18} />}
          label={t.adminCatalog.customers.creditLimit}
          value={currency.format(customer.creditLimit)}
          accent="tertiary"
        />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-primary">{t.reports.customers.creditHistoryTitle}</h2>
      {sales.length === 0 ? (
        <EmptyState title={t.reports.customers.noCreditSales} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.reports.customers.invoice}</Th>
              <Th>{t.common.date}</Th>
              <Th>{t.common.branch}</Th>
              <Th>{t.common.paymentMethod}</Th>
              <Th className="text-right">{t.common.total}</Th>
              <Th>{t.common.status}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {sales.map((s, i) => (
              <Tr key={s.id} index={i}>
                <Td>#{s.invoiceNumber}</Td>
                <Td className="text-secondary">{s.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{s.branchName}</Td>
                <Td>
                  {PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod}
                  {s.isCredit ? ` (${t.reports.sales.credit})` : ""}
                </Td>
                <Td className="text-right tabular-nums">{currency.format(s.total)}</Td>
                <Td>
                  <Badge status={s.status === "VOIDED" ? "danger" : "success"}>
                    {s.status === "VOIDED" ? t.reports.customers.voided : t.reports.customers.completed}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <h2 className="mt-6 mb-2 text-sm font-semibold text-primary">
        {t.adminCatalog.customers.paymentHistory}
      </h2>
      {payments.length === 0 ? (
        <EmptyState title={t.adminCatalog.customers.noPayments} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.common.date}</Th>
              <Th className="text-right">{t.common.amount}</Th>
              <Th>{t.common.paymentMethod}</Th>
              <Th>{t.reports.inventory.who}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {payments.map((p, i) => (
              <Tr key={p.id} index={i}>
                <Td className="text-secondary">{p.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td className="text-right tabular-nums">{currency.format(p.amount)}</Td>
                <Td>{PAYMENT_LABEL[p.paymentMethod] ?? p.paymentMethod}</Td>
                <Td>{p.userName}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
