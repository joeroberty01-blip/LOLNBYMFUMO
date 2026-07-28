import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCustomerCreditHistory } from "@/lib/data/reports/customers";
import { getServerDictionary } from "@/lib/i18n/server";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function CustomerCreditHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { t } = await getServerDictionary();

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    notFound();
  }

  const history = await getCustomerCreditHistory(id);

  return (
    <div>
      <Link
        href="/dashboard/admin/reports/customers"
        className="text-sm text-accent hover:underline"
      >
        {t.reports.customers.backToDebtReport}
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-semibold text-primary">{customer.name}</h1>
      <p className="mb-6 text-sm text-secondary">
        {t.reports.customers.balance}: {currency.format(customer.balance.toNumber())} ·{" "}
        {t.reports.customers.creditLimit}: {currency.format(customer.creditLimit.toNumber())}
      </p>

      <h2 className="mb-2 text-sm font-semibold text-primary">
        {t.reports.customers.creditHistoryTitle}
      </h2>
      {history.length === 0 ? (
        <EmptyState title={t.reports.customers.noCreditSales} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.reports.customers.invoice}</Th>
              <Th>{t.common.date}</Th>
              <Th>{t.common.branch}</Th>
              <Th className="text-right">{t.common.total}</Th>
              <Th>{t.common.status}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {history.map((h, i) => (
              <Tr key={h.invoiceNumber} index={i}>
                <Td>#{h.invoiceNumber}</Td>
                <Td className="text-secondary">{h.createdAt.toLocaleString("sw-TZ")}</Td>
                <Td>{h.branchName}</Td>
                <Td className="text-right tabular-nums">{currency.format(h.total)}</Td>
                <Td>
                  <Badge status={h.status === "VOIDED" ? "danger" : "success"}>
                    {h.status === "VOIDED"
                      ? t.reports.customers.voided
                      : t.reports.customers.completed}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
