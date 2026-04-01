"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import type { TrackRecordEntry, TrackRecordResponse } from "@/app/api/track-record/route";

function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === "BUY")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1 h-1 rounded-full bg-emerald-400" />
        Sous-évalué
      </span>
    );
  if (verdict === "SELL")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
        <span className="w-1 h-1 rounded-full bg-red-400" />
        Surévalué
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span className="w-1 h-1 rounded-full bg-yellow-400" />
      Juste valeur
    </span>
  );
}

function PerfBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-zinc-600 text-sm">—</span>;
  const pos = pct >= 0;
  return (
    <span className={`text-sm font-bold ${pos ? "text-emerald-400" : "text-red-400"}`}>
      {pos ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

export default function TrackRecordPage() {
  const router = useRouter();
  const [data, setData] = useState<TrackRecordResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/track-record")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = data?.summary;

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-8 md:px-10">

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
            Performances historiques de nos analyses IA — actualisées en temps réel
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-8 anim-2">
          {[
            {
              label: "Win Rate",
              value: loading ? "—" : s ? `${s.win_rate}%` : "—",
              sub: "BUY/SELL corrects",
              color: "text-emerald-400",
            },
            {
              label: "Analyses totales",
              value: loading ? "—" : s ? String(s.total) : "0",
              sub: "50 dernières",
              color: "text-[#C9A84C]",
            },
            {
              label: "Perf. moyenne",
              value: loading ? "—" : s ? `${s.avg_performance >= 0 ? "+" : ""}${s.avg_performance}%` : "—",
              sub: "depuis signal",
              color: s && s.avg_performance >= 0 ? "text-emerald-400" : "text-red-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm text-center"
            >
              {loading ? (
                <div className="skeleton h-7 w-16 mx-auto rounded mb-1" />
              ) : (
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              )}
              <p className="text-xs font-semibold text-zinc-400 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{stat.sub}</p>
            </div>
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
          ) : !data?.entries.length ? (
            <div className="rounded-xl p-12 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm text-center">
              <p className="text-zinc-400 text-sm">
                Les premières analyses apparaîtront ici dès qu&apos;elles seront effectuées
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[80px_1fr_110px_90px_90px_80px_90px] gap-2 px-4 py-3 border-b border-[#27272a] bg-[#27272a]/30">
                {["Ticker", "Nom", "Verdict", "Entrée", "Actuel", "Perf.", "Date"].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500">{h}</p>
                ))}
              </div>

              {/* Rows */}
              {data.entries.map((row: TrackRecordEntry, i: number) => (
                <div
                  key={row.id}
                  onClick={() => router.push(`/analyze?ticker=${row.ticker}`)}
                  className={`grid grid-cols-[80px_1fr_110px_90px_90px_80px_90px] gap-2 items-center px-4 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors ${
                    i < data.entries.length - 1 ? "border-b border-[#27272a]" : ""
                  }`}
                >
                  <span className="text-[#C9A84C] font-bold text-sm">{row.ticker}</span>
                  <span className="text-zinc-300 text-xs truncate">{row.name}</span>
                  <VerdictBadge verdict={row.verdict} />
                  <span className="text-zinc-400 text-sm">
                    {row.price_entry != null ? `$${row.price_entry.toFixed(2)}` : "—"}
                  </span>
                  <span className="text-white text-sm font-medium">
                    {row.price_now != null ? `$${row.price_now.toFixed(2)}` : "—"}
                  </span>
                  <PerfBadge pct={row.performance_pct} />
                  <span className="text-zinc-600 text-xs">
                    {new Date(row.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA for non-logged in users */}
        <div className="mt-10 rounded-xl p-6 border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.04)] text-center anim-4">
          <p className="text-sm font-semibold text-zinc-200 mb-1">
            Accédez aux analyses complètes (DCF, SWOT, PESTLE)
          </p>
          <p className="text-xs text-zinc-500 mb-4">Créez un compte gratuit pour commencer</p>
          <button
            onClick={() => router.push("/sign-up")}
            className="bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-all"
          >
            Commencer gratuitement
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
