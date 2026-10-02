import type { SalesInventoryRow } from "@/lib/data/parts";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartThumbnail } from "@/components/ui/PartThumbnail";
import { Package } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Fixed pixel/percentage widths + table-fixed (see PartsTable.tsx) — without it, table-layout:
 * auto resizes columns from content and leaves uneven gaps the percentages don't control. Name
 * is narrower than Part Number since most names here are short ("Air Filter") and a wide Name
 * column just left a dead gap before Part Number started. Quantity is kept tight so Picture can
 * be wider — the thumbnail itself stays a fixed square (PartThumbnail), never stretched. */
const COL_WIDTHS = ["24%", "36%", "14%", "18%", "8%", "110px"];

export function InventoryTable({ rows }: { rows: SalesInventoryRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={<Package size={20} />} title="Hakuna parts zilizopatikana." />;
  }

  return (
    <Table className="table-fixed">
      <colgroup>
        {COL_WIDTHS.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
      </colgroup>
      <THead>
        <THeadRow className="divide-x divide-border">
          <Th>Name</Th>
          <Th>Part Number</Th>
          <Th className="text-right">Selling Price</Th>
          <Th>Branch</Th>
          <Th className="text-right">Quantity</Th>
          <Th className="px-2">Picture</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <Tr key={`${row.partId}-${i}`} index={i} className="divide-x divide-border">
            <Td className="max-w-0 truncate font-medium text-primary" title={row.name}>
              {row.name}
            </Td>
            <Td className="max-w-0 truncate text-secondary" title={row.partNumber}>
              {row.partNumber}
            </Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(row.unitPrice)}
            </Td>
            <Td className="max-w-0 truncate text-secondary" title={row.branchName}>
              {row.branchName}
            </Td>
            <Td className="text-right tabular-nums">{row.quantity}</Td>
            <Td className="px-2 py-2">
              <PartThumbnail partId={row.partId} hasPhoto={row.hasPhoto} alt={row.name} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
