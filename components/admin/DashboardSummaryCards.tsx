const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function DashboardSummaryCards({
  salesToday,
  salesTodayCount,
  salesThisMonth,
  inventoryValue,
  lowStockCount,
  totalCustomerDebt,
}: {
  salesToday: number;
  salesTodayCount: number;
  salesThisMonth: number;
  inventoryValue: number;
  lowStockCount: number;
  totalCustomerDebt: number;
}) {
  const cards = [
    { label: "Mauzo ya Leo", value: currency.format(salesToday) },
    { label: "Mauzo ya Mwezi Huu", value: currency.format(salesThisMonth) },
    { label: "Idadi ya Sales za Leo", value: String(salesTodayCount) },
    { label: "Thamani ya Inventory Yote", value: currency.format(inventoryValue) },
    {
      label: "Parts zenye Low Stock",
      value: String(lowStockCount),
      warn: lowStockCount > 0,
    },
    {
      label: "Jumla ya Deni la Customers",
      value: currency.format(totalCustomerDebt),
      warn: totalCustomerDebt > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-md border p-4 ${
            c.warn ? "border-red-500/30 bg-red-500/5" : "border-black/10 dark:border-white/15"
          }`}
        >
          <p className="text-sm text-black/60 dark:text-white/60">{c.label}</p>
          <p className="text-2xl font-semibold mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
