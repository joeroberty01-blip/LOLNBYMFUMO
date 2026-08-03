import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSuppliers } from "@/lib/data/suppliers";
import { getBranches } from "@/lib/data/branches";
import { getAllActivePartsLite } from "@/lib/data/parts";
import { SuppliersTable } from "@/components/admin/SuppliersTable";
import { CreditPurchaseButton } from "@/components/admin/CreditPurchaseButton";
import { getServerDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
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
  const [suppliers, branches, parts] = await Promise.all([
    getSuppliers(pageArgs),
    getBranches(),
    getAllActivePartsLite(),
  ]);
  const { t } = await getServerDictionary();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t.nav.suppliers}</h1>
          <p className="text-sm text-secondary">{t.adminCatalog.suppliers.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <CreditPurchaseButton
            branches={branches}
            suppliers={suppliers.rows.map((s) => ({ id: s.id, name: s.name }))}
            parts={parts}
          />
          <Link href="/dashboard/admin/suppliers/new">
            <Button type="button" variant="secondary">
              {t.adminCatalog.suppliers.addNew}
            </Button>
          </Link>
        </div>
      </div>

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
