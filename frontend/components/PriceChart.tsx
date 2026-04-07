"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { fetchHistory, type HistoryPoint } from "@/lib/api";

interface Props {
  ticker: string;
  currentPrice: number;
}

const PERIODS = ["1mo", "3mo", "6mo", "1y", "2y", "5y"] as const;
type Period = typeof PERIODS[number];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: HistoryPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#132032] border border-[rgba(108,92,231,0.25)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[13px] font-medium text-[#5d7289] mb-1">
        {new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      <p className="text-lg font-black" style={{ color: "var(--accent-primary)" }}>${d.close.toFixed(2)}</p>
      <p className="text-[13px] font-medium text-[#4a6070] mt-1">Vol: {(d.volume / 1e6).toFixed(1)}M</p>
    </div>
  );
}

export function PriceChart({ ticker, currentPrice }: Props) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [period, setPeriod] = useState<Period>("1y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchHistory(ticker, period)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker, period]);

  const minClose = data.length ? Math.min(...data.map((d) => d.close)) * 0.98 : 0;
  const maxClose = data.length ? Math.max(...data.map((d) => d.close)) * 1.02 : 0;

  // Show only ~6 month labels on X axis
  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  const formatXAxis = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  };

  return (
    <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(108,92,231,0.14)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: "var(--accent-primary)" }}>Cours historique</p>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[13px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                period === p
                  ? "border"
                  : "text-[#4a6070]"
              }`}
              style={period === p ? {
                background: "rgba(108,92,231,0.15)",
                color: "var(--accent-primary)",
                borderColor: "rgba(108,92,231,0.3)",
              } : undefined}
              onMouseEnter={period !== p ? (e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-primary)"; } : undefined}
              onMouseLeave={period !== p ? (e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4a6070"; } : undefined}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-6 h-6 border-t-2 rounded-full animate-spin" style={{ borderTopColor: "var(--accent-primary)" }} />
        </div>
      )}

      {error && (
        <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: "var(--color-danger)" }}>{error}</div>
      )}

      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#4a6070", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tickFormatter={formatXAxis}
            />
            <YAxis
              domain={[minClose, maxClose]}
              tick={{ fill: "#4a6070", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={currentPrice}
              stroke="rgba(108,92,231,0.35)"
              strokeDasharray="4 4"
              label={{ value: `$${currentPrice.toFixed(0)}`, fill: "var(--accent-primary)", fontSize: 10, position: "right" }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--accent-primary)", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
