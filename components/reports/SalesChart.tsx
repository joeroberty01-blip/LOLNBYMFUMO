"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function SalesChart({ data }: { data: { label: string; total: number }[] }) {
  return (
    <div className="h-72 w-full mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.6} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            opacity={0.6}
            tickFormatter={(v) => currency.format(Number(v))}
          />
          <Tooltip
            formatter={(value) => currency.format(Number(value))}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
