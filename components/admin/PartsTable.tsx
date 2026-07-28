import Link from "next/link";
import type { AdminPartRow } from "@/lib/data/parts";
import { DeletePartButton } from "@/components/admin/DeletePartButton";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function PartsTable({
  rows,
  branches,
}: {
  rows: AdminPartRow[];
  branches: { id: string; name: string }[];
}) {
  if (rows.length === 0) {
    return <EmptyState title="No parts found." />;
  }

  return (
    <Table>
      <THead>
        <THeadRow>
          <Th>Name</Th>
          <Th>Part Number</Th>
          <Th className="text-right">Buying Price</Th>
          <Th className="text-right">Selling Price</Th>
          <Th>Branch</Th>
          <Th>Quantity</Th>
          <Th>Actions</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <Tr key={`${row.partId}-${row.branchId ?? "none"}-${i}`} index={i}>
            <Td>{row.name}</Td>
            <Td className="text-secondary">{row.partNumber}</Td>
            <Td className="text-right tabular-nums">{currency.format(row.costPrice)}</Td>
            <Td className="text-right tabular-nums">{currency.format(row.unitPrice)}</Td>
            <Td>{row.branchName}</Td>
            <Td>
              <div className="flex items-center gap-2 tabular-nums">
                {row.quantity}
                {row.isLowStock && <Badge status="danger">Low Stock</Badge>}
              </div>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/admin/parts/${row.partId}`}>
                  <Button type="button" variant="secondary">
                    View
                  </Button>
                </Link>
                <Link href={`/dashboard/admin/parts/${row.partId}/edit`}>
                  <Button type="button" variant="secondary">
                    Edit
                  </Button>
                </Link>
                <StockAdjustmentModal
                  partId={row.partId}
                  partName={row.name}
                  branchId={row.branchId}
                  branchName={row.branchName}
                  branches={branches}
                />
                <DeletePartButton partId={row.partId} />
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
