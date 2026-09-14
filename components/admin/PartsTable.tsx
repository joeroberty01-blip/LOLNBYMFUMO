import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import type { AdminPartRow } from "@/lib/data/parts";
import { DeletePartButton } from "@/components/admin/DeletePartButton";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

/** Fixed column widths so the row never reflows as content length varies from page to page —
 * the two free-text columns absorb the slack and truncate, everything else is sized to its
 * widest realistic value. Actions are icon-only to keep the row on one line on small screens. */
const COL_WIDTHS = ["24%", "18%", "12%", "12%", "14%", "10%", "10%"];

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
      <colgroup>
        {COL_WIDTHS.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
      </colgroup>
      <THead>
        <THeadRow>
          <Th>Name</Th>
          <Th>Part Number</Th>
          <Th className="text-right">Buying</Th>
          <Th className="text-right">Selling</Th>
          <Th>Branch</Th>
          <Th className="text-right">Qty</Th>
          <Th className="text-right">Actions</Th>
        </THeadRow>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <Tr key={`${row.partId}-${row.branchId ?? "none"}-${i}`} index={i}>
            <Td className="max-w-0 truncate" title={row.name}>
              {row.name}
            </Td>
            <Td className="max-w-0 truncate text-secondary" title={row.partNumber}>
              {row.partNumber}
            </Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(row.costPrice)}
            </Td>
            <Td className="text-right tabular-nums whitespace-nowrap">
              {currency.format(row.unitPrice)}
            </Td>
            <Td className="max-w-0 truncate text-secondary" title={row.branchName}>
              {row.branchName}
            </Td>
            <Td className="text-right whitespace-nowrap">
              <span
                className={`tabular-nums ${
                  row.quantity < 0
                    ? "font-semibold text-danger"
                    : row.isLowStock
                      ? "font-medium text-warning"
                      : "text-primary"
                }`}
                title={
                  row.quantity < 0
                    ? "Stock hasi — inahitaji marekebisho"
                    : row.isLowStock
                      ? `Chini ya kiwango (${row.lowStockThreshold})`
                      : undefined
                }
              >
                {row.quantity}
              </span>
            </Td>
            <Td className="text-right">
              <div className="no-print flex items-center justify-end gap-1">
                <Link
                  href={`/dashboard/admin/parts/${row.partId}`}
                  aria-label="View"
                  title="View"
                  className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                >
                  <Eye size={15} />
                </Link>
                <Link
                  // Carries this row's store so the edit page's Store field starts on the right
                  // one — the same part can appear on several rows, one per store.
                  href={
                    row.branchId
                      ? `/dashboard/admin/parts/${row.partId}/edit?branchId=${row.branchId}`
                      : `/dashboard/admin/parts/${row.partId}/edit`
                  }
                  aria-label="Edit"
                  title="Edit"
                  className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
                >
                  <Pencil size={15} />
                </Link>
                <StockAdjustmentModal
                  partId={row.partId}
                  partName={row.name}
                  branchId={row.branchId}
                  branchName={row.branchName}
                  branches={branches}
                  compact
                />
                <DeletePartButton partId={row.partId} compact />
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
