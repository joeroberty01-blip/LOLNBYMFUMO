"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MonthlyProfitPoint } from "@/lib/data/dashboard";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function ProfitByMonthChart({ data }: { data: MonthlyProfitPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="profitBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
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
            width={60}
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
            formatter={(value) => currency.format(Number(value))}
          />
          <Bar dataKey="netProfit" name="Net Profit" fill="url(#profitBarGradient)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
