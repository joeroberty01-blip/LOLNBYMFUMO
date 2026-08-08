import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getChinaMasterItems, getChinaMasterBatchOptions } from "@/lib/data/chinaMasterFile";
import { ChinaMasterFilterBar } from "@/components/admin/ChinaMasterFilterBar";
import { ChinaMasterTable } from "@/components/admin/ChinaMasterTable";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { parsePageParams } from "@/lib/pagination";

type SearchParams = {
  q?: string;
  sourceSheet?: string;
  batchId?: string;
  sort?: string;
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

  const { q, sourceSheet, batchId, sort, page: pageParam, pageSize } = await searchParams;
  const pageArgs = parsePageParams({ page: pageParam, pageSize });

  const [items, batches] = await Promise.all([
    getChinaMasterItems({ q, sourceSheet, batchId, sort }, pageArgs),
    getChinaMasterBatchOptions(),
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
        params={{ q, sourceSheet, batchId, sort, pageSize }}
        page={items.page}
        pageSize={items.pageSize}
        total={items.total}
        totalPages={items.totalPages}
      />
    </div>
  );
}
