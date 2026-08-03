import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPartsForAdminTable, getPartCategories } from "@/lib/data/parts";
import { getBranches } from "@/lib/data/branches";
import { PartsFilterBar } from "@/components/admin/PartsFilterBar";
import { PartsTable } from "@/components/admin/PartsTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { parsePageParams } from "@/lib/pagination";

export default async function AdminPartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; pageSize?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q, category, page: pageParam, pageSize } = await searchParams;
  const { t } = await getServerDictionary();
  const pageArgs = parsePageParams({ page: pageParam, pageSize });

  const [parts, categories, branches] = await Promise.all([
    getPartsForAdminTable({ q, category }, pageArgs),
    getPartCategories(),
    getBranches(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t.nav.parts}</h1>
          <p className="text-sm text-secondary">{t.adminCatalog.parts.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin/parts/bulk-upload">
            <Button type="button" variant="secondary">
              {t.nav.bulkUpload}
            </Button>
          </Link>
          <Link href="/dashboard/admin/parts/new">
            <Button type="button" variant="primary">
              {t.adminCatalog.parts.addNew}
            </Button>
          </Link>
        </div>
      </div>

      <PartsFilterBar categories={categories} />

      <PartsTable rows={parts.rows} branches={branches} />

      <Pagination
        baseHref="/dashboard/admin/parts"
        params={{ q, category, pageSize }}
        page={parts.page}
        pageSize={parts.pageSize}
        total={parts.total}
        totalPages={parts.totalPages}
      />
    </div>
  );
}
