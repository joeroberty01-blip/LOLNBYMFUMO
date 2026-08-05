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
import { Badge } from "@/components/ui/Badge";
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
          "Tarehe",
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
          r.batchDate ?? "",
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
            Sehemu zisizo na muundo wa kawaida wa jedwali ({rawNotes.length})
          </h2>
          <p className="mb-3 text-xs text-secondary">
            Sehemu hizi za faili la asili hazikufuata muundo wa kawaida wa NO/DESCRIPTION/PART NO,
            kwa hiyo kila row imewekwa kwenye jedwali lake mwenyewe hapa chini — bila kupotea
            kabisa, na bila kuchanganywa na data nyingine.
          </p>
          <div className="flex flex-col gap-4">
            {rawNotes.map((n) => {
              const maxCols = n.rows.reduce((max, row) => Math.max(max, row.length), 0);
              return (
                <div key={n.id} className="rounded-card border border-border bg-surface p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge status={n.sourceSheet === "CHINA" ? "info" : "warning"}>
                      {n.sourceSheet}
                    </Badge>
                    {n.label && <span className="text-sm font-medium text-primary">{n.label}</span>}
                    {n.dateLabel && (
                      <span className="text-xs text-secondary">Tarehe: {n.dateLabel}</span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        {n.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-border last:border-0">
                            {Array.from({ length: maxCols }).map((_, ci) => (
                              <td key={ci} className="px-2 py-1 text-secondary">
                                {row[ci] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
