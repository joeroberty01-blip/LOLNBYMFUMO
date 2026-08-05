import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getChinaMasterItems,
  getChinaMasterBatchOptions,
  getChinaMasterRawNotes,
} from "@/lib/data/chinaMasterFile";
import { ChinaMasterFilterBar } from "@/components/admin/ChinaMasterFilterBar";
import { ChinaMasterTable } from "@/components/admin/ChinaMasterTable";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
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

  const [items, batches, rawNotes] = await Promise.all([
    getChinaMasterItems({ q, sourceSheet, batchId, sort }, pageArgs),
    getChinaMasterBatchOptions(),
    getChinaMasterRawNotes(),
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
              const headers = [
                "Bidhaa",
                "Part No",
                "Qty",
                "Qty 2",
                "Unit Price",
                "Total",
                "Unit Price TZS",
                "Total TZS",
                "Sale Price",
                "Sale Total",
              ];
              const colCount = Math.max(maxCols, headers.length);
              return (
                <div key={n.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge status={n.sourceSheet === "CHINA" ? "info" : "warning"}>
                      {n.sourceSheet}
                    </Badge>
                    {n.label && <span className="text-sm font-medium text-primary">{n.label}</span>}
                    {n.dateLabel && (
                      <span className="text-xs text-secondary">Tarehe: {n.dateLabel}</span>
                    )}
                  </div>
                  <Table>
                    <THead>
                      <THeadRow>
                        {Array.from({ length: colCount }).map((_, ci) => (
                          <Th key={ci}>{headers[ci] ?? `Col ${ci + 1}`}</Th>
                        ))}
                      </THeadRow>
                    </THead>
                    <TBody>
                      {n.rows.map((row, ri) => (
                        <Tr key={ri} index={ri}>
                          {Array.from({ length: colCount }).map((_, ci) => (
                            <Td key={ci} className="text-secondary">
                              {row[ci] ?? ""}
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
