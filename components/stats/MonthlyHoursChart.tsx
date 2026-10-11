"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatDecimal } from "@/lib/format";

export interface MonthDatum {
  label: string;
  hours: number;
  isCurrent: boolean;
}

export function MonthlyHoursChart({ data }: { data: MonthDatum[] }) {
  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <Tooltip
            cursor={false}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}
            labelStyle={{ color: "var(--text)" }}
            formatter={(value) => [`${formatDecimal(Number(value ?? 0))} h`, "Horas"]}
          />
          <Bar dataKey="hours" radius={[5, 5, 2, 2]} maxBarSize={34}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.isCurrent ? "var(--accent)" : "#8A8F80"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
