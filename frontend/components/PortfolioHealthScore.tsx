"use client";

import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, TrendingUp, Shield, BarChart3, Target } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface BreakdownItem {
  score: number;
  max: number;
  details: Record<string, number | string>;
}

interface HealthScoreData {
  score: number;
  grade: string;
  grade_label: string;
  grade_color: string;
  breakdown: {
    diversification: BreakdownItem;
    performance: BreakdownItem;
    risk: BreakdownItem;
    balance: BreakdownItem;
  };
  issues: { severity: string; message: string }[];
  ai_recommendations?: {
    analyse: string;
    recommandations: string[];
    actions_prioritaires: string[];
  } | null;
}

interface Position {
  ticker: string;
  shares: number;
  avgPrice: number;
  sector?: string;
}

export default function PortfolioHealthScore({
  positions,
  currentPrices,
  isPro,
}: {
  positions: Position[];
  currentPrices: Record<string, number>;
  isPro: boolean;
}) {
  const { getToken } = useAuth();
  const [healthData, setHealthData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealthScore = async () => {
    if (positions.length === 0) return;
    setLoading(true);

    const enrichedPositions = positions.map((p) => {
      const currentPrice = currentPrices[p.ticker] ?? p.avgPrice;
      const currentValue = p.shares * currentPrice;
      const cost = p.shares * p.avgPrice;
      const pnlPct = cost > 0 ? ((currentValue - cost) / cost) * 100 : 0;
      return {
        ticker: p.ticker,
        shares: p.shares,
        avg_price: p.avgPrice,
        current_price: currentPrice,
        current_value: currentValue,
        pnl_pct: Math.round(pnlPct * 10) / 10,
        sector: p.sector || "Unknown",
      };
    });

    try {
      const resp = await authedFetch(`${API_BASE}/api/portfolio/health-score`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: enrichedPositions }),
      });

      if (!resp.ok) throw new Error("Erreur");
      const data: HealthScoreData = await resp.json();
      setHealthData(data);
    } catch {
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  const CATEGORY_ICONS: Record<string, typeof Shield> = {
    diversification: BarChart3,
    performance: TrendingUp,
    risk: Shield,
    balance: Target,
  };

  const CATEGORY_LABELS: Record<string, string> = {
    diversification: "Diversification",
    performance: "Performance",
    risk: "Risque",
    balance: "Equilibre",
  };

  return (
    <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Score Sante Portefeuille
          </h3>
          <Shield size={14} className="text-[#C9A84C]" />
        </div>
        <button
          onClick={fetchHealthScore}
          disabled={loading || positions.length === 0}
          className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Calcul...
            </>
          ) : (
            "Calculer mon score"
          )}
        </button>
      </div>

      {healthData && (
        <div className="space-y-5">
          {/* Score circle + grade */}
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#27272a" strokeWidth="2.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={healthData.grade_color}
                  strokeWidth="2.5"
                  strokeDasharray={`${(healthData.score / 100) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{healthData.score}</span>
                <span className="text-[10px] text-zinc-500">/100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-lg font-black"
                  style={{ color: healthData.grade_color }}
                >
                  {healthData.grade}
                </span>
                <span className="text-sm text-zinc-400">— {healthData.grade_label}</span>
              </div>

              {/* Issues */}
              {healthData.issues.length > 0 && (
                <div className="space-y-1 mt-2">
                  {healthData.issues.map((issue, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle
                        size={12}
                        className={issue.severity === "danger" ? "text-[#ff4d6d]" : "text-[#fb923c]"}
                      />
                      <span className="text-xs text-zinc-400">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="grid grid-cols-2 gap-3">
            {(["diversification", "performance", "risk", "balance"] as const).map((key) => {
              const item = healthData.breakdown[key];
              const pct = item.max > 0 ? (item.score / item.max) * 100 : 0;
              const Icon = CATEGORY_ICONS[key];
              return (
                <div key={key} className="bg-[#09090b]/60 border border-[#27272a] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={12} className="text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-400">
                      {CATEGORY_LABELS[key]}
                    </span>
                    <span className="text-xs text-zinc-600 ml-auto">
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <div className="w-full bg-[#27272a] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 70 ? "#00d4aa" : pct >= 40 ? "#C9A84C" : "#ff4d6d",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Recommendations (Pro) */}
          {healthData.ai_recommendations && (
            <div className="bg-[#09090b]/60 border border-[#C9A84C]/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#C9A84C]" />
                <span className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider">
                  Recommandations IA
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-1.5 py-0.5 rounded-full">
                  Pro
                </span>
              </div>

              <p className="text-sm text-zinc-300">{healthData.ai_recommendations.analyse}</p>

              {healthData.ai_recommendations.actions_prioritaires?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#ff4d6d] uppercase tracking-wider mb-1">
                    Actions prioritaires
                  </p>
                  {healthData.ai_recommendations.actions_prioritaires.map((a, i) => (
                    <p key={i} className="text-xs text-zinc-400 mb-0.5">&#9888;&#65039; {a}</p>
                  ))}
                </div>
              )}

              {healthData.ai_recommendations.recommandations?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-wider mb-1">
                    Recommandations
                  </p>
                  {healthData.ai_recommendations.recommandations.map((r, i) => (
                    <p key={i} className="text-xs text-zinc-400 mb-0.5">&#10003; {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Non-Pro hint */}
          {!isPro && !healthData.ai_recommendations && (
            <p className="text-xs text-zinc-600 italic">
              Passe Pro pour obtenir des recommandations IA personnalisees.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!healthData && !loading && (
        <p className="text-sm text-zinc-600 italic">
          Clique sur &quot;Calculer mon score&quot; pour obtenir un diagnostic complet de ton portefeuille.
        </p>
      )}
    </div>
  );
}
