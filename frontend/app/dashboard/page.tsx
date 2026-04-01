"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface RecentEntry {
  ticker: string;
  name: string;
  verdict: string;
  date: string;
}

interface WatchlistEntry {
  ticker: string;
  name: string;
  verdict: string;
  upside: number;
  price: number;
}

const MARKET_DATA = [
  { label: "S&P 500",  value: "5,243.18", change: "+1.2%",  up: true },
  { label: "NASDAQ",   value: "16,432.73", change: "+0.8%", up: true },
  { label: "CAC 40",   value: "8,021.45",  change: "-0.3%", up: false },
  { label: "DAX",      value: "18,384.62", change: "+0.5%", up: true },
];

const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN"];

const WATCHLIST = ["AAPL","MSFT","NVDA","GOOGL","AMZN","TSLA","META","JPM","V","JNJ"];

function verdictColor(verdict: string) {
  if (verdict === "BUY")  return "bg-[rgba(63,185,80,0.12)] text-[#3fb950] border border-[rgba(63,185,80,0.25)]";
  if (verdict === "SELL") return "bg-[rgba(248,81,73,0.12)] text-[#f85149] border border-[rgba(248,81,73,0.25)]";
  return "bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]";
}

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [watchlistData, setWatchlistData] = useState<WatchlistEntry[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ve_recent");
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function fetchWatchlist() {
      setWatchlistLoading(true);
      const results: WatchlistEntry[] = [];
      for (const ticker of WATCHLIST) {
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, growth_rate: 0.08, wacc: 0.09, terminal_growth: 0.03, horizon: 5 }),
          });
          if (!res.ok) continue;
          const d = await res.json();
          results.push({
            ticker: d.company.ticker,
            name: d.company.name,
            verdict: d.verdict,
            upside: d.dcf.upside_pct,
            price: d.company.price,
          });
          await new Promise(r => setTimeout(r, 300));
        } catch { /* skip */ }
      }
      results.sort((a, b) => b.upside - a.upside);
      setWatchlistData(results);
      setWatchlistLoading(false);
    }
    fetchWatchlist();
  }, []);

  const handleSearch = () => {
    const sym = searchQuery.trim().toUpperCase();
    if (sym) router.push(`/analyze?ticker=${sym}`);
  };

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const firstName = user?.firstName || "Investisseur";

  if (!isLoaded || !isSignedIn) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="w-8 h-8 border-t-2 border-[#C9A84C] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-8 md:px-10">

        {/* Header */}
        <div className="mb-8 anim-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bonjour {firstName}
          </h1>
          <p className="text-sm mt-1 capitalize text-zinc-500">{today}</p>
        </div>

        {/* Quick search */}
        <div className="rounded-xl p-5 mb-8 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm hover:border-[#3f3f46] transition-colors anim-2">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyser un titre</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex: AAPL, TSLA, MSFT..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[rgba(201,168,76,0.5)] transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery}
              className="flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-5 py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Analyser <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent analyses */}
        <div className="mb-8 anim-3">
          <p className="text-xs font-bold uppercase tracking-[2px] text-zinc-500 mb-4">Analyses récentes</p>
          {recent.length === 0 ? (
            <div className="rounded-xl p-8 text-center border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm">
              <p className="text-sm text-zinc-500">Aucune analyse récente</p>
              <p className="text-xs mt-1 text-zinc-600">Lancez votre première analyse ci-dessus</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent.map((entry) => (
                <button
                  key={entry.ticker}
                  onClick={() => router.push(`/analyze?ticker=${entry.ticker}`)}
                  className="rounded-xl p-4 text-left border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm hover:border-[#3f3f46] transition-colors duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[#C9A84C] font-bold text-base">{entry.ticker}</p>
                      <p className="text-sm truncate max-w-[140px] text-zinc-300">{entry.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${verdictColor(entry.verdict)}`}>
                      {entry.verdict === "BUY" ? "Sous-évalué" : entry.verdict === "SELL" ? "Surévalué" : "Juste valeur"}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.date}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market overview */}
        <div className="mb-8 anim-4">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-[2px] text-zinc-500">Marchés aujourd&apos;hui</p>
            <span className="text-[10px] border border-zinc-800 text-zinc-600 px-2 py-0.5 rounded-full">
              Données indicatives
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MARKET_DATA.map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-4 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm hover:border-[#3f3f46] transition-colors duration-200"
              >
                <p className="text-xs font-medium mb-2 text-zinc-500">{m.label}</p>
                <p className="font-bold text-base text-white">{m.value}</p>
                <p className={`text-sm font-semibold mt-1 ${m.up ? "text-emerald-400" : "text-red-400"}`}>
                  {m.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular tickers */}
        <div className="mb-8 anim-5">
          <p className="text-xs font-bold uppercase tracking-[2px] text-zinc-500 mb-4">Tickers populaires</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => router.push(`/analyze?ticker=${t}`)}
                className="text-sm font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg hover:border-zinc-600 hover:text-white transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunities section */}
        <section>
          <h2 className="text-base font-bold mb-4 text-white">Opportunités détectées</h2>
          {watchlistLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
            </div>
          ) : watchlistData.length === 0 ? (
            <div className="rounded-xl p-6 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm text-center">
              <p className="text-sm text-zinc-500">Chargement des données de marché...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* TOP 5 BUY */}
              <div className="rounded-xl p-4 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm hover:border-[#3f3f46] transition-colors">
                <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                  <span>↑</span> Top 5 — Meilleures opportunités
                </h3>
                <div className="space-y-2">
                  {watchlistData.slice(0, 5).map(d => (
                    <div
                      key={d.ticker}
                      onClick={() => router.push(`/analyze?ticker=${d.ticker}`)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                    >
                      <div>
                        <span className="font-bold text-sm text-white">{d.ticker}</span>
                        <span className="text-xs ml-2 text-zinc-500">${d.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${d.upside >= 0 ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                          {d.upside >= 0 ? "+" : ""}{d.upside.toFixed(1)}%
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          d.verdict === "BUY" ? "bg-[#3fb950]/20 text-[#3fb950]" :
                          d.verdict === "SELL" ? "bg-[#f85149]/20 text-[#f85149]" :
                          "bg-[#C9A84C]/20 text-[#C9A84C]"
                        }`}>{d.verdict === "BUY" ? "Sous-évalué" : d.verdict === "SELL" ? "Surévalué" : "Juste valeur"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* TOP 5 SELL */}
              <div className="rounded-xl p-4 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm hover:border-[#3f3f46] transition-colors">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-sm">
                  <span>↓</span> Top 5 — À surveiller
                </h3>
                <div className="space-y-2">
                  {[...watchlistData].reverse().slice(0, 5).map(d => (
                    <div
                      key={d.ticker}
                      onClick={() => router.push(`/analyze?ticker=${d.ticker}`)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                    >
                      <div>
                        <span className="font-bold text-sm text-white">{d.ticker}</span>
                        <span className="text-xs ml-2 text-zinc-500">${d.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${d.upside >= 0 ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                          {d.upside >= 0 ? "+" : ""}{d.upside.toFixed(1)}%
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          d.verdict === "BUY" ? "bg-[#3fb950]/20 text-[#3fb950]" :
                          d.verdict === "SELL" ? "bg-[#f85149]/20 text-[#f85149]" :
                          "bg-[#C9A84C]/20 text-[#C9A84C]"
                        }`}>{d.verdict === "BUY" ? "Sous-évalué" : d.verdict === "SELL" ? "Surévalué" : "Juste valeur"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  );
}
