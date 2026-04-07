"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Trophy, Target, BarChart3 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import type { TrackRecordEntry, TrackRecordResponse } from "@/app/api/track-record/route";

/* ── Verdict Badge ──────────────────────────────────────────────────── */

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { label: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
    BUY:  {
      label: "Sous-évalué",
      dotColor: "var(--color-success)",
      textColor: "var(--color-success)",
      bgColor: "rgba(0,230,138,0.08)",
      borderColor: "rgba(0,230,138,0.2)",
    },
    SELL: {
      label: "Surévalué",
      dotColor: "var(--color-danger)",
      textColor: "var(--color-danger)",
      bgColor: "rgba(255,84,112,0.08)",
      borderColor: "rgba(255,84,112,0.2)",
    },
    HOLD: {
      label: "Juste valeur",
      dotColor: "var(--color-warning)",
      textColor: "var(--color-warning)",
      bgColor: "rgba(255,184,77,0.08)",
      borderColor: "rgba(255,184,77,0.2)",
    },
  };
  const c = config[verdict] ?? config.HOLD;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{
        color: c.textColor,
        background: c.bgColor,
        borderColor: c.borderColor,
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: c.dotColor }}
      />
      {c.label}
    </span>
  );
}

/* ── Performance Badge ──────────────────────────────────────────────── */

function PerfBadge({ pct, verdict }: { pct: number | null; verdict: string }) {
  if (pct == null) return <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>—</span>;
  // For SELL, a negative move is a win
  const isWin = verdict === "SELL" ? pct < 0 : pct > 0;
  const color = isWin ? "var(--color-success)" : "var(--color-danger)";
  return (
    <span className="text-sm font-bold" style={{ color }}>
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
  const [periodFilter, setPeriodFilter] = useState("all");
  const [verifiedStats, setVerifiedStats] = useState<{
    win_rate: number;
    avg_performance: number;
    total_analyses: number;
    by_verdict: Record<string, { count: number; win_rate: number; avg_performance: number }>;
    is_verified: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/track-record")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch server-verified stats
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${apiBase}/api/track-record/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setVerifiedStats(d); })
      .catch(() => {});
  }, []);

  const s = data?.summary;

  const filteredEntries = useMemo(() => {
    if (!data) return [];

    // Filter by period
    let entries = data.entries;
    if (periodFilter === "6m") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      entries = entries.filter(d => new Date(d.created_at) >= sixMonthsAgo);
    } else if (periodFilter === "1y") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      entries = entries.filter(d => new Date(d.created_at) >= oneYearAgo);
    }

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
  }, [data, verdictFilter, perfFilter, periodFilter]);

  const chartData = useMemo(() => data ? buildChartData(data.entries) : [], [data]);

  return (
    <AppLayout>
      <div className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8" style={{ color: "var(--text-primary)" }}>

        {/* Header */}
        <div className="mb-8 anim-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Track Record
            </h1>
            <span
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1 rounded-full border"
              style={{
                color: "var(--color-success)",
                borderColor: "rgba(0,230,138,0.2)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--color-success)" }}
              />
              Live
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Performances historiques de nos analyses — actualisées en temps réel
          </p>
          {verifiedStats?.is_verified && verifiedStats.total_analyses > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1 rounded-full border"
                style={{
                  color: "var(--accent-gold)",
                  borderColor: "rgba(240,200,80,0.3)",
                  background: "rgba(240,200,80,0.05)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 0L6.12 3.09L9.51 3.09L6.69 5L7.82 8.09L5 6.18L2.18 8.09L3.31 5L0.49 3.09L3.88 3.09L5 0Z" fill="var(--accent-gold)" />
                </svg>
                Verified — {verifiedStats.total_analyses} analyses server-side
              </span>
              {verifiedStats.by_verdict.BUY && (
                <span className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  BUY: {verifiedStats.by_verdict.BUY.win_rate}% win | SELL: {verifiedStats.by_verdict.SELL?.win_rate ?? 0}% win
                </span>
              )}
            </div>
          )}
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 anim-2">
          <StatCard
            icon={<Target size={18} style={{ color: "var(--color-success)" }} />}
            label="Win Rate"
            value={loading ? "—" : s ? `${s.win_rate}%` : "—"}
            sub="Verdicts corrects"
            valueColor="var(--color-success)"
            loading={loading}
          />
          <StatCard
            icon={<BarChart3 size={18} style={{ color: "var(--accent-primary)" }} />}
            label="Analyses totales"
            value={loading ? "—" : s && s.total > 0 ? String(s.total) : "—"}
            sub="Depuis le lancement"
            valueColor="var(--accent-primary)"
            loading={loading}
          />
          <StatCard
            icon={
              <TrendingUp
                size={18}
                style={{ color: s && s.avg_performance >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
              />
            }
            label="Perf. moyenne"
            value={loading ? "—" : s ? `${s.avg_performance >= 0 ? "+" : ""}${s.avg_performance}%` : "—"}
            sub="Par analyse"
            valueColor={s && s.avg_performance >= 0 ? "var(--color-success)" : "var(--color-danger)"}
            loading={loading}
          />
          <StatCard
            icon={<Trophy size={18} style={{ color: "var(--accent-gold)" }} />}
            label="Meilleure analyse"
            value={loading ? "—" : s?.best_ticker || "—"}
            sub={loading ? "" : s ? `+${s.best_performance.toFixed(1)}%` : ""}
            valueColor="var(--accent-gold)"
            loading={loading}
          />
        </div>

        {/* Performance Chart */}
        {!loading && chartData.length > 2 && (
          <div
            className="mb-8 rounded-xl border backdrop-blur-sm p-5 anim-3"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-surface)",
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Performance cumulée des verdicts
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-default)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                  labelStyle={{ color: "var(--text-secondary)" }}
                  formatter={(value: number, _name: string, props: { payload?: { ticker?: string } }) => [
                    `${value > 0 ? "+" : ""}${value}%`,
                    props.payload?.ticker ?? "Cumul",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="performance"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  fill="url(#perfGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 anim-3">
          <span className="text-[13px] font-medium mr-1" style={{ color: "var(--text-secondary)" }}>
            Verdict :
          </span>
          {(["all", "BUY", "SELL", "HOLD"] as VerdictFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setVerdictFilter(f)}
              className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors border"
              style={
                verdictFilter === f
                  ? {
                      background: "rgba(108,92,231,0.12)",
                      color: "var(--accent-primary)",
                      borderColor: "rgba(108,92,231,0.3)",
                    }
                  : {
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      borderColor: "var(--border-subtle)",
                    }
              }
            >
              {f === "all" ? "Tous" : f === "BUY" ? "Sous-évalué" : f === "SELL" ? "Surévalué" : "Juste valeur"}
            </button>
          ))}

          <span className="mx-1" style={{ color: "var(--border-default)" }}>|</span>
          <span className="text-[13px] font-medium mr-1" style={{ color: "var(--text-secondary)" }}>
            Perf :
          </span>
          {(["all", "winners", "losers"] as PerfFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPerfFilter(f)}
              className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors border"
              style={
                perfFilter === f
                  ? {
                      background: "rgba(108,92,231,0.12)",
                      color: "var(--accent-primary)",
                      borderColor: "rgba(108,92,231,0.3)",
                    }
                  : {
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      borderColor: "var(--border-subtle)",
                    }
              }
            >
              {f === "all" ? "Tous" : f === "winners" ? "Gagnants" : "Perdants"}
            </button>
          ))}

          <span className="mx-1" style={{ color: "var(--border-default)" }}>|</span>
          <span className="text-[13px] font-medium mr-1" style={{ color: "var(--text-secondary)" }}>
            Période :
          </span>
          <div className="flex gap-2">
            {["all", "6m", "1y"].map(period => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={periodFilter === period
                  ? { background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.4)", color: "var(--accent-primary)" }
                  : { background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }
                }
              >
                {period === "all" ? "Tout" : period === "6m" ? "6 mois" : "1 an"}
              </button>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-6" style={{ background: "rgba(108,92,231,0.04)", borderColor: "rgba(108,92,231,0.15)" }}>
          <span style={{ color: "var(--accent-primary)" }}>ℹ️</span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Comment lire le Track Record</p>
            <p className="text-xs leading-relaxed mt-1" style={{ color: "var(--text-secondary)" }}>
              Chaque verdict est horodaté et vérifiable côté serveur. Un verdict BUY est &quot;correct&quot; si le prix a progressé depuis,
              SELL si le prix a baissé. Le taux de succès est calculé sur l&apos;ensemble des verdicts émis avec un minimum de 30 jours d&apos;historique.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="anim-3">
          {loading ? (
            <div className="rounded-xl border backdrop-blur-sm overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3"
                  style={i < 5 ? { borderBottom: "1px solid var(--border-subtle)" } : {}}
                >
                  <div className="skeleton h-4 w-14 rounded" />
                  <div className="skeleton h-4 w-32 rounded hidden md:block" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                  <div className="skeleton h-4 w-16 rounded hidden md:block" />
                  <div className="skeleton h-4 w-16 rounded hidden md:block" />
                  <div className="skeleton h-4 w-12 rounded" />
                  <div className="skeleton h-4 w-10 rounded hidden md:block" />
                  <div className="skeleton h-4 w-16 rounded hidden md:block" />
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            verdictFilter !== "all" || perfFilter !== "all" || periodFilter !== "all" ? (
              <div
                className="rounded-xl p-12 border backdrop-blur-sm text-center"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-surface)",
                }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Aucun résultat pour ces filtres
                </p>
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Track Record en construction</h3>
                <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Nos premiers verdicts ont été émis récemment. Le track record se construit au fil du temps — reviens consulter nos performances vérifiées.
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Méthodologie : un verdict est considéré correct si le prix rejoint la valeur intrinsèque dans les 12 mois.
                </p>
              </div>
            )
          ) : (
            <div
              className="rounded-xl border backdrop-blur-sm overflow-x-auto"
              style={{
                borderColor: "var(--border-default)",
                background: "var(--bg-surface)",
              }}
            >
              {/* Table header */}
              <div
                className="hidden md:grid grid-cols-[80px_1fr_100px_85px_85px_75px_70px_80px] gap-2 px-4 py-3 border-b"
                style={{
                  borderColor: "var(--border-default)",
                  background: "rgba(26,26,46,0.4)",
                }}
              >
                {["Ticker", "Nom", "Verdict", "Entrée", "Actuel", "Perf.", "Durée", "Date"].map((h) => (
                  <p
                    key={h}
                    className="text-[13px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {h}
                  </p>
                ))}
              </div>

              {/* Rows */}
              {filteredEntries.map((row, i) => (
                <div
                  key={row.id}
                  onClick={() => router.push(`/analyze?ticker=${row.ticker}`)}
                  className="grid grid-cols-2 md:grid-cols-[80px_1fr_100px_85px_85px_75px_70px_80px] gap-2 items-center px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.03]"
                  style={
                    i < filteredEntries.length - 1
                      ? { borderBottom: "1px solid var(--border-subtle)" }
                      : {}
                  }
                >
                  <span className="font-bold text-sm" style={{ color: "var(--accent-primary)" }}>
                    {row.ticker}
                  </span>
                  <span className="text-xs truncate hidden md:block" style={{ color: "var(--text-secondary)" }}>
                    {row.name}
                  </span>
                  <VerdictBadge verdict={row.verdict} />
                  <span className="text-sm hidden md:block" style={{ color: "var(--text-secondary)" }}>
                    {row.price_entry != null ? `$${row.price_entry.toFixed(2)}` : "—"}
                  </span>
                  <span className="text-sm font-medium hidden md:block" style={{ color: "var(--text-primary)" }}>
                    {row.price_now != null ? `$${row.price_now.toFixed(2)}` : "—"}
                  </span>
                  <PerfBadge pct={row.performance_pct} verdict={row.verdict} />
                  <span className="text-xs hidden md:block" style={{ color: "var(--text-tertiary)" }}>
                    {getDuration(row.created_at)}
                  </span>
                  <span className="text-xs hidden md:block" style={{ color: "var(--text-tertiary)" }}>
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
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium"
              style={{
                background: "rgba(240,200,80,0.04)",
                borderColor: "rgba(240,200,80,0.15)",
                color: "var(--text-tertiary)",
              }}
            >
              Démo — Données représentatives des performances attendues
            </span>
          </div>
        )}

        {/* CTA */}
        <div
          className="mt-10 rounded-xl p-6 border text-center anim-4"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-elevated)",
          }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Accède aux analyses complètes (DCF, SWOT, PESTLE)
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Crée un compte gratuit pour commencer
          </p>
          <button
            onClick={() => router.push("/sign-up")}
            className="btn-primary font-bold px-6 py-2.5 rounded-lg text-sm transition-all"
          >
            Créer un compte gratuit — 3 analyses/jour
          </button>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border mt-6" style={{ background: "rgba(255,184,77,0.04)", borderColor: "rgba(255,184,77,0.15)" }}>
          <span style={{ color: "var(--color-warning)" }}>⚠️</span>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Les performances passées ne préjugent pas des performances futures. Les verdicts ValuEngine sont basés sur un modèle DCF mathématique
            et ne constituent pas des conseils en investissement au sens de la directive MIF II. Consultez un conseiller agréé avant toute décision.
          </p>
        </div>

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
  valueColor,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueColor: string;
  loading: boolean;
}) {
  return (
    <div
      className="card rounded-xl p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
      </div>
      {loading ? (
        <div className="skeleton h-7 w-16 rounded mb-1" />
      ) : (
        <p className="text-2xl font-black" style={{ color: valueColor }}>{value}</p>
      )}
      <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--text-tertiary)" }}>{sub}</p>
    </div>
  );
}
