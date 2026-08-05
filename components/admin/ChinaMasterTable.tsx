import type { ChinaMasterItemRow } from "@/lib/data/chinaMasterFile";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const foreignFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const tzsFmt = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

function fmtForeign(n: number | null) {
  return n === null ? "—" : foreignFmt.format(n);
}
function fmtTzs(n: number | null) {
  return n === null ? "—" : tzsFmt.format(n);
}

export function ChinaMasterTable({ rows }: { rows: ChinaMasterItemRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Hakuna rekodi zinazolingana." />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>Batch / Supplier</Th>
          <Th>Bidhaa</Th>
          <Th>Part No</Th>
          <Th className="text-right">Qty</Th>
          <Th className="text-right">Unit Price</Th>
          <Th className="text-right">Total</Th>
          <Th className="text-right">Unit Price TZS</Th>
          <Th className="text-right">Total TZS</Th>
          <Th className="text-right">Sale Price</Th>
          <Th className="text-right">Sale Total</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((r, i) => (
          <Tr key={r.id} index={i}>
            <Td className="max-w-[220px]">
              <div className="flex flex-col gap-0.5">
                <Badge status={r.sourceSheet === "CHINA" ? "info" : "warning"}>{r.sourceSheet}</Badge>
                <span className="truncate text-xs text-secondary" title={r.batchLabel ?? undefined}>
                  {r.batchLabel ?? "—"}
                </span>
              </div>
            </Td>
            <Td className="max-w-[240px]">
              <p className="truncate font-medium text-primary" title={r.description}>
                {r.description}
              </p>
            </Td>
            <Td className="text-secondary">{r.partNumber ?? "—"}</Td>
            <Td className="text-right tabular-nums">{r.quantity ?? "—"}</Td>
            <Td className="text-right tabular-nums">
              {fmtForeign(r.unitPriceForeign)} {r.currencyLabel ?? ""}
            </Td>
            <Td className="text-right tabular-nums">
              {fmtForeign(r.totalForeign)} {r.currencyLabel ?? ""}
            </Td>
            <Td className="text-right tabular-nums">{fmtTzs(r.unitPriceTzs)}</Td>
            <Td className="text-right tabular-nums">{fmtTzs(r.totalTzs)}</Td>
            <Td className="text-right tabular-nums">{fmtTzs(r.salePrice2 ?? r.salePrice1)}</Td>
            <Td className="text-right font-medium tabular-nums text-primary">{fmtTzs(r.saleTotal)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
