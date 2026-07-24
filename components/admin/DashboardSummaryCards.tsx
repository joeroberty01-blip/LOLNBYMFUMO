const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function DashboardSummaryCards({
  activePartsCount,
  lowStockCount,
  inventoryValue,
}: {
  activePartsCount: number;
  lowStockCount: number;
  inventoryValue: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
        <p className="text-sm text-black/60 dark:text-white/60">Jumla ya Parts</p>
        <p className="text-2xl font-semibold mt-1">{activePartsCount}</p>
      </div>
      <div
        className={`rounded-md border p-4 ${
          lowStockCount > 0
            ? "border-red-500/30 bg-red-500/5"
            : "border-black/10 dark:border-white/15"
        }`}
      >
        <p className="text-sm text-black/60 dark:text-white/60">Low Stock</p>
        <p className="text-2xl font-semibold mt-1">{lowStockCount}</p>
      </div>
      <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
        <p className="text-sm text-black/60 dark:text-white/60">Thamani ya Inventory</p>
        <p className="text-2xl font-semibold mt-1">{currency.format(inventoryValue)}</p>
      </div>
    </div>
  );
}
