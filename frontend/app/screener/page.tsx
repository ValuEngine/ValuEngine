"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { analyzeStock, pct, type AnalyzeResponse } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

const ALL_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META",
  "NVDA", "TSLA", "JPM",  "V",    "JNJ",
  "KO",   "WMT",  "DIS",  "NFLX", "PYPL",
  "ADBE", "CRM",  "INTC", "AMD",  "UBER",
];

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
  pe: number | null;
  upside: number;
  verdict: string;
}

function verdictBadge(verdict: string) {
  if (verdict === "BUY")  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[rgba(0,212,170,0.12)] text-[#00d4aa] border border-[rgba(0,212,170,0.25)]">BUY</span>;
  if (verdict === "SELL") return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[rgba(255,77,109,0.12)] text-[#ff4d6d] border border-[rgba(255,77,109,0.25)]">SELL</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]">HOLD</span>;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function ScreenerPage() {
  const router = useRouter();
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");

  const handleScreen = async () => {
    setIsLoading(true);
    setResults([]);
    setProgress(0);
    const collected: ScreenerResult[] = [];

    for (let i = 0; i < ALL_TICKERS.length; i++) {
      const t = ALL_TICKERS[i];
      try {
        const data: AnalyzeResponse = await analyzeStock({ ticker: t, ...DEFAULT_PARAMS });
        collected.push({
          ticker: data.company.ticker,
          name:   data.company.name,
          sector: data.company.sector,
          price:  data.company.price,
          pe:     data.company.pe_ratio,
          upside: data.dcf.upside_pct,
          verdict: data.verdict,
        });
        setResults([...collected]);
      } catch {
        // skip failed ticker
      }
      setProgress(i + 1);
      if (i < ALL_TICKERS.length - 1) await sleep(300);
    }
    setIsLoading(false);
  };

  const sectors = ["all", ...Array.from(new Set(results.map(r => r.sector)))];

  const filtered = results.filter(r => {
    if (verdictFilter !== "all" && r.verdict !== verdictFilter) return false;
    if (sectorFilter !== "all" && r.sector !== sectorFilter) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#0a1628] text-white px-6 py-8 md:px-10">

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Screener</h1>
          <p className="text-[#6b7d91] text-sm mt-1">Analyse automatique de 20 actions majeures</p>
        </div>

        {/* Launch button */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <button
            onClick={handleScreen}
            disabled={isLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-8 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Analyse en cours... {progress}/{ALL_TICKERS.length}</>
            ) : (
              "Lancer le screening"
            )}
          </button>

          {results.length > 0 && !isLoading && (
            <>
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                className="bg-[#132032] border border-[rgba(201,168,76,0.2)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-all"
              >
                <option value="all">Tous les verdicts</option>
                <option value="BUY">BUY</option>
                <option value="HOLD">HOLD</option>
                <option value="SELL">SELL</option>
              </select>

              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-[#132032] border border-[rgba(201,168,76,0.2)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-all"
              >
                {sectors.map(s => (
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
                style={{ width: `${(progress / ALL_TICKERS.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[#4a6070] mt-2">{progress}/{ALL_TICKERS.length} tickers analysés</p>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="bg-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
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
                      <td className="px-5 py-4 text-right text-white font-semibold text-sm">${r.price.toFixed(2)}</td>
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

        {!isLoading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
              <span className="text-3xl">📊</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Prêt à analyser</h2>
            <p className="text-[#4a6070] text-sm">Cliquez sur &quot;Lancer le screening&quot; pour analyser 20 actions populaires</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
