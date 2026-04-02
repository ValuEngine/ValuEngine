"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { analyzeStock, fmt, pct, type AnalyzeResponse } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

const DEFAULT_PARAMS = {
  growth_rate:     0.08,
  wacc:            0.09,
  terminal_growth: 0.03,
  horizon:         5,
};

function verdictBadge(verdict: string) {
  if (verdict === "BUY") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Sous-évalué
    </span>
  );
  if (verdict === "SELL") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />Surévalué
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />Juste valeur
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
  { label: "Market Cap",          getValue: d => d.company.market_cap,               format: v => fmt(v),                          higherIsBetter: true  },
  { label: "P/E",                 getValue: d => d.company.pe_ratio,                 format: v => `${v.toFixed(1)}x`,              higherIsBetter: false },
  { label: "EV/EBITDA",           getValue: d => d.company.ev_ebitda,                format: v => `${v.toFixed(1)}x`,              higherIsBetter: false },
  { label: "Marge nette",         getValue: d => d.company.profit_margin,            format: v => pct(v),                          higherIsBetter: true  },
  { label: "Croissance CA",       getValue: d => d.company.revenue_growth,           format: v => pct(v),                          higherIsBetter: true  },
  { label: "FCF",                 getValue: d => d.company.free_cash_flow,           format: v => fmt(v),                          higherIsBetter: true  },
  { label: "Valeur intrinsèque DCF", getValue: d => d.dcf.intrinsic_value,           format: v => `$${v.toFixed(2)}`,             higherIsBetter: true  },
  { label: "Upside %",            getValue: d => d.dcf.upside_pct,                   format: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, higherIsBetter: true },
];

export default function ComparePage() {
  const router = useRouter();
  const [ticker1, setTicker1] = useState("");
  const [ticker2, setTicker2] = useState("");
  const [data1, setData1] = useState<AnalyzeResponse | null>(null);
  const [data2, setData2] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    const t1 = ticker1.trim().toUpperCase();
    const t2 = ticker2.trim().toUpperCase();
    if (!t1 || !t2) { setError("Veuillez saisir deux tickers."); return; }
    if (t1 === t2) { setError("Les deux tickers doivent être différents."); return; }
    setLoading(true);
    setError(null);
    setData1(null);
    setData2(null);
    try {
      const [r1, r2] = await Promise.all([
        analyzeStock({ ticker: t1, ...DEFAULT_PARAMS }),
        analyzeStock({ ticker: t2, ...DEFAULT_PARAMS }),
      ]);
      setData1(r1);
      setData2(r2);
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
      <div className="min-h-screen text-white px-6 py-8 md:px-10">

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Comparer deux titres</h1>
          <p className="text-[#6b7d91] text-sm mt-1">Analyse côte à côte avec valorisation DCF</p>
        </div>

        {/* Inputs */}
        <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">Ticker 1</label>
              <input
                type="text"
                value={ticker1}
                onChange={(e) => setTicker1(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="Ex: AAPL"
                className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">Ticker 2</label>
              <input
                type="text"
                value={ticker2}
                onChange={(e) => setTicker2(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="Ex: MSFT"
                className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
              />
            </div>
            <button
              onClick={handleCompare}
              disabled={loading || !ticker1 || !ticker2}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-8 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Analyse...</> : "Comparer"}
            </button>
          </div>
          {error && <p className="text-[#ff4d6d] text-sm mt-4">{error}</p>}
        </div>

        {!data1 && !data2 && !loading && !error && (
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm p-12 text-center">
            <p className="text-zinc-400 text-sm mb-2">Entre deux tickers pour lancer la comparaison</p>
            <p className="text-zinc-600 text-xs">Exemples : AAPL vs MSFT, MC.PA vs OR.PA, TSLA vs RIVN</p>
          </div>
        )}

        {/* Comparison Table */}
        {data1 && data2 && (
          <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-[rgba(201,168,76,0.05)] border-b border-[rgba(201,168,76,0.12)]">
              <div className="px-6 py-4 text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Métrique</div>
              <button
                onClick={() => router.push(`/analyze?ticker=${data1.company.ticker}`)}
                className="px-6 py-4 text-left hover:bg-[rgba(201,168,76,0.05)] transition-colors"
              >
                <p className="text-[#C9A84C] font-black text-lg">{data1.company.ticker}</p>
                <p className="text-white text-xs font-medium truncate">{data1.company.name}</p>
              </button>
              <button
                onClick={() => router.push(`/analyze?ticker=${data2.company.ticker}`)}
                className="px-6 py-4 text-left hover:bg-[rgba(201,168,76,0.05)] transition-colors border-l border-[rgba(255,255,255,0.04)]"
              >
                <p className="text-[#C9A84C] font-black text-lg">{data2.company.ticker}</p>
                <p className="text-white text-xs font-medium truncate">{data2.company.name}</p>
              </button>
            </div>

            {/* Rows */}
            {ROWS.map((row) => {
              const better = getBetter(row);
              const v1 = row.getValue(data1);
              const v2 = row.getValue(data2);
              return (
                <div key={row.label} className="grid grid-cols-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="px-6 py-4 text-sm text-[#6b7d91] font-medium">{row.label}</div>
                  <div className={`px-6 py-4 text-sm font-bold ${better === 1 ? "text-[#C9A84C]" : "text-white"}`}>
                    {v1 != null ? row.format(v1) : "N/A"}
                    {better === 1 && <span className="ml-1 text-[10px] font-black text-[#C9A84C]">★</span>}
                  </div>
                  <div className={`px-6 py-4 text-sm font-bold border-l border-[rgba(255,255,255,0.04)] ${better === 2 ? "text-[#C9A84C]" : "text-white"}`}>
                    {v2 != null ? row.format(v2) : "N/A"}
                    {better === 2 && <span className="ml-1 text-[10px] font-black text-[#C9A84C]">★</span>}
                  </div>
                </div>
              );
            })}

            {/* Verdict row */}
            <div className="grid grid-cols-3 bg-[rgba(201,168,76,0.03)] border-t border-[rgba(201,168,76,0.12)]">
              <div className="px-6 py-4 text-sm text-[#6b7d91] font-bold uppercase tracking-wider">Verdict</div>
              <div className="px-6 py-4">{verdictBadge(data1.verdict)}</div>
              <div className="px-6 py-4 border-l border-[rgba(255,255,255,0.04)]">{verdictBadge(data2.verdict)}</div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
