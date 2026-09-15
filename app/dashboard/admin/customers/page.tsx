import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomers } from "@/lib/data/customers";
import { getBranches } from "@/lib/data/branches";
import { getServerDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArchiveCustomerButton } from "@/components/admin/ArchiveCustomerButton";
import { PayCustomerButton } from "@/components/admin/PayCustomerButton";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { SearchBar } from "@/components/ui/SearchBar";
import { parsePageParams } from "@/lib/pagination";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { page: pageParam, pageSize, q } = await searchParams;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const [customers, branches] = await Promise.all([getCustomers(pageArgs, q), getBranches()]);
  const { t } = await getServerDictionary();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">{t.nav.customers}</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/customers/offers">
            <Button type="button" variant="secondary">
              Tuma Matangazo
            </Button>
          </Link>
          <Link href="/dashboard/admin/customers/new">
            <Button type="button" variant="primary">
              {t.adminCatalog.customers.addNew}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar placeholder="Tafuta jina, simu, au email..." className="min-w-[240px] flex-1" />
      </div>

      <ListToolbar
        filename="customers"
        headers={["Name", "Phone", "Email", "Credit Limit", "Balance"]}
        rows={customers.rows.map((c) => [c.name, c.phone ?? "", c.email ?? "", c.creditLimit, c.balance])}
      />

      {customers.rows.length === 0 ? (
        <EmptyState title={q ? `Hakuna customer anayelingana na "${q}"` : t.adminCatalog.customers.empty} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.common.name}</Th>
              <Th>{t.common.phone}</Th>
              <Th className="text-right">{t.adminCatalog.customers.creditLimit}</Th>
              <Th className="text-right">{t.adminCatalog.customers.balance}</Th>
              <Th>{t.common.actions}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {customers.rows.map((c, i) => (
              <Tr key={c.id} index={i}>
                <Td>{c.name}</Td>
                <Td>{c.phone ?? "—"}</Td>
                <Td className="text-right tabular-nums">{currency.format(c.creditLimit)}</Td>
                <Td className="text-right tabular-nums">
                  <span className={c.balance > 0 ? "font-medium text-danger" : ""}>
                    {currency.format(c.balance)}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/admin/customers/${c.id}`}>
                      <Button type="button" variant="secondary">
                        {t.common.view}
                      </Button>
                    </Link>
                    <Link href={`/dashboard/admin/customers/${c.id}/edit`}>
                      <Button type="button" variant="secondary">
                        {t.common.edit}
                      </Button>
                    </Link>
                    {c.balance > 0 && (
                      <PayCustomerButton
                        customerId={c.id}
                        customerName={c.name}
                        currentBalance={c.balance}
                        branches={branches}
                      />
                    )}
                    <ArchiveCustomerButton customerId={c.id} />
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <Pagination
        baseHref="/dashboard/admin/customers"
        params={{ pageSize, q }}
        page={customers.page}
        pageSize={customers.pageSize}
        total={customers.total}
        totalPages={customers.totalPages}
      />
    </div>
  );
}
