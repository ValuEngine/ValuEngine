"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props { projections: number[]; }

export function FCFChart({ projections }: Props) {
  const data = projections.map((v, i) => ({
    year: `An ${i + 1}`,
    value: v / 1e9,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={28}>
        <XAxis
          dataKey="year"
          tick={{ fill: "#5d7289", fontSize: 11, fontFamily: "Inter" }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: "#5d7289", fontSize: 11, fontFamily: "Inter" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `$${v.toFixed(1)}B`}
        />
        <Tooltip
          cursor={{ fill: "rgba(201,168,76,0.05)" }}
          contentStyle={{
            background: "#1a2d45", border: "1px solid rgba(201,168,76,0.25)",
            borderRadius: "10px", color: "#fff", fontSize: "12px", fontFamily: "Inter",
          }}
          formatter={(v: number) => [`$${v.toFixed(2)}B`, "FCF projeté"]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={`rgba(201,168,76,${0.45 + (i / data.length) * 0.55})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
