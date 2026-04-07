"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flame, BarChart3, Users, Loader2, TrendingUp, Briefcase } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface TrendTicker {
  ticker: string;
  count?: number;
  holders?: number;
  rank: number;
}

interface CommunityStats {
  total_users: number;
  total_analyses: number;
  total_positions: number;
}

interface TrendsData {
  top_analyzed: TrendTicker[];
  top_held: TrendTicker[];
  stats: CommunityStats;
}

export default function TrendsPage() {
  const router = useRouter();
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/trends`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const RANK_COLORS = ["var(--accent-primary)", "#a0a0a0", "#cd7f32", "var(--text-tertiary)", "var(--text-tertiary)"];

  return (
    <AppLayout>
      <div className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl" style={{ color: "var(--text-primary)" }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame size={24} style={{ color: "var(--color-danger)" }} />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tendances</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Ce que la communaute ValuEngine analyse et detient — donnees anonymisees.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Community Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="backdrop-blur-sm rounded-xl p-5 text-center border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
                <Users size={20} className="mx-auto mb-2" style={{ color: "var(--accent-primary)" }} />
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{data.stats.total_users.toLocaleString()}</p>
                <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>Utilisateurs</p>
              </div>
              <div className="backdrop-blur-sm rounded-xl p-5 text-center border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
                <BarChart3 size={20} className="mx-auto mb-2" style={{ color: "var(--accent-primary)" }} />
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{data.stats.total_analyses.toLocaleString()}</p>
                <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>Analyses</p>
              </div>
              <div className="backdrop-blur-sm rounded-xl p-5 text-center border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
                <Briefcase size={20} className="mx-auto mb-2" style={{ color: "var(--accent-primary)" }} />
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{data.stats.total_positions.toLocaleString()}</p>
                <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>Positions</p>
              </div>
            </div>

            {/* Top Analyzed */}
            <div className="backdrop-blur-sm rounded-2xl p-6 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} style={{ color: "var(--accent-primary)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                  Les plus analyses
                </h2>
              </div>

              {data.top_analyzed.length > 0 ? (
                <div className="space-y-3">
                  {data.top_analyzed.map((t) => {
                    const maxCount = data.top_analyzed[0]?.count || 1;
                    const pct = ((t.count || 0) / maxCount) * 100;
                    return (
                      <div
                        key={t.ticker}
                        onClick={() => router.push(`/analyze?ticker=${t.ticker}`)}
                        className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                      >
                        <span
                          className="text-sm font-black w-6 text-center"
                          style={{ color: RANK_COLORS[Math.min(t.rank - 1, 4)] }}
                        >
                          {t.rank}
                        </span>
                        <span className="text-sm font-bold w-20" style={{ color: "var(--accent-primary)" }}>{t.ticker}</span>
                        <div className="flex-1 rounded-full h-2" style={{ background: "var(--border-default)" }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "var(--accent-primary)" }}
                          />
                        </div>
                        <span className="text-xs w-16 text-right" style={{ color: "var(--text-tertiary)" }}>
                          {t.count} analyses
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>Pas encore assez de donnees.</p>
              )}
            </div>

            {/* Most Held */}
            <div className="backdrop-blur-sm rounded-2xl p-6 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Briefcase size={16} style={{ color: "var(--color-success)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                  Les plus detenus
                </h2>
              </div>

              {data.top_held.length > 0 ? (
                <div className="space-y-3">
                  {data.top_held.map((t) => {
                    const maxHolders = data.top_held[0]?.holders || 1;
                    const pct = ((t.holders || 0) / maxHolders) * 100;
                    return (
                      <div
                        key={t.ticker}
                        onClick={() => router.push(`/analyze?ticker=${t.ticker}`)}
                        className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                      >
                        <span
                          className="text-sm font-black w-6 text-center"
                          style={{ color: RANK_COLORS[Math.min(t.rank - 1, 4)] }}
                        >
                          {t.rank}
                        </span>
                        <span className="text-sm font-bold w-20" style={{ color: "var(--color-success)" }}>{t.ticker}</span>
                        <div className="flex-1 rounded-full h-2" style={{ background: "var(--border-default)" }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "var(--color-success)" }}
                          />
                        </div>
                        <span className="text-xs w-16 text-right" style={{ color: "var(--text-tertiary)" }}>
                          {t.holders} users
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>Pas encore assez de donnees.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
