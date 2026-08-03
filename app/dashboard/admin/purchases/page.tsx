import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPurchases } from "@/lib/data/purchases";
import { getSuppliersDirectory } from "@/lib/data/suppliers";
import { getBranches } from "@/lib/data/branches";
import { getAllActivePartsLite } from "@/lib/data/parts";
import { PurchasesTable } from "@/components/admin/PurchasesTable";
import { CreditPurchaseButton } from "@/components/admin/CreditPurchaseButton";
import { getServerDictionary } from "@/lib/i18n/server";
import { Pagination } from "@/components/ui/Pagination";
import { parsePageParams } from "@/lib/pagination";

export default async function CreditPurchasesPage({
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
  const [purchases, suppliers, branches, parts] = await Promise.all([
    getPurchases(pageArgs),
    getSuppliersDirectory(),
    getBranches(),
    getAllActivePartsLite(),
  ]);
  const { t } = await getServerDictionary();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t.nav.creditPurchases}</h1>
          <p className="text-sm text-secondary">{t.adminCatalog.purchases.subtitle}</p>
        </div>
        <CreditPurchaseButton
          branches={branches}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          parts={parts}
        />
      </div>

      <PurchasesTable rows={purchases.rows} />

      <Pagination
        baseHref="/dashboard/admin/purchases"
        params={{ pageSize }}
        page={purchases.page}
        pageSize={purchases.pageSize}
        total={purchases.total}
        totalPages={purchases.totalPages}
      />
    </div>
  );
}
