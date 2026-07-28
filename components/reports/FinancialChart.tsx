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
    <div className="mb-8 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#8B8D98" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8B8D98" }}
            axisLine={false}
            tickLine={false}
            width={70}
            tickFormatter={(v) => currency.format(Number(v))}
          />
          <Tooltip
            contentStyle={{
              background: "#1B1C28",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F5F7" }}
            itemStyle={{ color: "#F5F5F7" }}
            formatter={(value) => currency.format(Math.abs(Number(value)))}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8B8D98" }} />
          <Bar dataKey="Revenue" fill="#A855F7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#22D3EE" radius={[0, 0, 4, 4]} />
          <Line type="monotone" dataKey="Net Profit" stroke="#EC4899" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
