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

  const severityConfig: Record<string, { icon: typeof Bell; color: string; bg: string; border: string }> = {
    danger: { icon: AlertTriangle, color: "text-[#ff4d6d]", bg: "bg-[#ff4d6d]/5", border: "border-[#ff4d6d]/20" },
    warning: { icon: AlertTriangle, color: "text-[#fb923c]", bg: "bg-[#fb923c]/5", border: "border-[#fb923c]/20" },
    info: { icon: Info, color: "text-[#22d3ee]", bg: "bg-[#22d3ee]/5", border: "border-[#22d3ee]/20" },
  };

  const allAlerts = [...alerts, ...aiAlerts];

  return (
    <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Alertes Intelligentes
          </h3>
          <Zap size={14} className="text-[#C9A84C]" />
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading || positions.length === 0}
          className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
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
          <div className="w-12 h-12 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/30 flex items-center justify-center mx-auto mb-3">
            <Bell size={20} className="text-[#00d4aa]" />
          </div>
          <p className="text-sm text-zinc-400">Aucune alerte — ton portefeuille est bien equilibre !</p>
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
                className={`${config.bg} border ${config.border} rounded-xl p-4 flex items-start gap-3`}
              >
                <Icon size={16} className={`${config.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${config.color}`}>{alert.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{alert.message}</p>
                </div>
                <button
                  onClick={() => router.push(alert.action_url)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#C9A84C] hover:text-[#e8c55a] transition-colors flex-shrink-0"
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
                <Sparkles size={12} className="text-[#C9A84C]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                  Insights IA
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-1.5 py-0.5 rounded-full">
                  Pro
                </span>
              </div>
              {aiAlerts.map((alert, i) => {
                const config = severityConfig[alert.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={`ai-${i}`}
                    className={`${config.bg} border ${config.border} rounded-xl p-4 flex items-start gap-3 border-l-2 border-l-[#C9A84C]/40`}
                  >
                    <Icon size={16} className={`${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${config.color}`}>{alert.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{alert.message}</p>
                    </div>
                    {alert.action_url && (
                      <button
                        onClick={() => router.push(alert.action_url)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#C9A84C] hover:text-[#e8c55a] transition-colors flex-shrink-0"
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
            <p className="text-xs text-zinc-600 italic mt-2">
              Passe Pro pour des insights IA supplementaires sur ton portefeuille.
            </p>
          )}
        </div>
      )}

      {!loaded && !loading && (
        <p className="text-sm text-zinc-600 italic">
          Clique sur &quot;Scanner mon portefeuille&quot; pour detecter les risques et opportunites.
        </p>
      )}
    </div>
  );
}
