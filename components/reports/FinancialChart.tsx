"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { FinancialTrendPoint } from "@/lib/accounting";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function FinancialChart({ data }: { data: FinancialTrendPoint[] }) {
  const chartData = data.map((d) => ({
    label: d.label,
    Revenue: d.revenue,
    Expenses: -d.expenses,
    "Net Profit": d.netProfit,
  }));

  return (
    <div className="h-72 w-full mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.6} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            opacity={0.6}
            tickFormatter={(v) => currency.format(Number(v))}
          />
          <Tooltip
            formatter={(value) => currency.format(Math.abs(Number(value)))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#ef4444" radius={[0, 0, 4, 4]} />
          <Line type="monotone" dataKey="Net Profit" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
