"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Plus, X, Loader2, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { warmupBackend } from "@/lib/api";

interface RecentEntry {
  ticker: string;
  name: string;
  verdict: string;
  date: string;
}

interface WatchlistItem {
  ticker: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  verdict: string | null;
}

interface MarketItem {
  label: string;
  value: string;
  change: string;
  up: boolean;
}

const MARKET_FALLBACK: MarketItem[] = [
  { label: "S&P 500", value: "—", change: "—", up: true },
  { label: "NASDAQ",  value: "—", change: "—", up: true },
  { label: "CAC 40",  value: "—", change: "—", up: true },
  { label: "DAX",     value: "—", change: "—", up: true },
];

const POPULAR_TICKERS = ["MC.PA", "AAPL", "TTE.PA", "TSLA", "BNP.PA", "NVDA"];

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
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0 = hidden
  const [onboardingTicker, setOnboardingTicker] = useState("");

  // Warmup backend Railway dès l'arrivée sur le dashboard
  useEffect(() => { warmupBackend(); }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ve_recent");
      if (stored) setRecent(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Onboarding: show if user created < 5min ago
  useEffect(() => {
    if (!user) return;
    const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    const fiveMin = 5 * 60 * 1000;
    const seen = localStorage.getItem("ve_onboarding_done");
    if (!seen && Date.now() - created < fiveMin) {
      setOnboardingStep(1);
    }
  }, [user]);

  const fetchWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const r = await fetch("/api/db/watchlist");
      if (r.ok) setWatchlistItems(await r.json());
    } catch { /* ignore */ }
    setWatchlistLoading(false);
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const handleAddTicker = async () => {
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    setAddLoading(true);
    setAddError("");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const searchRes = await fetch(`${API_BASE}/api/search/${sym}`);
      if (!searchRes.ok) { setAddError("Ticker introuvable"); setAddLoading(false); return; }
      const info = await searchRes.json();
      const addRes = await fetch("/api/db/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: sym, company_name: info.name }),
      });
      if (!addRes.ok) {
        const err = await addRes.json();
        setAddError(err.error || "Erreur lors de l'ajout");
        setAddLoading(false);
        return;
      }
      setAddInput("");
      setShowAddInput(false);
      fetchWatchlist();
    } catch { setAddError("Erreur réseau"); }
    setAddLoading(false);
  };

  const handleRemoveTicker = async (ticker: string) => {
    setWatchlistItems(prev => prev.filter(i => i.ticker !== ticker));
    await fetch("/api/db/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_BASE}/api/market-overview`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: MarketItem[]) => setMarketData(data))
      .catch(() => setMarketData(MARKET_FALLBACK))
      .finally(() => { clearTimeout(timeout); setMarketLoading(false); });
    return () => { clearTimeout(timeout); controller.abort(); };
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
              <p className="text-xs mt-1 text-zinc-600">Lance ta première analyse ci-dessus</p>
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
            {marketLoading ? (
              <span className="text-[10px] border border-zinc-800 text-zinc-600 px-2 py-0.5 rounded-full">
                Chargement...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {marketLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))
            ) : (marketData.length > 0 ? marketData : MARKET_FALLBACK).map((m) => (
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

        {/* Watchlist section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Ma Watchlist</h2>
            <button
              onClick={() => { setShowAddInput(v => !v); setAddError(""); setAddInput(""); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#C9A84C] border border-[rgba(201,168,76,0.3)] px-3 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>

          {/* Add input */}
          {showAddInput && (
            <div className="mb-4 flex gap-2 items-start">
              <div className="flex-1">
                <input
                  autoFocus
                  type="text"
                  value={addInput}
                  onChange={e => { setAddInput(e.target.value.toUpperCase()); setAddError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAddTicker()}
                  placeholder="Ex: MC.PA, AAPL, TSLA..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[rgba(201,168,76,0.5)] transition-all"
                />
                {addError && <p className="text-xs text-red-400 mt-1">{addError}</p>}
              </div>
              <button
                onClick={handleAddTicker}
                disabled={addLoading || !addInput}
                className="flex items-center gap-1.5 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-4 py-2.5 rounded-lg transition-all disabled:opacity-40 whitespace-nowrap text-sm"
              >
                {addLoading ? <Loader2 size={14} className="animate-spin" /> : "Valider"}
              </button>
              <button
                onClick={() => { setShowAddInput(false); setAddInput(""); setAddError(""); }}
                className="p-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Watchlist content */}
          {watchlistLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : watchlistItems.length === 0 ? (
            <div className="rounded-xl p-8 border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm text-center">
              <p className="text-sm text-zinc-400 mb-1">Ajoute tes premiers tickers à suivre</p>
              <p className="text-xs text-zinc-600">Clique sur “Ajouter” pour commencer</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm overflow-hidden">
              {watchlistItems.map((item, i) => (
                <div
                  key={item.ticker}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors ${i < watchlistItems.length - 1 ? "border-b border-[#27272a]" : ""}`}
                >
                  {/* Left: ticker + name */}
                  <button
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                    onClick={() => router.push(`/analyze?ticker=${item.ticker}`)}
                  >
                    <span className="text-[#C9A84C] font-bold text-sm w-14 flex-shrink-0">{item.ticker}</span>
                    <span className="text-zinc-400 text-xs truncate">{item.name}</span>
                  </button>

                  {/* Right: price + change + verdict + remove */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.price != null ? (
                      <>
                        <span className="text-sm font-semibold text-white">${item.price.toFixed(2)}</span>
                        <span className={`text-xs font-bold ${(item.change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {(item.change_pct ?? 0) >= 0 ? "+" : ""}{(item.change_pct ?? 0).toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                    {item.verdict && (
                      <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.verdict === "BUY"  ? "bg-emerald-500/15 text-emerald-400" :
                        item.verdict === "SELL" ? "bg-red-500/15 text-red-400" :
                        "bg-[#C9A84C]/15 text-[#C9A84C]"
                      }`}>
                        {item.verdict === "BUY" ? "Sous-évalué" : item.verdict === "SELL" ? "Surévalué" : "Juste valeur"}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTicker(item.ticker)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                      aria-label={`Supprimer ${item.ticker}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ── Onboarding Modal ──────────────────────────────────────── */}
      {onboardingStep > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#18181b]/95 backdrop-blur-md border border-[#27272a] rounded-2xl max-w-md w-full p-8 shadow-2xl">
            {onboardingStep === 1 && (
              <>
                <p className="text-2xl font-bold mb-2">Bienvenue sur ValuEngine</p>
                <p className="text-zinc-400 text-sm mb-6">Entre le ticker de ta première action à analyser.</p>
                <div className="flex gap-2 mb-4">
                  <input
                    autoFocus value={onboardingTicker}
                    onChange={e => setOnboardingTicker(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && setOnboardingStep(2)}
                    placeholder="Ex: AAPL, MC.PA..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[rgba(201,168,76,0.5)]"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["AAPL", "MC.PA", "MSFT"].map(t => (
                    <button key={t} onClick={() => { setOnboardingTicker(t); setOnboardingStep(2); }} className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400 hover:border-zinc-600 hover:text-white transition-all">{t}</button>
                  ))}
                </div>
                <button onClick={() => setOnboardingStep(2)} className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  Suivant <ChevronRight size={16} />
                </button>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <p className="text-2xl font-bold mb-2">Comment lire ton résultat</p>
                <div className="text-sm text-zinc-400 leading-relaxed mb-6 space-y-3">
                  <p>Le <span className="text-white font-semibold">DCF</span> (Discounted Cash Flow) compare la valeur intrinsèque calculée au prix de marché.</p>
                  <p><span className="text-emerald-400 font-semibold">Sous-évalué</span> = le prix est inférieur à la valeur DCF → opportunité potentielle.</p>
                  <p><span className="text-red-400 font-semibold">Surévalué</span> = le prix est supérieur → prudence.</p>
                  <p className="text-xs text-zinc-500 mt-4">Ce n&apos;est pas un conseil en investissement. Fais toujours tes propres recherches.</p>
                </div>
                <button onClick={() => setOnboardingStep(3)} className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  Suivant <ChevronRight size={16} />
                </button>
              </>
            )}
            {onboardingStep === 3 && (
              <>
                <p className="text-2xl font-bold mb-2">Ta watchlist t&apos;attend</p>
                <p className="text-zinc-400 text-sm mb-6">Ajoute cette action à ta watchlist pour suivre son évolution au quotidien.</p>
                <div className="flex gap-3 mb-2">
                  <button
                    onClick={() => {
                      if (onboardingTicker) {
                        setAddInput(onboardingTicker);
                        setShowAddInput(true);
                      }
                      localStorage.setItem("ve_onboarding_done", "1");
                      setOnboardingStep(0);
                      if (onboardingTicker) router.push(`/analyze?ticker=${onboardingTicker}`);
                    }}
                    className="flex-1 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold py-3 rounded-xl transition-all"
                  >
                    Lancer l&apos;analyse{onboardingTicker ? ` de ${onboardingTicker}` : ""} →
                  </button>
                </div>
                <button onClick={() => { localStorage.setItem("ve_onboarding_done", "1"); setOnboardingStep(0); }} className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors">
                  Passer
                </button>
              </>
            )}
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === onboardingStep ? "bg-[#C9A84C]" : "bg-zinc-700"}`} />
              ))}
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
