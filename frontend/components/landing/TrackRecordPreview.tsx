"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RecentEntry { id: string; ticker: string; name: string; verdict: string; performance_pct: number | null; created_at: string }
interface TrackRecordData { entries: RecentEntry[]; summary?: { total: number; wins: number; win_rate: number; avg_performance: number } }

export default function TrackRecordPreview() {
  const [trackData, setTrackData] = useState<TrackRecordData | null>(null);

  useEffect(() => {
    fetch("/api/track-record")
      .then((r) => r.ok ? r.json() : null)
      .then((d: TrackRecordData | null) => { if (d) setTrackData(d); })
      .catch((err) => console.error("[TrackRecordPreview] fetch error:", err));
  }, []);

  const recentAnalyses = trackData?.entries?.slice(0, 5) ?? [];
  const summary = trackData?.summary;

  if (!summary || summary.total === 0) return null;

  return (
    <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--accent-primary)" }}>Track Record</p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: "var(--color-success)", background: "rgba(0,230,138,0.1)", border: "1px solid rgba(0,230,138,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} /> LIVE
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Nos verdicts, vérifiés en temps réel</h2>
          <p className="text-[15px] mt-3" style={{ color: "var(--text-tertiary)" }}>Aucun autre outil ne publie ses performances passées. Nous si.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Win Rate", value: `${summary.win_rate.toFixed(0)}%` },
            { label: "Analyses", value: String(summary.total) },
            { label: "Perf. moyenne", value: `${summary.avg_performance >= 0 ? "+" : ""}${summary.avg_performance.toFixed(1)}%` },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>{s.label}</p>
              <p className="text-xl font-black" style={{ color: "var(--accent-primary)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {recentAnalyses.length > 0 && (
          <div className="flex flex-col gap-3 mb-8">
            {recentAnalyses.map((entry) => {
              const isUp = (entry.performance_pct ?? 0) >= 0;
              const isBuy = entry.verdict === "BUY";
              const isSell = entry.verdict === "SELL";
              return (
                <Link
                  key={entry.id}
                  href={`/analyze?ticker=${entry.ticker}`}
                  className="card-interactive flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                      background: isBuy ? "rgba(0,230,138,0.1)" : isSell ? "rgba(255,84,112,0.1)" : "rgba(255,184,77,0.1)",
                      color: isBuy ? "var(--color-success)" : isSell ? "var(--color-danger)" : "var(--color-warning)",
                    }}>
                      {isBuy ? <TrendingUp size={14} /> : isSell ? <TrendingDown size={14} /> : <Minus size={14} />}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{entry.ticker}</span>
                      <span className="text-sm ml-2 truncate hidden sm:inline" style={{ color: "var(--text-tertiary)" }}>{entry.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                      background: isBuy ? "rgba(0,230,138,0.1)" : isSell ? "rgba(255,84,112,0.1)" : "rgba(255,184,77,0.1)",
                      color: isBuy ? "var(--color-success)" : isSell ? "var(--color-danger)" : "var(--color-warning)",
                    }}>
                      {isBuy ? "Sous-évalué" : isSell ? "Surévalué" : "Juste valeur"}
                    </span>
                    {entry.performance_pct != null && (
                      <span className="text-sm font-bold w-16 text-right" style={{ color: isUp ? "var(--color-success)" : "var(--color-danger)" }}>
                        {isUp ? "+" : ""}{entry.performance_pct.toFixed(1)}%
                      </span>
                    )}
                    <span className="text-xs group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--accent-primary)" }}>&rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <div className="text-center">
          <Link href="/track-record" className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-all" style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
            Voir le Track Record complet &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
