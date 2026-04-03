"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { analyzeStock, type AnalyzeResponse } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

const ALL_TICKERS = [
  "MC.PA", "TTE.PA", "BNP.PA", "AIR.PA", "SAN.PA", "OR.PA",
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA",
  "META", "JPM", "JNJ", "KO", "V", "NFLX", "AMD", "UBER",
];

const BATCH_SIZE = 4;

const DEFAULT_PARAMS = {
  growth_rate:     0.08,
  wacc:            0.09,
  terminal_growth: 0.03,
  horizon:         5,
};

type VerdictFilter = "all" | "BUY" | "HOLD" | "SELL";

interface ScreenerResult {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  pe: number | null;
  upside: number;
  verdict: string;
}

function verdictBadge(verdict: string) {
  if (verdict === "BUY") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />Sous-évalué
    </span>
  );
  if (verdict === "SELL") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
      <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />Surévalué
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />Juste valeur
    </span>
  );
}

function formatPrice(price: number, currency: string): string {
  if (currency === "EUR") return `${price.toFixed(2)} EUR`;
  return `$${price.toFixed(2)}`;
}

/** Process an array in batches of `size`, running each batch concurrently. */
async function processBatches<T>(
  items: T[],
  size: number,
  handler: (item: T, index: number) => Promise<void>,
): Promise<void> {
  for (let start = 0; start < items.length; start += size) {
    const batch = items.slice(start, start + size);
    await Promise.allSettled(
      batch.map((item, i) => handler(item, start + i)),
    );
  }
}

export default function ScreenerPage() {
  const router = useRouter();
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const abortRef = useRef(false);

  const handleScreen = useCallback(async () => {
    setIsLoading(true);
    setResults([]);
    setCompleted(0);
    setFailed(0);
    abortRef.current = false;

    await processBatches(ALL_TICKERS, BATCH_SIZE, async (ticker) => {
      if (abortRef.current) return;
      try {
        const data: AnalyzeResponse = await analyzeStock({ ticker, ...DEFAULT_PARAMS });
        const result: ScreenerResult = {
          ticker: data.company.ticker,
          name: data.company.name,
          sector: data.company.sector,
          price: data.company.price,
          currency: data.company.currency,
          pe: data.company.pe_ratio,
          upside: data.dcf.upside_pct,
          verdict: data.verdict,
        };
        setResults((prev) => [...prev, result]);
      } catch {
        setFailed((prev) => prev + 1);
      }
      setCompleted((prev) => prev + 1);
    });

    setIsLoading(false);
  }, []);

  const total = ALL_TICKERS.length;
  const sectors = ["all", ...Array.from(new Set(results.map((r) => r.sector)))];

  // Sort by upside descending, then apply filters
  const sorted = [...results].sort((a, b) => b.upside - a.upside);
  const filtered = sorted.filter((r) => {
    if (verdictFilter !== "all" && r.verdict !== verdictFilter) return false;
    if (sectorFilter !== "all" && r.sector !== sectorFilter) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Screener</h1>
          <p className="text-[#6b7d91] text-sm mt-1">
            Analyse automatique de {total} actions majeures (FR + US)
          </p>
        </div>

        {/* Launch / Relaunch buttons + filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-8">
          <button
            onClick={handleScreen}
            disabled={isLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-8 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Analyse en cours... {completed}/{total}</>
            ) : results.length > 0 ? (
              <><RefreshCw size={16} /> Relancer</>
            ) : (
              "Lancer le screening"
            )}
          </button>

          {results.length > 0 && (
            <>
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                className="bg-[#132032] border border-[rgba(201,168,76,0.2)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-all"
              >
                <option value="all">Tous les verdicts</option>
                <option value="BUY">Sous-évalué</option>
                <option value="HOLD">Juste valeur</option>
                <option value="SELL">Surévalué</option>
              </select>

              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-[#132032] border border-[rgba(201,168,76,0.2)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-all"
              >
                {sectors.map((s) => (
                  <option key={s} value={s}>{s === "all" ? "Tous les secteurs" : s}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Progress bar */}
        {isLoading && (
          <div className="mb-6">
            <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] rounded-full transition-all duration-300"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[#4a6070] mt-2">
              {completed}/{total} analyses complétées
              {failed > 0 && <span className="text-red-400 ml-2">({failed} échouée{failed > 1 ? "s" : ""})</span>}
            </p>
          </div>
        )}

        {/* Results table */}
        {filtered.length > 0 && (
          <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(201,168,76,0.05)]">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Ticker</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Nom</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Secteur</th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Prix</th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">P/E</th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Upside DCF</th>
                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.ticker}
                      onClick={() => router.push(`/analyze?ticker=${r.ticker}`)}
                      className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 text-[#C9A84C] font-black">{r.ticker}</td>
                      <td className="px-5 py-4 text-white text-sm max-w-[180px] truncate">{r.name}</td>
                      <td className="px-5 py-4 text-[#6b7d91] text-sm">{r.sector}</td>
                      <td className="px-5 py-4 text-right text-white font-semibold text-sm">{formatPrice(r.price, r.currency)}</td>
                      <td className="px-5 py-4 text-right text-white text-sm">{r.pe != null ? `${r.pe.toFixed(1)}x` : "N/A"}</td>
                      <td className={`px-5 py-4 text-right text-sm font-bold ${r.upside > 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                        {r.upside > 0 ? "+" : ""}{r.upside.toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 text-center">{verdictBadge(r.verdict)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
              <span className="text-3xl">📊</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Prêt à analyser</h2>
            <p className="text-[#4a6070] text-sm">
              Cliquez sur "Lancer le screening" pour analyser {total} actions populaires (FR + US)
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
