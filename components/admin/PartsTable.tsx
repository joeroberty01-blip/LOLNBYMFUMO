import Link from "next/link";
import type { AdminPartRow } from "@/lib/data/parts";
import { DeletePartButton } from "@/components/admin/DeletePartButton";
import { StockAdjustmentModal } from "@/components/admin/StockAdjustmentModal";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function PartsTable({
  rows,
  branches,
}: {
  rows: AdminPartRow[];
  branches: { id: string; name: string }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Hakuna parts zilizopatikana.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/15 text-left">
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 font-medium">Part Number</th>
            <th className="py-2 pr-3 font-medium">Buying Price</th>
            <th className="py-2 pr-3 font-medium">Selling Price</th>
            <th className="py-2 pr-3 font-medium">Branch</th>
            <th className="py-2 pr-3 font-medium">Quantity</th>
            <th className="py-2 pr-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.partId}-${row.branchId ?? "none"}-${i}`}
              className="border-b border-black/5 dark:border-white/10"
            >
              <td className="py-2 pr-3">{row.name}</td>
              <td className="py-2 pr-3">{row.partNumber}</td>
              <td className="py-2 pr-3">{currency.format(row.costPrice)}</td>
              <td className="py-2 pr-3">{currency.format(row.unitPrice)}</td>
              <td className="py-2 pr-3">{row.branchName}</td>
              <td className="py-2 pr-3">
                <span
                  className={
                    row.isLowStock
                      ? "inline-block rounded-full bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-0.5 text-xs font-medium"
                      : ""
                  }
                >
                  {row.quantity}
                  {row.isLowStock ? " (Low Stock)" : ""}
                </span>
              </td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/admin/parts/${row.partId}/edit`}
                    className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
                  >
                    Edit
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
