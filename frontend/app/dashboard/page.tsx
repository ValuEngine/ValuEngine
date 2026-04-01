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
      <div className="animate-fade-in-up min-h-screen text-white px-6 py-8 md:px-10" style={{ background: "var(--bg-primary)" }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Bonjour {firstName} 👋
          </h1>
          <p className="text-sm mt-1 capitalize" style={{ color: "var(--text-secondary)" }}>{today}</p>
        </div>

        {/* Quick search */}
        <div className="rounded-2xl p-6 mb-8 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyser un titre</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex: AAPL, TSLA, MSFT..."
              className="flex-1 bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0d1117] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap hover:scale-[1.02]"
            >
              Analyser <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent analyses */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyses récentes</p>
          {recent.length === 0 ? (
            <div className="rounded-2xl p-8 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aucune analyse récente</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>Lancez votre première analyse ci-dessus</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((entry) => (
                <button
                  key={entry.ticker}
                  onClick={() => router.push(`/analyze?ticker=${entry.ticker}`)}
                  className="rounded-2xl p-5 text-left border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#C9A84C]/10 transition-all duration-200 group"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[#C9A84C] font-black text-lg">{entry.ticker}</p>
                      <p className="text-sm font-medium truncate max-w-[140px]" style={{ color: "var(--text-primary)" }}>{entry.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${verdictColor(entry.verdict)}`}>
                      {entry.verdict}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.date}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market overview */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">Marchés aujourd&apos;hui</p>
            <span className="text-[10px] border px-2 py-0.5 rounded-full" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
              Données indicatives
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {MARKET_DATA.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl p-5 border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#C9A84C]/10 transition-all"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>{m.label}</p>
                <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>{m.value}</p>
                <p className={`text-sm font-bold mt-1 ${m.up ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                  {m.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular tickers */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Tickers populaires</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => router.push(`/analyze?ticker=${t}`)}
                className="text-sm font-bold text-[#C9A84C] bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-xl hover:bg-[rgba(201,168,76,0.15)] hover:border-[rgba(201,168,76,0.4)] transition-all hover:scale-[1.02]"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunities section */}
        <section className="animate-fade-in-up">
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Opportunités détectées</h2>
          {watchlistLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
            </div>
          ) : watchlistData.length === 0 ? (
            <div className="rounded-xl p-6 border text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Chargement des données de marché...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* TOP 5 BUY */}
              <div className="rounded-xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[#3fb950] font-bold mb-3 flex items-center gap-2">
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
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{d.ticker}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>${d.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${d.upside >= 0 ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                          {d.upside >= 0 ? "+" : ""}{d.upside.toFixed(1)}%
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          d.verdict === "BUY" ? "bg-[#3fb950]/20 text-[#3fb950]" :
                          d.verdict === "SELL" ? "bg-[#f85149]/20 text-[#f85149]" :
                          "bg-[#C9A84C]/20 text-[#C9A84C]"
                        }`}>{d.verdict}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* TOP 5 SELL */}
              <div className="rounded-xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[#f85149] font-bold mb-3 flex items-center gap-2">
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
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{d.ticker}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>${d.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${d.upside >= 0 ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                          {d.upside >= 0 ? "+" : ""}{d.upside.toFixed(1)}%
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          d.verdict === "BUY" ? "bg-[#3fb950]/20 text-[#3fb950]" :
                          d.verdict === "SELL" ? "bg-[#f85149]/20 text-[#f85149]" :
                          "bg-[#C9A84C]/20 text-[#C9A84C]"
                        }`}>{d.verdict}</span>
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
