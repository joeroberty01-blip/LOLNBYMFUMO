import type { SalesInventoryRow } from "@/lib/data/parts";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function InventoryTable({ rows }: { rows: SalesInventoryRow[] }) {
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
            <th className="py-2 pr-3 font-medium">Selling Price</th>
            <th className="py-2 pr-3 font-medium">Branch</th>
            <th className="py-2 pr-3 font-medium">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.partId}-${i}`}
              className="border-b border-black/5 dark:border-white/10"
            >
              <td className="py-2 pr-3">{row.name}</td>
              <td className="py-2 pr-3">{row.partNumber}</td>
              <td className="py-2 pr-3">{currency.format(row.unitPrice)}</td>
              <td className="py-2 pr-3">{row.branchName}</td>
              <td className="py-2 pr-3">{row.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
