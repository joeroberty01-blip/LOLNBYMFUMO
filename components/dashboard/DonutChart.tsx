"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });

export type DonutDatum = { name: string; value: number; color: string };

export function DonutChart({ data }: { data: DonutDatum[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#1B1C28",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              fontSize: 12,
            }}
            itemStyle={{ color: "#F5F5F7" }}
            formatter={(value) => currency.format(Number(value))}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#8B8D98" }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
