import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInventoryForSalesTable, getPartCategories } from "@/lib/data/parts";
import { PartsFilterBar } from "@/components/admin/PartsFilterBar";
import { InventoryTable } from "@/components/sales/InventoryTable";
import { getServerDictionary } from "@/lib/i18n/server";
import { Pagination } from "@/components/ui/Pagination";
import { parsePageParams } from "@/lib/pagination";

export default async function SalesInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; pageSize?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SALES_STAFF" || session.user.status !== "APPROVED") {
    redirect("/login/sales-staff");
  }

  const { q, category, page: pageParam, pageSize } = await searchParams;
  const { t } = await getServerDictionary();
  const pageArgs = parsePageParams({ page: pageParam, pageSize });

  const [inventory, categories] = await Promise.all([
    getInventoryForSalesTable({ q, category }, pageArgs),
    getPartCategories(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-primary">{t.nav.inventory}</h1>

      <PartsFilterBar categories={categories} />

      <InventoryTable rows={inventory.rows} />

      <Pagination
        baseHref="/dashboard/sales/inventory"
        params={{ q, category, pageSize }}
        page={inventory.page}
        pageSize={inventory.pageSize}
        total={inventory.total}
        totalPages={inventory.totalPages}
      />
    </div>
  );
}
