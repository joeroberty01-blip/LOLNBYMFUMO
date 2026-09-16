import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSuppliers } from "@/lib/data/suppliers";
import { getBranches } from "@/lib/data/branches";
import { SuppliersTable } from "@/components/admin/SuppliersTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { SearchBar } from "@/components/ui/SearchBar";
import { parsePageParams } from "@/lib/pagination";
import { getSupplierDebtItems } from "@/lib/data/suppliers";

export default async function SuppliersPage({
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
  const [suppliers, branches, debtGroups] = await Promise.all([
    getSuppliers(pageArgs, q),
    getBranches(),
    getSupplierDebtItems(),
  ]);
  // One query for the page rather than one per row: each row's Pay button needs that supplier's
  // own unpaid purchases, because collection is per purchase.
  const openBySupplier = Object.fromEntries(
    debtGroups.map((g) => [
      g.id,
      g.items.map((it) => ({
        id: it.purchaseId,
        label: `Manunuzi ${it.createdAt.toLocaleDateString("sw-TZ")}`,
        date: it.createdAt,
        total: it.total,
        remaining: it.remaining,
      })),
    ])
  );
  const { t } = await getServerDictionary();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t.nav.suppliers}</h1>
          <p className="text-sm text-secondary">{t.adminCatalog.suppliers.subtitle}</p>
        </div>
        <Link href="/dashboard/admin/suppliers/new">
          <Button type="button" variant="primary">
            {t.adminCatalog.suppliers.addNew}
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar placeholder="Tafuta jina, simu, email, au anwani..." className="min-w-[240px] flex-1" />
      </div>

      <ListToolbar
        filename="suppliers"
        headers={["Name", "Phone", "Email", "Address", "Balance"]}
        rows={suppliers.rows.map((s) => [s.name, s.phone ?? "", s.email ?? "", s.address ?? "", s.balance])}
      />

      <SuppliersTable
        suppliers={suppliers.rows}
        branches={branches}
        openBySupplier={openBySupplier}
      />

      <Pagination
        baseHref="/dashboard/admin/suppliers"
        params={{ pageSize, q }}
        page={suppliers.page}
        pageSize={suppliers.pageSize}
        total={suppliers.total}
        totalPages={suppliers.totalPages}
      />
    </div>
  );
}
