import { redirect } from "next/navigation";
import { Package, Boxes, DollarSign } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getChinaMasterItems,
  getChinaMasterBatchOptions,
  getChinaMasterRawNotes,
  getChinaMasterStats,
} from "@/lib/data/chinaMasterFile";
import { ChinaMasterFilterBar } from "@/components/admin/ChinaMasterFilterBar";
import { ChinaMasterTable } from "@/components/admin/ChinaMasterTable";
import { StatCard } from "@/components/ui/StatCard";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { parsePageParams } from "@/lib/pagination";

const tzsFmt = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

type SearchParams = {
  q?: string;
  sourceSheet?: string;
  batchId?: string;
  page?: string;
  pageSize?: string;
};

export default async function ChinaMasterFilePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login/admin");
  }

  const { q, sourceSheet, batchId, page: pageParam, pageSize } = await searchParams;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });

  const [items, batches, rawNotes, stats] = await Promise.all([
    getChinaMasterItems({ q, sourceSheet, batchId }, pageArgs),
    getChinaMasterBatchOptions(),
    getChinaMasterRawNotes(),
    getChinaMasterStats(),
  ]);

  return (
    <div>
      <div className="no-print mb-6">
        <h1 className="text-xl font-semibold text-primary">CHINA MASTER FILE</h1>
        <p className="text-sm text-secondary">
          Kumbukumbu ya kudumu ya manunuzi ya China na Dubai — imeingizwa moja kwa moja kutoka
          faili la Excel, bila kubadilisha chochote.
        </p>
      </div>

      <div className="no-print mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Boxes size={18} />}
          label="Jumla ya Bidhaa (Rows)"
          value={String(stats.totalItems)}
          accent="primary"
        />
        <StatCard
          icon={<Package size={18} />}
          label="Jumla ya Batches"
          value={String(stats.totalBatches)}
          accent="tertiary"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="Jumla ya Thamani (TZS)"
          value={tzsFmt.format(stats.totalTzsValue)}
          accent="success"
        />
      </div>

      <ChinaMasterFilterBar batches={batches} />

      <ListToolbar
        filename="china-master-file"
        headers={[
          "Batch",
          "Source",
          "Description",
          "Part No",
          "Qty",
          "Unit Price",
          "Currency",
          "Total",
          "Unit Price TZS",
          "Total TZS",
          "Sale Price",
          "Sale Total",
        ]}
        rows={items.rows.map((r) => [
          r.batchLabel ?? "",
          r.sourceSheet,
          r.description,
          r.partNumber ?? "",
          r.quantity ?? "",
          r.unitPriceForeign ?? "",
          r.currencyLabel ?? "",
          r.totalForeign ?? "",
          r.unitPriceTzs ?? "",
          r.totalTzs ?? "",
          r.salePrice2 ?? r.salePrice1 ?? "",
          r.saleTotal ?? "",
        ])}
      />

      <ChinaMasterTable rows={items.rows} />

      <Pagination
        baseHref="/dashboard/admin/china-master-file"
        params={{ q, sourceSheet, batchId, pageSize }}
        page={items.page}
        pageSize={items.pageSize}
        total={items.total}
        totalPages={items.totalPages}
      />

      {rawNotes.length > 0 && (
        <div className="no-print mt-8">
          <h2 className="mb-2 text-sm font-semibold text-primary">
            Sehemu zisizo na muundo wa jedwali ({rawNotes.length})
          </h2>
          <p className="mb-3 text-xs text-secondary">
            Sehemu hizi za faili la asili hazikufuata muundo wa kawaida wa NO/DESCRIPTION/PART NO,
            kwa hiyo zimehifadhiwa hapa kama maandishi ghafi (bila kupotea kabisa).
          </p>
          <div className="flex flex-col gap-2">
            {rawNotes.map((n) => (
              <details key={n.id} className="rounded-card border border-border bg-surface p-3">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  [{n.sourceSheet}] {n.rawNotes.slice(0, 80)}
                  {n.rawNotes.length > 80 ? "…" : ""}
                </summary>
                <p className="mt-2 text-xs whitespace-pre-wrap text-secondary">{n.rawNotes}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
