"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Loader2, TrendingUp, TrendingDown, Calendar, DollarSign, Clock } from "lucide-react";
import { authedFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface BacktestResult {
  ticker: string;
  buy_date: string;
  sell_date: string;
  buy_price: number;
  sell_price: number;
  amount_invested: number;
  shares: number;
  final_value: number;
  pnl: number;
  pnl_pct: number;
  days_held: number;
  annualized_return: number;
  sp500_pnl_pct: number | null;
  max_drawdown: number;
  volatility_annual: number | null;
  total_dividends: number;
  dividend_events: { date: string; per_share: number; total: number }[];
  total_return_with_dividends: number;
  total_return_pct_with_dividends: number;
  chart_data: { date: string; price: number; value: number; pnl_pct: number }[];
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function BacktestContent() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  const [ticker, setTicker] = useState(searchParams.get("ticker") || "");
  const [buyDate, setBuyDate] = useState("");
  const [amount, setAmount] = useState("");
  const [sellDate, setSellDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    if (!ticker.trim() || !buyDate || !amount) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await authedFetch(`${API_BASE}/api/backtest`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          buy_date: buyDate,
          amount: parseFloat(amount),
          sell_date: sellDate || undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || "Erreur lors du backtest");
      }

      const data: BacktestResult = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const isPositive = result ? result.pnl >= 0 : false;
  const pnlColorVar = isPositive ? "var(--color-success)" : "var(--color-danger)";

  // Simple sparkline from chart data
  const renderSparkline = () => {
    if (!result || result.chart_data.length < 2) return null;
    const values = result.chart_data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 600;
    const h = 120;

    const points = result.chart_data
      .map((d, i) => {
        const x = (i / (result.chart_data.length - 1)) * w;
        const y = h - ((d.value - min) / range) * (h - 10) - 5;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pnlColorVar} stopOpacity="0.25" />
            <stop offset="100%" stopColor={pnlColorVar} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#sparkGrad)" />
        <polyline
          points={points}
          fill="none"
          stroke={pnlColorVar}
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <AppLayout>
      <div
        className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl animate-in"
        style={{ color: "var(--text-primary)" }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Backtest de Conviction
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Et si tu avais investi... Simule tes decisions passees.
          </p>
        </div>

        {/* Input form */}
        <div className="card p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-[13px] font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Ticker
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ex: AAPL, MC.PA, TSLA"
                className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-default)")
                }
              />
            </div>
            <div>
              <label
                className="block text-[13px] font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Montant investi ($)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 10000"
                min="1"
                className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-default)")
                }
              />
            </div>
            <div>
              <label
                className="block text-[13px] font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Date d&apos;achat
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                min="2000-01-01"
                className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  colorScheme: "dark",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-default)")
                }
              />
            </div>
            <div>
              <label
                className="block text-[13px] font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Date de vente (optionnel)
              </label>
              <input
                type="date"
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                  colorScheme: "dark",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-default)")
                }
              />
              <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
                Laisse vide = aujourd&apos;hui
              </p>
            </div>
          </div>

          <button
            onClick={runBacktest}
            disabled={loading || !ticker.trim() || !buyDate || !amount}
            className="btn-primary mt-5 w-full sm:w-auto px-8 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Simulation...
              </>
            ) : (
              "Lancer le backtest"
            )}
          </button>

          {error && (
            <div
              className="rounded-xl p-3 mt-4"
              style={{
                background: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-in">
            {/* Hero result */}
            <div
              className="card p-8 text-center"
              style={{
                borderColor: isPositive
                  ? "color-mix(in srgb, var(--color-success) 25%, transparent)"
                  : "color-mix(in srgb, var(--color-danger) 25%, transparent)",
              }}
            >
              <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Si tu avais investi {formatCurrency(result.amount_invested)} dans {result.ticker}
              </p>
              <p
                className="text-4xl sm:text-5xl font-black"
                style={{ color: pnlColorVar }}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(result.pnl)}
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: pnlColorVar }}>
                {isPositive ? "+" : ""}
                {result.pnl_pct.toFixed(1)}%
              </p>
              <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
                {formatCurrency(result.amount_invested)} → {formatCurrency(result.final_value)}
              </p>
              {result.total_dividends > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    dont <span className="font-bold" style={{ color: "var(--color-success)" }}>{formatCurrency(result.total_dividends)}</span> de dividendes
                    ({result.dividend_events.length} versement{result.dividend_events.length > 1 ? "s" : ""})
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                    Rendement total avec dividendes : <span className="font-bold" style={{ color: pnlColorVar }}>{result.total_return_pct_with_dividends >= 0 ? "+" : ""}{result.total_return_pct_with_dividends.toFixed(1)}%</span>
                  </p>
                </div>
              )}
            </div>

            {/* Chart */}
            {result.chart_data.length >= 2 && (
              <div className="card p-6">
                <h3
                  className="text-[13px] font-medium mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Evolution de la valeur
                </h3>
                {renderSparkline()}
                <div
                  className="flex justify-between text-[13px] font-medium mt-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <span>{result.chart_data[0]?.date}</span>
                  <span>{result.chart_data[result.chart_data.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Prix achat */}
              <div className="card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={13} style={{ color: "var(--text-tertiary)" }} />
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    Prix achat
                  </p>
                </div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ${result.buy_price.toFixed(2)}
                </p>
              </div>

              {/* Prix vente */}
              <div className="card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  {isPositive ? (
                    <TrendingUp size={13} style={{ color: "var(--color-success)" }} />
                  ) : (
                    <TrendingDown size={13} style={{ color: "var(--color-danger)" }} />
                  )}
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    Prix vente
                  </p>
                </div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ${result.sell_price.toFixed(2)}
                </p>
              </div>

              {/* Duree */}
              <div className="card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={13} style={{ color: "var(--text-tertiary)" }} />
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    Duree
                  </p>
                </div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {result.days_held}j
                </p>
                <p className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {(result.days_held / 365.25).toFixed(1)} ans
                </p>
              </div>

              {/* Rdt annualise */}
              <div className="card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={13} style={{ color: "var(--text-tertiary)" }} />
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    Rdt annualise
                  </p>
                </div>
                <p
                  className="text-lg font-bold"
                  style={{
                    color:
                      result.annualized_return >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                  }}
                >
                  {result.annualized_return >= 0 ? "+" : ""}
                  {result.annualized_return.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Risk metrics — Max Drawdown + Volatility */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Max Drawdown
                </p>
                <p className="text-lg font-bold" style={{ color: "var(--color-danger)" }}>
                  {result.max_drawdown.toFixed(1)}%
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Pire baisse pic-à-creux</p>
              </div>
              {result.volatility_annual !== null && (
                <div className="card p-4">
                  <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Volatilité annualisée
                  </p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-info)" }}>
                    {result.volatility_annual}%
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Écart-type × √252</p>
                </div>
              )}
            </div>

            {/* Dividend details */}
            {result.dividend_events && result.dividend_events.length > 0 && (
              <div className="card p-6">
                <h3 className="text-[13px] font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
                  Dividendes reçus ({result.dividend_events.length})
                </h3>
                <div className="space-y-2">
                  {result.dividend_events.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--border-subtle)" }}>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{d.date}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>${d.per_share}/action</span>
                        <span className="text-sm font-bold" style={{ color: "var(--color-success)" }}>+{formatCurrency(d.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border-default)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Total dividendes</span>
                  <span className="text-sm font-bold" style={{ color: "var(--color-success)" }}>+{formatCurrency(result.total_dividends)}</span>
                </div>
              </div>
            )}

            {/* VS S&P 500 */}
            {result.sp500_pnl_pct !== null && (
              <div className="card p-6">
                <h3
                  className="text-[13px] font-medium mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  vs S&amp;P 500 sur la meme periode
                </h3>
                <div className="flex items-center gap-6">
                  {/* Ticker bar */}
                  <div className="flex-1">
                    <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      {result.ticker}
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 rounded-full h-3"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(Math.max(result.pnl_pct + 50, 0), 100)}%`,
                            background:
                              result.pnl_pct >= 0
                                ? "var(--color-success)"
                                : "var(--color-danger)",
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            result.pnl_pct >= 0
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                        }}
                      >
                        {result.pnl_pct >= 0 ? "+" : ""}
                        {result.pnl_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* S&P 500 bar */}
                  <div className="flex-1">
                    <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      S&amp;P 500
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 rounded-full h-3"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(Math.max(result.sp500_pnl_pct + 50, 0), 100)}%`,
                            background:
                              result.sp500_pnl_pct >= 0
                                ? "var(--color-info)"
                                : "var(--color-danger)",
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            result.sp500_pnl_pct >= 0
                              ? "var(--color-info)"
                              : "var(--color-danger)",
                        }}
                      >
                        {result.sp500_pnl_pct >= 0 ? "+" : ""}
                        {result.sp500_pnl_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] font-medium mt-3" style={{ color: "var(--text-tertiary)" }}>
                  {result.pnl_pct > result.sp500_pnl_pct
                    ? `${result.ticker} a surperformé le S&P 500 de ${(result.pnl_pct - result.sp500_pnl_pct).toFixed(1)} points`
                    : `Le S&P 500 a surperformé ${result.ticker} de ${(result.sp500_pnl_pct - result.pnl_pct).toFixed(1)} points`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "color-mix(in srgb, var(--accent-primary) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)",
              }}
            >
              <TrendingUp size={28} style={{ color: "var(--accent-primary)" }} />
            </div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Simule tes decisions passees
            </h2>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ color: "var(--text-tertiary)" }}
            >
              Choisis un ticker, une date et un montant pour voir combien tu aurais gagne (ou perdu).
              Compare avec le S&amp;P 500 pour mesurer ta surperformance.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function BacktestPage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex items-center justify-center min-h-screen"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} /></div></AppLayout>}>
      <BacktestContent />
    </Suspense>
  );
}
