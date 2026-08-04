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
import { parsePageParams } from "@/lib/pagination";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { page: pageParam, pageSize } = await searchParams;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const [suppliers, branches] = await Promise.all([getSuppliers(pageArgs), getBranches()]);
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

      <ListToolbar
        filename="suppliers"
        headers={["Name", "Phone", "Email", "Address", "Balance"]}
        rows={suppliers.rows.map((s) => [s.name, s.phone ?? "", s.email ?? "", s.address ?? "", s.balance])}
      />

      <SuppliersTable suppliers={suppliers.rows} branches={branches} />

      <Pagination
        baseHref="/dashboard/admin/suppliers"
        params={{ pageSize }}
        page={suppliers.page}
        pageSize={suppliers.pageSize}
        total={suppliers.total}
        totalPages={suppliers.totalPages}
      />
    </div>
  );
}
