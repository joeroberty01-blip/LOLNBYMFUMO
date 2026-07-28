"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { FinancialTrendPoint } from "@/lib/accounting";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export function RevenueExpensesChart({ data }: { data: FinancialTrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
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
            formatter={(value, name) => [currency.format(Number(value)), name]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#A855F7"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#22D3EE"
            strokeWidth={2}
            fill="url(#expensesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
