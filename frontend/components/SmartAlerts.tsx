"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Bell, AlertTriangle, Info, Sparkles, ChevronRight, Zap } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface SmartAlert {
  type: string;
  severity: string;
  ticker?: string | null;
  title: string;
  message: string;
  action: string;
  action_url: string;
}

interface Position {
  ticker: string;
  shares: number;
  avgPrice: number;
  sector?: string;
}

export default function SmartAlerts({
  positions,
  currentPrices,
  isPro,
}: {
  positions: Position[];
  currentPrices: Record<string, number>;
  isPro: boolean;
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [aiAlerts, setAiAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchAlerts = async () => {
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
      const resp = await authedFetch(`${API_BASE}/api/portfolio/smart-alerts`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: enrichedPositions }),
      });

      if (!resp.ok) throw new Error("Erreur");
      const data = await resp.json();
      setAlerts(data.alerts || []);
      setAiAlerts(data.ai_alerts || []);
      setLoaded(true);
    } catch {
      setAlerts([]);
      setAiAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const severityConfig: Record<string, { icon: typeof Bell; colorVar: string; bgClass: string; borderClass: string }> = {
    danger:  { icon: AlertTriangle, colorVar: "var(--color-danger)",  bgClass: "bg-[rgba(248,81,73,0.05)]",  borderClass: "border-[rgba(248,81,73,0.2)]" },
    warning: { icon: AlertTriangle, colorVar: "var(--color-warning)", bgClass: "bg-[rgba(251,146,60,0.05)]", borderClass: "border-[rgba(251,146,60,0.2)]" },
    info:    { icon: Info,          colorVar: "#22d3ee",               bgClass: "bg-[rgba(34,211,238,0.05)]", borderClass: "border-[rgba(34,211,238,0.2)]" },
  };

  const allAlerts = [...alerts, ...aiAlerts];

  return (
    <div
      className="backdrop-blur-sm rounded-2xl p-6 mb-8 border"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
            Alertes Intelligentes
          </h3>
          <Zap size={14} style={{ color: "var(--accent-primary)" }} />
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading || positions.length === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 border"
          style={{
            borderColor: "rgba(99,102,241,0.4)",
            color: "var(--accent-primary)",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Analyse...
            </>
          ) : (
            "Scanner mon portefeuille"
          )}
        </button>
      </div>

      {loaded && allAlerts.length === 0 && (
        <div className="text-center py-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border"
            style={{ background: "rgba(var(--color-success-rgb, 63,185,80), 0.1)", borderColor: "rgba(63,185,80,0.3)" }}
          >
            <Bell size={20} style={{ color: "var(--color-success)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aucune alerte — ton portefeuille est bien equilibre !</p>
        </div>
      )}

      {allAlerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div
                key={`rule-${i}`}
                className={`${config.bgClass} border ${config.borderClass} rounded-xl p-4 flex items-start gap-3`}
              >
                <Icon size={16} className="flex-shrink-0 mt-0.5" style={{ color: config.colorVar }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: config.colorVar }}>{alert.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{alert.message}</p>
                </div>
                <button
                  onClick={() => router.push(alert.action_url)}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors flex-shrink-0"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {alert.action} <ChevronRight size={12} />
                </button>
              </div>
            );
          })}

          {/* AI alerts */}
          {aiAlerts.length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-4 mb-2">
                <Sparkles size={12} style={{ color: "var(--accent-gold)" }} />
                <span className="text-[13px] font-medium" style={{ color: "var(--accent-gold)" }}>
                  Insights IA
                </span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full border"
                  style={{ color: "var(--accent-gold)", background: "rgba(201,168,76,0.1)", borderColor: "rgba(201,168,76,0.25)" }}
                >
                  Pro
                </span>
              </div>
              {aiAlerts.map((alert, i) => {
                const config = severityConfig[alert.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={`ai-${i}`}
                    className={`${config.bgClass} border ${config.borderClass} rounded-xl p-4 flex items-start gap-3 border-l-2`}
                    style={{ borderLeftColor: "rgba(99,102,241,0.4)" }}
                  >
                    <Icon size={16} className="flex-shrink-0 mt-0.5" style={{ color: config.colorVar }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: config.colorVar }}>{alert.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{alert.message}</p>
                    </div>
                    {alert.action_url && (
                      <button
                        onClick={() => router.push(alert.action_url)}
                        className="flex items-center gap-1 text-xs font-semibold transition-colors flex-shrink-0"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {alert.action} <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Non-Pro hint */}
          {!isPro && aiAlerts.length === 0 && loaded && (
            <p className="text-xs italic mt-2" style={{ color: "var(--text-tertiary)" }}>
              Passe Pro pour des insights IA supplementaires sur ton portefeuille.
            </p>
          )}
        </div>
      )}

      {!loaded && !loading && (
        <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
          Clique sur &quot;Scanner mon portefeuille&quot; pour detecter les risques et opportunites.
        </p>
      )}
    </div>
  );
}
