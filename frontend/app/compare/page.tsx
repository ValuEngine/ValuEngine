"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { analyzeStock, authedFetch, fmt, pct, type AnalyzeResponse } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { track } from "@/lib/analytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const DEFAULT_PARAMS = {
  growth_rate:     0.08,
  wacc:            0.09,
  terminal_growth: 0.03,
  horizon:         5,
};

const POPULAR_PAIRS = [
  ["AAPL", "MSFT"],
  ["MC.PA", "KER.PA"],
  ["NVDA", "AMD"],
  ["TTE.PA", "BP"],
  ["AMZN", "WMT"],
];

function verdictBadge(verdict: string) {
  if (verdict === "BUY") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(0,230,138,0.1)", color: "var(--color-success)", border: "1px solid rgba(0,230,138,0.2)" }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />Sous-evalué
    </span>
  );
  if (verdict === "SELL") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,84,112,0.1)", color: "var(--color-danger)", border: "1px solid rgba(255,84,112,0.2)" }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-danger)" }} />Surévalué
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,184,77,0.1)", color: "var(--color-warning)", border: "1px solid rgba(255,184,77,0.2)" }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-warning)" }} />Juste valeur
    </span>
  );
}

interface RowDef {
  label: string;
  getValue: (d: AnalyzeResponse) => number | null;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const ROWS: RowDef[] = [
  { label: "Prix actuel",         getValue: d => d.company.price,                    format: v => `$${v.toFixed(2)}`,             higherIsBetter: false },
  { label: "Capitalisation",          getValue: d => d.company.market_cap,               format: v => fmt(v),                          higherIsBetter: true  },
  { label: "P/E",                 getValue: d => d.company.pe_ratio,                 format: v => `${v.toFixed(1)}x`,              higherIsBetter: false },
  { label: "EV/EBITDA",           getValue: d => d.company.ev_ebitda,                format: v => `${v.toFixed(1)}x`,              higherIsBetter: false },
  { label: "Marge nette",         getValue: d => d.company.profit_margin,            format: v => pct(v),                          higherIsBetter: true  },
  { label: "Croissance CA",       getValue: d => d.company.revenue_growth,           format: v => pct(v),                          higherIsBetter: true  },
  { label: "Cash Flow Libre",                 getValue: d => d.company.free_cash_flow,           format: v => fmt(v),                          higherIsBetter: true  },
  { label: "Valeur intrinsèque DCF", getValue: d => d.dcf.intrinsic_value,           format: v => `$${v.toFixed(2)}`,             higherIsBetter: true  },
  { label: "Upside %",            getValue: d => d.dcf.upside_pct,                   format: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, higherIsBetter: true },
];

function CompareContent() {
  const router = useRouter();
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const [ticker1, setTicker1] = useState(searchParams.get("ticker1") || "");
  const [ticker2, setTicker2] = useState(searchParams.get("ticker2") || "");
  const [data1, setData1] = useState<AnalyzeResponse | null>(null);
  const [data2, setData2] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiComparison, setAiComparison] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const handleCompare = async (t1Override?: string, t2Override?: string) => {
    const t1 = (t1Override || ticker1).trim().toUpperCase();
    const t2 = (t2Override || ticker2).trim().toUpperCase();
    if (!t1 || !t2) { setError("Saisis deux tickers pour comparer."); return; }
    if (t1 === t2) { setError("Les deux tickers doivent être différents."); return; }
    setTicker1(t1);
    setTicker2(t2);
    setLoading(true);
    setError(null);
    setData1(null);
    setData2(null);
    setAiComparison(null);
    track("compare_started", { ticker1: t1, ticker2: t2 });
    try {
      const [r1, r2] = await Promise.all([
        analyzeStock({ ticker: t1, ...DEFAULT_PARAMS }),
        analyzeStock({ ticker: t2, ...DEFAULT_PARAMS }),
      ]);
      setData1(r1);
      setData2(r2);
      track("compare_completed", { ticker1: t1, ticker2: t2 });

      // Fetch AI comparison in background (Pro only)
      setAiLoading(true);
      try {
        const res = await authedFetch(
          `${API_BASE}/api/compare`,
          getToken,
          { method: "POST", body: JSON.stringify({ tickers: [t1, t2] }) },
        );
        if (res.ok) {
          const json = await res.json();
          if (json.ai_comparison) {
            setAiComparison(json.ai_comparison);
            setIsPro(true);
          }
        }
      } catch {
        // AI comparison is best-effort
      } finally {
        setAiLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Un des tickers est introuvable. Vérifiez les symboles saisis.");
    } finally {
      setLoading(false);
    }
  };

  const getBetter = (row: RowDef): 1 | 2 | null => {
    if (!data1 || !data2) return null;
    const v1 = row.getValue(data1);
    const v2 = row.getValue(data2);
    if (v1 == null || v2 == null) return null;
    if (v1 === v2) return null;
    if (row.higherIsBetter) return v1 > v2 ? 1 : 2;
    return v1 < v2 ? 1 : 2;
  };

  return (
    <AppLayout>
      <div className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8" style={{ color: "var(--text-primary)" }}>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Comparer deux titres</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Analyse côte à côte avec valorisation DCF</p>
        </div>

        {/* Inputs */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Ticker 1</label>
              <input
                type="text"
                value={ticker1}
                onChange={(e) => setTicker1(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="Ex: AAPL"
                className="w-full rounded-xl px-5 py-3 text-base sm:text-sm font-semibold focus:outline-none transition-all"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Ticker 2</label>
              <input
                type="text"
                value={ticker2}
                onChange={(e) => setTicker2(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="Ex: MSFT"
                className="w-full rounded-xl px-5 py-3 text-base sm:text-sm font-semibold focus:outline-none transition-all"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              onClick={() => handleCompare()}
              disabled={loading || !ticker1 || !ticker2}
              className="btn-primary flex items-center justify-center gap-2 font-bold px-6 sm:px-8 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto min-h-[44px]"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Analyse...</> : "Comparer"}
            </button>
          </div>
          {error && <p className="text-sm mt-4" style={{ color: "var(--color-danger)" }}>{error}</p>}
        </div>

        {/* Popular comparisons */}
        {!data1 && !data2 && !loading && (
          <div className="mb-8">
            <p className="text-sm font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Comparaisons populaires</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_PAIRS.map(([a, b]) => (
                <button
                  key={`${a}-${b}`}
                  onClick={() => handleCompare(a, b)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
                  style={{
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {a} vs {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {!data1 && !data2 && !loading && !error && (
          <div className="card rounded-2xl p-12 text-center">
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Entre deux tickers pour lancer la comparaison</p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Exemples : AAPL vs MSFT, MC.PA vs OR.PA, TSLA vs RIVN</p>
          </div>
        )}

        {/* Comparison Table */}
        {data1 && data2 && (
          <>
            <div className="card-highlight rounded-2xl overflow-x-auto mb-6">
              {/* Header */}
              <div className="grid grid-cols-3" style={{ background: "rgba(108,92,231,0.05)", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="px-4 sm:px-6 py-4 text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>Métrique</div>
                <button
                  onClick={() => router.push(`/analyze?ticker=${data1.company.ticker}`)}
                  className="px-4 sm:px-6 py-4 text-left transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,92,231,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <p className="font-black text-base sm:text-lg" style={{ color: "var(--accent-primary)" }}>{data1.company.ticker}</p>
                  <p className="text-xs font-medium truncate hidden sm:block" style={{ color: "var(--text-primary)" }}>{data1.company.name}</p>
                </button>
                <button
                  onClick={() => router.push(`/analyze?ticker=${data2.company.ticker}`)}
                  className="px-4 sm:px-6 py-4 text-left transition-colors"
                  style={{ background: "transparent", borderLeft: "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,92,231,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <p className="font-black text-base sm:text-lg" style={{ color: "var(--accent-primary)" }}>{data2.company.ticker}</p>
                  <p className="text-xs font-medium truncate hidden sm:block" style={{ color: "var(--text-primary)" }}>{data2.company.name}</p>
                </button>
              </div>

              {/* Rows */}
              {ROWS.map((row) => {
                const better = getBetter(row);
                const v1 = row.getValue(data1);
                const v2 = row.getValue(data2);
                return (
                  <div
                    key={row.label}
                    className="grid grid-cols-3 transition-colors last:border-0"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{row.label}</div>
                    <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold" style={{ color: better === 1 ? "var(--accent-primary)" : "var(--text-primary)" }}>
                      {v1 != null ? row.format(v1) : "N/A"}
                      {better === 1 && <span className="ml-1 text-[10px] font-black" style={{ color: "var(--accent-primary)" }}>&#9733;</span>}
                    </div>
                    <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold" style={{ color: better === 2 ? "var(--accent-primary)" : "var(--text-primary)", borderLeft: "1px solid var(--border-subtle)" }}>
                      {v2 != null ? row.format(v2) : "N/A"}
                      {better === 2 && <span className="ml-1 text-[10px] font-black" style={{ color: "var(--accent-primary)" }}>&#9733;</span>}
                    </div>
                  </div>
                );
              })}

              {/* Verdict row */}
              <div className="grid grid-cols-3" style={{ background: "rgba(108,92,231,0.03)", borderTop: "1px solid var(--border-subtle)" }}>
                <div className="px-4 sm:px-6 py-4 text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Verdict</div>
                <div className="px-4 sm:px-6 py-4">{verdictBadge(data1.verdict)}</div>
                <div className="px-4 sm:px-6 py-4" style={{ borderLeft: "1px solid var(--border-subtle)" }}>{verdictBadge(data2.verdict)}</div>
              </div>
            </div>

            {/* AI Comparative Analysis */}
            <div className="card p-6 mb-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">&#129302;</span>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Analyse comparative IA</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(240,200,80,0.15)", color: "var(--accent-gold)", border: "1px solid rgba(240,200,80,0.3)" }}>PRO</span>
              </div>

              {aiLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Génération de l&apos;analyse comparative...</p>
                </div>
              ) : aiComparison && isPro ? (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{aiComparison}</p>
              ) : (
                <div className="relative">
                  <p className="text-sm leading-relaxed blur-[6px] select-none pointer-events-none" style={{ color: "var(--text-tertiary)" }}>
                    L&apos;analyse comparative IA met en perspective les forces et faiblesses relatives de {data1.company.ticker} et {data2.company.ticker} en termes de valorisation, croissance et rentabilité. Elle identifie le titre le mieux positionné selon les métriques fondamentales et fournit une recommandation argumentée basée sur les données financières réelles.
                  </p>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Lock size={20} className="mb-2" style={{ color: "var(--accent-gold)" }} />
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>Fonctionnalité Pro</p>
                    <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Débloquez l&apos;analyse comparative IA</p>
                    <button
                      onClick={() => router.push("/#pricing")}
                      className="btn-pro text-xs font-bold px-4 py-2 rounded-lg transition-all"
                    >
                      Passer Pro
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CTA — Analyse complète */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/analyze?ticker=${data1.company.ticker}`)}
                className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-all"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  color: "var(--accent-primary)",
                }}
              >
                Analyse complète {data1.company.ticker} <ArrowRight size={14} />
              </button>
              <button
                onClick={() => router.push(`/analyze?ticker=${data2.company.ticker}`)}
                className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-all"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  color: "var(--accent-primary)",
                }}
              >
                Analyse complète {data2.company.ticker} <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex items-center justify-center min-h-screen"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} /></div></AppLayout>}>
      <CompareContent />
    </Suspense>
  );
}
