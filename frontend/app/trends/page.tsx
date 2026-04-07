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

  const RANK_COLORS = ["#C9A84C", "#a0a0a0", "#cd7f32", "#71717a", "#71717a"];

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame size={24} className="text-[#ff4d6d]" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tendances</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Ce que la communaute ValuEngine analyse et detient — donnees anonymisees.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Community Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-5 text-center">
                <Users size={20} className="text-[#C9A84C] mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{data.stats.total_users.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1">Utilisateurs</p>
              </div>
              <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-5 text-center">
                <BarChart3 size={20} className="text-[#C9A84C] mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{data.stats.total_analyses.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1">Analyses</p>
              </div>
              <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-5 text-center">
                <Briefcase size={20} className="text-[#C9A84C] mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{data.stats.total_positions.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1">Positions</p>
              </div>
            </div>

            {/* Top Analyzed */}
            <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-[#C9A84C]" />
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
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
                        className="flex items-center gap-3 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span
                          className="text-sm font-black w-6 text-center"
                          style={{ color: RANK_COLORS[Math.min(t.rank - 1, 4)] }}
                        >
                          {t.rank}
                        </span>
                        <span className="text-sm font-bold text-[#C9A84C] w-20">{t.ticker}</span>
                        <div className="flex-1 bg-[#27272a] rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-[#C9A84C] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-16 text-right">
                          {t.count} analyses
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-600 italic">Pas encore assez de donnees.</p>
              )}
            </div>

            {/* Most Held */}
            <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Briefcase size={16} className="text-[#00d4aa]" />
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
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
                        className="flex items-center gap-3 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span
                          className="text-sm font-black w-6 text-center"
                          style={{ color: RANK_COLORS[Math.min(t.rank - 1, 4)] }}
                        >
                          {t.rank}
                        </span>
                        <span className="text-sm font-bold text-[#00d4aa] w-20">{t.ticker}</span>
                        <div className="flex-1 bg-[#27272a] rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-[#00d4aa] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-16 text-right">
                          {t.holders} users
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-600 italic">Pas encore assez de donnees.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
