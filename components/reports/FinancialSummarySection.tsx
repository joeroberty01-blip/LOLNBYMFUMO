import type { FinancialSummary } from "@/lib/accounting";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function FinancialSummarySection({ summary }: { summary: FinancialSummary }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium mb-2">Financial Summary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Total Sales Revenue</p>
          <p className="text-xl font-semibold mt-1 text-green-600">
            +{currency.format(summary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Total Expenses</p>
          <p className="text-xl font-semibold mt-1 text-red-600">
            −{currency.format(summary.totalExpenses)}
          </p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Gross Profit</p>
          <p className="text-xl font-semibold mt-1">{currency.format(summary.grossProfit)}</p>
        </div>
        <div className="rounded-md border border-black/10 dark:border-white/15 p-4">
          <p className="text-sm text-black/60 dark:text-white/60">Net Profit</p>
          <p
            className={`text-xl font-semibold mt-1 ${
              summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {currency.format(summary.netProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}
