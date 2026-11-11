import { redirect } from "next/navigation";
import Link from "next/link";
import { List, LineChart, Download } from "lucide-react";
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

  // Narrowing to a stock condition implies an urgency order — worst rows first — unless the
  // admin has explicitly chosen how to sort.
  const effectiveSort =
    sort ?? (stock === "low" ? "lowStock" : stock === "negative" ? "negative" : undefined);

  const [parts, categories, branches] = await Promise.all([
    getPartsForAdminTable(
      { q, category, categories: selectedCategories, stock, sort: effectiveSort },
      pageArgs
    ),
    getPartCategories(),
    getBranches(),
  ]);

  const STOCK_LABEL: Record<string, string> = {
    low: "Stock ndogo tu",
    negative: "Stock hasi tu",
    out: "Zilizoisha (0)",
    instock: "Zilizopo tu",
  };
  const scopeParts = [
    selectedCategories.length > 0
      ? `Categories: ${selectedCategories.join(", ")}`
      : category
        ? `Category: ${category}`
        : null,
    stock ? STOCK_LABEL[stock] : null,
    q ? `Utafutaji: "${q}"` : null,
  ].filter(Boolean) as string[];
  const isFiltered = scopeParts.length > 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t.nav.parts}</h1>
          <p className="text-sm text-secondary">{t.adminCatalog.parts.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/parts/price-list-xlsx">
            <Button type="button" variant="secondary">
              <Download size={15} className="mr-1.5 inline" />
              Pakua Bei (Excel)
            </Button>
          </a>
          <Link href="/dashboard/admin/parts/photo-queue">
            <Button type="button" variant="secondary">
              Picha za Parts
            </Button>
          </Link>
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

          {/* Makes the print/CSV scope unmistakable before the admin commits to paper: what is
              on screen after filtering is exactly what comes out. */}
          <div className="no-print mb-3 rounded-card border border-border bg-surface px-3 py-2 text-xs">
            <span className="text-secondary">Zitakazochapishwa: </span>
            <strong className="text-primary">{parts.total} parts</strong>
            {isFiltered ? (
              <span className="text-secondary"> · {scopeParts.join(" · ")}</span>
            ) : (
              <span className="text-secondary"> · catalogue nzima (hujachuja chochote)</span>
            )}
            {parts.totalPages > 1 && (
              <span className="text-warning">
                {" "}
                · ukurasa huu una {parts.rows.length} kati ya {parts.total} — ongeza rows/ukurasa
                ili uchapishe zote
              </span>
            )}
          </div>

          <ListToolbar
            compact
            filename="parts"
            headers={["Name", "Part Number", "Branch", "Quantity", "Cost Price", "Unit Price", "Low Stock Threshold"]}
            rows={parts.rows.map((p) => [
              p.name,
              p.partNumber,
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
            <p className="text-xs">{isFiltered ? scopeParts.join(" · ") : "Catalogue nzima"}</p>
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
