"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
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
  chart_data: { date: string; price: number; value: number; pnl_pct: number }[];
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default function BacktestPage() {
  const { getToken } = useAuth();

  const [ticker, setTicker] = useState("");
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
  const pnlColor = isPositive ? "text-[#00d4aa]" : "text-[#ff4d6d]";

  // Simple sparkline from chart data
  const renderSparkline = () => {
    if (!result || result.chart_data.length < 2) return null;
    const values = result.chart_data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 600;
    const h = 120;

    const points = result.chart_data.map((d, i) => {
      const x = (i / (result.chart_data.length - 1)) * w;
      const y = h - ((d.value - min) / range) * (h - 10) - 5;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? "#00d4aa" : "#ff4d6d"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? "#00d4aa" : "#ff4d6d"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${h} ${points} ${w},${h}`}
          fill="url(#sparkGrad)"
        />
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#00d4aa" : "#ff4d6d"}
          strokeWidth="2"
        />
      </svg>
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Backtest de Conviction</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Et si tu avais investi... Simule tes decisions passees.
          </p>
        </div>

        {/* Input form */}
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Ticker
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ex: AAPL, MC.PA, TSLA"
                className="w-full bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Montant investi ($)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 10000"
                min="1"
                className="w-full bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Date d&apos;achat
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                min="2000-01-01"
                className="w-full bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Date de vente (optionnel)
              </label>
              <input
                type="date"
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
              <p className="text-[10px] text-zinc-600 mt-1">Laisse vide = aujourd&apos;hui</p>
            </div>
          </div>

          <button
            onClick={runBacktest}
            disabled={loading || !ticker.trim() || !buyDate || !amount}
            className="mt-5 w-full sm:w-auto bg-[#C9A84C] text-black font-bold px-8 py-3 rounded-xl text-sm hover:bg-[#e8c55a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-xl p-3 mt-4">
              <p className="text-[#ff4d6d] text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Hero result */}
            <div className={`bg-[#18181b]/80 backdrop-blur-sm border rounded-2xl p-8 text-center ${
              isPositive ? "border-[#00d4aa]/20" : "border-[#ff4d6d]/20"
            }`}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Si tu avais investi {formatCurrency(result.amount_invested)} dans {result.ticker}
              </p>
              <p className={`text-4xl sm:text-5xl font-black ${pnlColor}`}>
                {isPositive ? "+" : ""}{formatCurrency(result.pnl)}
              </p>
              <p className={`text-xl font-bold mt-1 ${pnlColor}`}>
                {isPositive ? "+" : ""}{result.pnl_pct.toFixed(1)}%
              </p>
              <p className="text-sm text-zinc-500 mt-3">
                {formatCurrency(result.amount_invested)} → {formatCurrency(result.final_value)}
              </p>
            </div>

            {/* Chart */}
            {result.chart_data.length >= 2 && (
              <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                  Evolution de la valeur
                </h3>
                {renderSparkline()}
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>{result.chart_data[0]?.date}</span>
                  <span>{result.chart_data[result.chart_data.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={12} className="text-zinc-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prix achat</p>
                </div>
                <p className="text-lg font-bold text-white">${result.buy_price.toFixed(2)}</p>
              </div>
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  {isPositive ? <TrendingUp size={12} className="text-[#00d4aa]" /> : <TrendingDown size={12} className="text-[#ff4d6d]" />}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prix vente</p>
                </div>
                <p className="text-lg font-bold text-white">${result.sell_price.toFixed(2)}</p>
              </div>
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={12} className="text-zinc-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Duree</p>
                </div>
                <p className="text-lg font-bold text-white">{result.days_held}j</p>
                <p className="text-xs text-zinc-600">{(result.days_held / 365.25).toFixed(1)} ans</p>
              </div>
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={12} className="text-zinc-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Rdt annualise</p>
                </div>
                <p className={`text-lg font-bold ${result.annualized_return >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                  {result.annualized_return >= 0 ? "+" : ""}{result.annualized_return.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* VS S&P 500 */}
            {result.sp500_pnl_pct !== null && (
              <div className="bg-[#18181b]/80 border border-[#27272a] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                  vs S&amp;P 500 sur la meme periode
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">{result.ticker}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#27272a] rounded-full h-3">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(Math.max(result.pnl_pct + 50, 0), 100)}%`,
                            backgroundColor: result.pnl_pct >= 0 ? "#00d4aa" : "#ff4d6d",
                          }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${result.pnl_pct >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                        {result.pnl_pct >= 0 ? "+" : ""}{result.pnl_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">S&amp;P 500</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#27272a] rounded-full h-3">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(Math.max(result.sp500_pnl_pct + 50, 0), 100)}%`,
                            backgroundColor: result.sp500_pnl_pct >= 0 ? "#818cf8" : "#ff4d6d",
                          }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${result.sp500_pnl_pct >= 0 ? "text-[#818cf8]" : "text-[#ff4d6d]"}`}>
                        {result.sp500_pnl_pct >= 0 ? "+" : ""}{result.sp500_pnl_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 mt-3">
                  {result.pnl_pct > result.sp500_pnl_pct
                    ? `${result.ticker} a surperformé le S&P 500 de ${(result.pnl_pct - result.sp500_pnl_pct).toFixed(1)} points`
                    : `Le S&P 500 a surperformé ${result.ticker} de ${(result.sp500_pnl_pct - result.pnl_pct).toFixed(1)} points`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={28} className="text-[#C9A84C]" />
            </div>
            <h2 className="text-lg font-bold text-zinc-300 mb-2">Simule tes decisions passees</h2>
            <p className="text-sm text-zinc-600 max-w-md mx-auto">
              Choisis un ticker, une date et un montant pour voir combien tu aurais gagne (ou perdu).
              Compare avec le S&amp;P 500 pour mesurer ta surperformance.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
