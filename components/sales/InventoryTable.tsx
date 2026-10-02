import type { SalesInventoryRow } from "@/lib/data/parts";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartThumbnail } from "@/components/ui/PartThumbnail";
import { Package } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function InventoryTable({ rows }: { rows: SalesInventoryRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={<Package size={20} />} title="Hakuna parts zilizopatikana." />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>Picture</Th>
          <Th>Name</Th>
          <Th>Part Number</Th>
          <Th className="text-right">Selling Price</Th>
          <Th>Branch</Th>
          <Th className="text-right">Quantity</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <Tr key={`${row.partId}-${i}`} index={i}>
            <Td>
              <PartThumbnail partId={row.partId} hasPhoto={row.hasPhoto} alt={row.name} />
            </Td>
            <Td className="font-medium text-primary">{row.name}</Td>
            <Td className="text-secondary">{row.partNumber}</Td>
            <Td className="text-right tabular-nums">{currency.format(row.unitPrice)}</Td>
            <Td>{row.branchName}</Td>
            <Td className="text-right tabular-nums">{row.quantity}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
