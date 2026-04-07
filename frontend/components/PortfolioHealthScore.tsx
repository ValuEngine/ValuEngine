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
    <div
      className="backdrop-blur-sm rounded-2xl p-6 mb-8 border"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
            Score Sante Portefeuille
          </h3>
          <Shield size={14} style={{ color: "var(--accent-primary)" }} />
        </div>
        <button
          onClick={fetchHealthScore}
          disabled={loading || positions.length === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 border"
          style={{ borderColor: "rgba(99,102,241,0.4)", color: "var(--accent-primary)" }}
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
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-default)" strokeWidth="2.5" />
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
                <span className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{healthData.score}</span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>/100</span>
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
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>— {healthData.grade_label}</span>
              </div>

              {/* Issues */}
              {healthData.issues.length > 0 && (
                <div className="space-y-1 mt-2">
                  {healthData.issues.map((issue, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle
                        size={12}
                        style={{ color: issue.severity === "danger" ? "var(--color-danger)" : "var(--color-warning)" }}
                      />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{issue.message}</span>
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
              const barColor = pct >= 70 ? "var(--color-success)" : pct >= 40 ? "var(--accent-primary)" : "var(--color-danger)";
              return (
                <div
                  key={key}
                  className="rounded-xl p-3 border"
                  style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={12} style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {CATEGORY_LABELS[key]}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: "var(--border-default)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Recommendations (Pro) */}
          {healthData.ai_recommendations && (
            <div
              className="rounded-xl p-4 space-y-3 border"
              style={{ background: "var(--bg-base)", borderColor: "rgba(99,102,241,0.2)" }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} style={{ color: "var(--accent-primary)" }} />
                <span className="text-[13px] font-medium" style={{ color: "var(--accent-primary)" }}>
                  Recommandations IA
                </span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full border"
                  style={{ color: "var(--accent-gold)", background: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" }}
                >
                  Pro
                </span>
              </div>

              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{healthData.ai_recommendations.analyse}</p>

              {healthData.ai_recommendations.actions_prioritaires?.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-danger)" }}>
                    Actions prioritaires
                  </p>
                  {healthData.ai_recommendations.actions_prioritaires.map((a, i) => (
                    <p key={i} className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>&#9888;&#65039; {a}</p>
                  ))}
                </div>
              )}

              {healthData.ai_recommendations.recommandations?.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-success)" }}>
                    Recommandations
                  </p>
                  {healthData.ai_recommendations.recommandations.map((r, i) => (
                    <p key={i} className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>&#10003; {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Non-Pro hint */}
          {!isPro && !healthData.ai_recommendations && (
            <p className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>
              Passe Pro pour obtenir des recommandations IA personnalisees.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!healthData && !loading && (
        <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
          Clique sur &quot;Calculer mon score&quot; pour obtenir un diagnostic complet de ton portefeuille.
        </p>
      )}
    </div>
  );
}
