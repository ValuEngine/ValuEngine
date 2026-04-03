"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Trophy, Target, BarChart3 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import type { TrackRecordEntry, TrackRecordResponse } from "@/app/api/track-record/route";

/* ── Verdict Badge ──────────────────────────────────────────────────── */

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
    BUY:  { label: "Sous-évalué", dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    SELL: { label: "Surévalué",   dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
    HOLD: { label: "Juste valeur", dot: "bg-yellow-400",  text: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
  };
  const c = config[verdict] ?? config.HOLD;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1 h-1 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/* ── Performance Badge ──────────────────────────────────────────────── */

function PerfBadge({ pct, verdict }: { pct: number | null; verdict: string }) {
  if (pct == null) return <span className="text-zinc-600 text-sm">—</span>;
  // For SELL, a negative move is a win
  const isWin = verdict === "SELL" ? pct < 0 : pct > 0;
  const color = isWin ? "text-emerald-400" : "text-red-400";
  return (
    <span className={`text-sm font-bold ${color}`}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

/* ── Duration helper ────────────────────────────────────────────────── */

function getDuration(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}a ${rem}m` : `${years}a`;
}

/* ── Cumulative performance chart data ──────────────────────────────── */

function buildChartData(entries: TrackRecordEntry[]) {
  const sorted = [...entries]
    .filter((e) => e.performance_pct != null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let cumulative = 0;
  return sorted.map((e) => {
    cumulative += e.performance_pct ?? 0;
    return {
      date: new Date(e.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      performance: +cumulative.toFixed(1),
      ticker: e.ticker,
    };
  });
}

/* ── Main Page ──────────────────────────────────────────────────────── */

type VerdictFilter = "all" | "BUY" | "SELL" | "HOLD";
type PerfFilter = "all" | "winners" | "losers";

export default function TrackRecordPage() {
  const router = useRouter();
  const [data, setData] = useState<TrackRecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [perfFilter, setPerfFilter] = useState<PerfFilter>("all");

  useEffect(() => {
    fetch("/api/track-record")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = data?.summary;

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    let entries = data.entries;
    if (verdictFilter !== "all") {
      entries = entries.filter((e) => e.verdict === verdictFilter);
    }
    if (perfFilter === "winners") {
      entries = entries.filter((e) => {
        if (e.performance_pct == null) return false;
        if (e.verdict === "BUY") return e.performance_pct > 0;
        if (e.verdict === "SELL") return e.performance_pct < 0;
        if (e.verdict === "HOLD") return Math.abs(e.performance_pct) <= 10;
        return false;
      });
    } else if (perfFilter === "losers") {
      entries = entries.filter((e) => {
        if (e.performance_pct == null) return false;
        if (e.verdict === "BUY") return e.performance_pct <= 0;
        if (e.verdict === "SELL") return e.performance_pct >= 0;
        if (e.verdict === "HOLD") return Math.abs(e.performance_pct) > 10;
        return false;
      });
    }
    return entries;
  }, [data, verdictFilter, perfFilter]);

  const chartData = useMemo(() => data ? buildChartData(data.entries) : [], [data]);

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8">

        {/* Header */}
        <div className="mb-8 anim-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Track Record</h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            Performances historiques de nos analyses — actualisées en temps réel
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 anim-2">
          <StatCard
            icon={<Target size={18} className="text-emerald-400" />}
            label="Win Rate"
            value={loading ? "—" : s ? `${s.win_rate}%` : "—"}
            sub="Verdicts corrects"
            color="text-emerald-400"
            loading={loading}
          />
          <StatCard
            icon={<BarChart3 size={18} className="text-[#C9A84C]" />}
            label="Analyses totales"
            value={loading ? "—" : s && s.total > 0 ? String(s.total) : "—"}
            sub="Depuis le lancement"
            color="text-[#C9A84C]"
            loading={loading}
          />
          <StatCard
            icon={<TrendingUp size={18} className={s && s.avg_performance >= 0 ? "text-emerald-400" : "text-red-400"} />}
            label="Perf. moyenne"
            value={loading ? "—" : s ? `${s.avg_performance >= 0 ? "+" : ""}${s.avg_performance}%` : "—"}
            sub="Par analyse"
            color={s && s.avg_performance >= 0 ? "text-emerald-400" : "text-red-400"}
            loading={loading}
          />
          <StatCard
            icon={<Trophy size={18} className="text-[#C9A84C]" />}
            label="Meilleure analyse"
            value={loading ? "—" : s?.best_ticker || "—"}
            sub={loading ? "" : s ? `+${s.best_performance.toFixed(1)}%` : ""}
            color="text-[#C9A84C]"
            loading={loading}
          />
        </div>

        {/* Performance Chart */}
        {!loading && chartData.length > 2 && (
          <div className="mb-8 rounded-xl border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm p-5 anim-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Performance cumulée des verdicts
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: 12 }}
                  labelStyle={{ color: "#71717a" }}
                  formatter={(value: number, _name: string, props: { payload?: { ticker?: string } }) => [
                    `${value > 0 ? "+" : ""}${value}%`,
                    props.payload?.ticker ?? "Cumul",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="performance"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  fill="url(#perfGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 anim-3">
          <span className="text-xs text-zinc-500 font-medium mr-1">Verdict :</span>
          {(["all", "BUY", "SELL", "HOLD"] as VerdictFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setVerdictFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                verdictFilter === f
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30"
                  : "bg-[#18181b] text-zinc-400 border border-[#27272a] hover:border-zinc-600"
              }`}
            >
              {f === "all" ? "Tous" : f === "BUY" ? "Sous-évalué" : f === "SELL" ? "Surévalué" : "Juste valeur"}
            </button>
          ))}

          <span className="text-zinc-700 mx-1">|</span>
          <span className="text-xs text-zinc-500 font-medium mr-1">Perf :</span>
          {(["all", "winners", "losers"] as PerfFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPerfFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                perfFilter === f
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30"
                  : "bg-[#18181b] text-zinc-400 border border-[#27272a] hover:border-zinc-600"
              }`}
            >
              {f === "all" ? "Tous" : f === "winners" ? "Gagnants" : "Perdants"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="anim-3">
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-xl p-12 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm text-center">
              <p className="text-zinc-400 text-sm">
                {verdictFilter !== "all" || perfFilter !== "all"
                  ? "Aucun résultat pour ces filtres"
                  : "Les premières analyses apparaîtront ici dès qu'elles seront effectuées"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm overflow-x-auto">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[80px_1fr_100px_85px_85px_75px_70px_80px] gap-2 px-4 py-3 border-b border-[#27272a] bg-[#27272a]/30">
                {["Ticker", "Nom", "Verdict", "Entrée", "Actuel", "Perf.", "Durée", "Date"].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500">{h}</p>
                ))}
              </div>

              {/* Rows */}
              {filteredEntries.map((row, i) => (
                <div
                  key={row.id}
                  onClick={() => router.push(`/analyze?ticker=${row.ticker}`)}
                  className={`grid grid-cols-2 md:grid-cols-[80px_1fr_100px_85px_85px_75px_70px_80px] gap-2 items-center px-4 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors ${
                    i < filteredEntries.length - 1 ? "border-b border-[#27272a]" : ""
                  }`}
                >
                  <span className="text-[#C9A84C] font-bold text-sm">{row.ticker}</span>
                  <span className="text-zinc-300 text-xs truncate hidden md:block">{row.name}</span>
                  <VerdictBadge verdict={row.verdict} />
                  <span className="text-zinc-400 text-sm hidden md:block">
                    {row.price_entry != null ? `$${row.price_entry.toFixed(2)}` : "—"}
                  </span>
                  <span className="text-white text-sm font-medium hidden md:block">
                    {row.price_now != null ? `$${row.price_now.toFixed(2)}` : "—"}
                  </span>
                  <PerfBadge pct={row.performance_pct} verdict={row.verdict} />
                  <span className="text-zinc-500 text-xs hidden md:block">{getDuration(row.created_at)}</span>
                  <span className="text-zinc-600 text-xs hidden md:block">
                    {new Date(row.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo badge */}
        {data?.is_demo && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.15)] text-[11px] text-zinc-500">
              DÉMO — Données représentatives des performances attendues
            </span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 rounded-xl p-6 border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.04)] text-center anim-4">
          <p className="text-sm font-semibold text-zinc-200 mb-1">
            Accède aux analyses complètes (DCF, SWOT, PESTLE)
          </p>
          <p className="text-xs text-zinc-500 mb-4">Crée un compte gratuit pour commencer</p>
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-all"
          >
            Commencer gratuitement
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-zinc-600 text-center mt-6">
          Les performances passées ne préjugent pas des performances futures. Outil éducatif — pas un conseil en investissement au sens de la directive MIF II.
        </p>

      </div>
    </AppLayout>
  );
}

/* ── Stat Card Component ────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl p-4 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs font-semibold text-zinc-400">{label}</p>
      </div>
      {loading ? (
        <div className="skeleton h-7 w-16 rounded mb-1" />
      ) : (
        <p className={`text-2xl font-black ${color}`}>{value}</p>
      )}
      <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
