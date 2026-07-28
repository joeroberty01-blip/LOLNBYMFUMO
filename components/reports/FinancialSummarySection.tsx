import type { FinancialSummary } from "@/lib/accounting";
import { StatCard } from "@/components/ui/StatCard";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function FinancialSummarySection({ summary }: { summary: FinancialSummary }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-primary">Financial Summary</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Sales Revenue"
          value={`+${currency.format(summary.totalRevenue)}`}
          accent="success"
        />
        <StatCard
          icon={<TrendingDown size={18} />}
          label="Total Expenses"
          value={`−${currency.format(summary.totalExpenses)}`}
          accent="danger"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Gross Profit"
          value={currency.format(summary.grossProfit)}
          accent="tertiary"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Net Profit"
          value={currency.format(summary.netProfit)}
          accent={summary.netProfit >= 0 ? "success" : "danger"}
        />
      </div>
    </div>
  );
}
