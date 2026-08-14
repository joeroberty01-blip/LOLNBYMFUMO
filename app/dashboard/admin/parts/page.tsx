import { redirect } from "next/navigation";
import Link from "next/link";
import { List, LineChart } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPartsForAdminTable, getPartCategories } from "@/lib/data/parts";
import { getBranches } from "@/lib/data/branches";
import { PartsFilterBar } from "@/components/admin/PartsFilterBar";
import { PartsTable } from "@/components/admin/PartsTable";
import { PartsReportTab } from "@/components/admin/PartsReportTab";
import { getServerDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Tabs } from "@/components/ui/Tabs";
import { parsePageParams } from "@/lib/pagination";
import type { Period } from "@/lib/dateRanges";

type SearchParams = {
  q?: string;
  category?: string;
  categories?: string;
  stock?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  tab?: string;
  period?: Period;
  date?: string;
  weekOf?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
};

export default async function AdminPartsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const sp = await searchParams;
  const { q, category, stock, sort, page: pageParam, pageSize, tab } = sp;
  const activeTab = tab === "report" ? "report" : "list";
  const { t } = await getServerDictionary();
  const pageArgs = parsePageParams({ page: pageParam, pageSize });
  const selectedCategories = (sp.categories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const [parts, categories, branches] = await Promise.all([
    getPartsForAdminTable(
      { q, category, categories: selectedCategories, stock, sort },
      pageArgs
    ),
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

      <Tabs
        defaultValue="list"
        tabs={[
          { value: "list", label: t.nav.parts, icon: <List size={15} /> },
          { value: "report", label: t.reports.inventory.title, icon: <LineChart size={15} /> },
        ]}
      />

      {activeTab === "list" && (
        <>
          <PartsFilterBar categories={categories} />

          <ListToolbar
            filename="parts"
            headers={["Part Number", "Name", "Branch", "Quantity", "Cost Price", "Unit Price", "Low Stock Threshold"]}
            rows={parts.rows.map((p) => [
              p.partNumber,
              p.name,
              p.branchName,
              p.quantity,
              p.costPrice,
              p.unitPrice,
              p.lowStockThreshold,
            ])}
          />

          {/* Print-only letterhead: the on-screen filter chrome is hidden when printing, so the
              printed sheet has to say for itself which slice of the catalog it covers. */}
          <div className="mb-3 hidden print:block">
            <p className="text-sm font-bold">{t.nav.parts}</p>
            <p className="text-xs">
              {selectedCategories.length > 0
                ? `Categories: ${selectedCategories.join(", ")}`
                : category
                  ? `Category: ${category}`
                  : "Categories zote"}
              {stock ? ` · Stock: ${stock}` : ""}
              {q ? ` · Utafutaji: "${q}"` : ""}
            </p>
            <p className="text-xs">
              Jumla: {parts.total} parts · ukurasa {parts.page}/{parts.totalPages}
            </p>
          </div>

          <PartsTable rows={parts.rows} branches={branches} />

          <Pagination
            baseHref="/dashboard/admin/parts"
            params={{
              q,
              category,
              categories: sp.categories,
              stock,
              sort,
              pageSize,
              tab: "list",
            }}
            page={parts.page}
            pageSize={parts.pageSize}
            total={parts.total}
            totalPages={parts.totalPages}
          />
        </>
      )}

      {activeTab === "report" && <PartsReportTab sp={sp} t={t} />}
    </div>
  );
}
