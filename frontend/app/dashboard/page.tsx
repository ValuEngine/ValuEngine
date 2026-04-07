"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { ArrowRight, Plus, X, Loader2, Search, Copy, Check, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ProWelcomeModal from "@/components/ProWelcomeModal";
import OnboardingModal from "@/components/OnboardingModal";
import { shouldShowProWelcome } from "@/hooks/useProStatus";
import { warmupBackend, authedFetch } from "@/lib/api";

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

const FIRST_RUN_TICKERS = [
  { symbol: "MC.PA", name: "LVMH" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "TTE.PA", name: "TotalEnergies" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "AIR.PA", name: "Airbus" },
  { symbol: "MSFT", name: "Microsoft" },
];

function FirstRunHero({ onAnalyze }: { onAnalyze: (ticker: string) => void }) {
  const [ticker, setTicker] = useState("MC.PA");

  return (
    <div
      className="card flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4"
    >
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5 animate-pulse"
        style={{
          background: "rgba(108,92,231,0.12)",
          border: "1px solid rgba(108,92,231,0.35)",
        }}
      >
        <Search className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
      </div>

      {/* Title */}
      <h2 className="font-display text-xl sm:text-2xl font-bold mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
        Analyse ta première action en 60 secondes
      </h2>
      <p className="text-sm mb-7 max-w-md" style={{ color: "var(--text-secondary)" }}>
        DCF automatisé, analyse Bull/Bear IA, valeur intrinsèque.
        Les mêmes outils que les professionnels.
      </p>

      {/* Input + button */}
      <div className="flex gap-2 w-full max-w-sm mb-4">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && ticker && onAnalyze(ticker)}
          placeholder="Ex: AAPL, MC.PA, TSLA..."
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={() => onAnalyze(ticker)}
          disabled={!ticker}
          className="btn-primary rounded-xl px-5 py-3 disabled:opacity-50 whitespace-nowrap"
        >
          Analyser →
        </button>
      </div>

      {/* Popular tickers */}
      <div className="flex flex-wrap gap-2 justify-center">
        {FIRST_RUN_TICKERS.map((t) => (
          <button
            key={t.symbol}
            onClick={() => setTicker(t.symbol)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              ticker === t.symbol
                ? {
                    background: "rgba(108,92,231,0.15)",
                    border: "1px solid rgba(108,92,231,0.45)",
                    color: "var(--accent-primary)",
                  }
                : {
                    background: "var(--bg-overlay)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }
            }
          >
            {t.symbol} · {t.name}
          </button>
        ))}
      </div>

      {/* Reassurance stats */}
      <div className="flex gap-8 mt-8 text-center">
        <div>
          <div className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>60s</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Analyse complète</div>
        </div>
        <div>
          <div className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>5 ans</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Données financières</div>
        </div>
        <div>
          <div className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>IA</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Bull/Bear réel</div>
        </div>
      </div>
    </div>
  );
}

function verdictColor(verdict: string) {
  if (verdict === "BUY")
    return {
      background: "rgba(0,230,138,0.12)",
      color: "var(--color-success)",
      border: "1px solid rgba(0,230,138,0.25)",
    };
  if (verdict === "SELL")
    return {
      background: "rgba(255,84,112,0.12)",
      color: "var(--color-danger)",
      border: "1px solid rgba(255,84,112,0.25)",
    };
  return {
    background: "rgba(255,184,77,0.12)",
    color: "var(--color-warning)",
    border: "1px solid rgba(255,184,77,0.25)",
  };
}

function verdictLabel(verdict: string) {
  if (verdict === "BUY") return "Sous-évalué";
  if (verdict === "SELL") return "Surévalué";
  return "Juste valeur";
}

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [refCopied, setRefCopied] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; is_pro: boolean } | null>(null);

  // Warmup backend Railway dès l'arrivée sur le dashboard
  useEffect(() => { warmupBackend(); }, []);

  // Show Pro welcome modal if user just activated Pro
  useEffect(() => {
    if (isLoaded && isSignedIn && shouldShowProWelcome()) {
      const t = setTimeout(() => setShowProWelcome(true), 500);
      return () => clearTimeout(t);
    }
  }, [isLoaded, isSignedIn]);

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

  // Onboarding: check via backend + localStorage fallback
  useEffect(() => {
    if (!user?.id) return;
    const seen = localStorage.getItem("ve_onboarding_done");
    if (seen) return;
    const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    if (Date.now() - created < 10 * 60 * 1000) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Fetch referral count
  useEffect(() => {
    if (!user?.id) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    authedFetch(`${API_BASE}/api/referral/${user.id}`, getToken)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setReferralCount(d.count ?? 0); })
      .catch((err) => console.error("[Dashboard] referral fetch error:", err));
  }, [user?.id, getToken]);

  useEffect(() => {
    if (!user?.id) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    authedFetch(`${API_BASE}/api/usage/${user.id}`, getToken)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUsage(d); })
      .catch((err) => console.error("[Dashboard] usage fetch error:", err));
  }, [user?.id, getToken]);

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
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
          <div
            className="w-8 h-8 border-t-2 rounded-full animate-spin"
            style={{ borderColor: "var(--accent-primary)" }}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8 animate-in"
        style={{ color: "var(--text-primary)" }}
      >

        {/* Header */}
        <div className="mb-12">
          <h1 className="font-display text-3xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Bonjour {firstName}
          </h1>
          <p className="text-[15px] mt-2 capitalize" style={{ color: "var(--text-tertiary)" }}>{today}</p>
        </div>

        {/* Quick search — card-highlight */}
        <div className="card-highlight mb-12">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium" style={{ color: "var(--accent-primary)" }}>
              Analyser un titre
            </p>
            {usage && !usage.is_pro && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: usage.limit }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-colors"
                      style={{
                        background: i < usage.used ? "var(--accent-primary)" : "var(--border-subtle)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium" style={{ color: usage.used >= usage.limit ? "var(--color-danger)" : "var(--text-tertiary)" }}>
                  {usage.used >= usage.limit
                    ? "Limite atteinte"
                    : `${usage.limit - usage.used} analyse${usage.limit - usage.used > 1 ? "s" : ""} restante${usage.limit - usage.used > 1 ? "s" : ""}`}
                </span>
              </div>
            )}
            {usage?.is_pro && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(240,200,80,0.12)", color: "var(--accent-gold)", border: "1px solid rgba(240,200,80,0.25)" }}>
                Pro · Illimité
              </span>
            )}
          </div>
          {/* Achievement hint */}
          {recent.length >= 3 && recent.length < 10 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              🎯 Encore {10 - recent.length} analyses pour débloquer le badge &quot;Analyste confirmé&quot;
            </p>
          )}
          {recent.length >= 10 && (
            <p className="text-xs mt-1" style={{ color: "var(--accent-gold)" }}>
              🏆 Badge &quot;Analyste confirmé&quot; débloqué !
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex: AAPL, TSLA, MSFT..."
              className="flex-1 rounded-lg px-4 py-2.5 text-base sm:text-sm outline-none transition-all"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery}
              className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
            >
              Analyser <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent analyses */}
        <div className="mb-12">
          <p className="font-display text-xl font-semibold mb-6" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Analyses récentes
          </p>
          {recent.length === 0 ? (
            <FirstRunHero onAnalyze={(t) => router.push(`/analyze?ticker=${t}`)} />
          ) : (
            <>
              <div className="overflow-x-auto flex gap-3 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((entry) => (
                  <button
                    key={entry.ticker}
                    onClick={() => router.push(`/analyze?ticker=${entry.ticker}`)}
                    className="card-interactive rounded-xl p-4 text-left flex-shrink-0 w-64 sm:w-auto"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-base" style={{ color: "var(--accent-primary)" }}>
                          {entry.ticker}
                        </p>
                        <p className="text-sm truncate max-w-[140px]" style={{ color: "var(--text-secondary)" }}>
                          {entry.name}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={verdictColor(entry.verdict)}
                      >
                        {verdictLabel(entry.verdict)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{entry.date}</p>
                  </button>
                ))}
              </div>
              {recent.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => router.push("/track-record")}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Voir le track record complet →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Market overview */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <p className="font-display text-xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Marchés aujourd&apos;hui
            </p>
            {marketLoading ? (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              >
                Chargement...
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{
                  border: "1px solid rgba(0,230,138,0.25)",
                  color: "var(--color-success)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--color-success)" }}
                />
                Live
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {marketLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))
            ) : (marketData.length > 0 ? marketData : MARKET_FALLBACK).map((m) => (
              <div key={m.label} className="card p-4">
                <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  {m.label}
                </p>
                <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{m.value}</p>
                <p
                  className="text-sm font-semibold mt-1"
                  style={{ color: m.up ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {m.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular tickers */}
        <div className="mb-12">
          <p className="font-display text-xl font-semibold mb-6" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Tickers populaires
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => router.push(`/analyze?ticker=${t}`)}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-primary)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Watchlist section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Ma Watchlist
            </h2>
            <button
              onClick={() => { setShowAddInput(v => !v); setAddError(""); setAddInput(""); }}
              className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{
                color: "var(--accent-primary)",
                border: "1px solid rgba(108,92,231,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,92,231,0.10)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
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
                  className="w-full rounded-lg px-4 py-2.5 text-base sm:text-sm outline-none transition-all"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
                {addError && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-danger)" }}>
                    {addError}
                  </p>
                )}
              </div>
              <button
                onClick={handleAddTicker}
                disabled={addLoading || !addInput}
                className="btn-primary flex items-center gap-1.5 px-4 py-2.5 rounded-lg disabled:opacity-40 whitespace-nowrap text-sm"
              >
                {addLoading ? <Loader2 size={14} className="animate-spin" /> : "Valider"}
              </button>
              <button
                onClick={() => { setShowAddInput(false); setAddInput(""); setAddError(""); }}
                className="p-2.5 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
                }}
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
            <div className="card p-8 text-center">
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                Ajoute tes premiers tickers à suivre
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Clique sur &quot;Ajouter&quot; pour commencer
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {watchlistItems.map((item, i) => (
                <div
                  key={item.ticker}
                  className="flex items-center justify-between px-4 py-3 transition-colors"
                  style={
                    i < watchlistItems.length - 1
                      ? { borderBottom: "1px solid var(--border-subtle)" }
                      : {}
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  {/* Left: ticker + name */}
                  <button
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                    onClick={() => router.push(`/analyze?ticker=${item.ticker}`)}
                  >
                    <span
                      className="font-bold text-sm w-14 flex-shrink-0"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {item.ticker}
                    </span>
                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      {item.name}
                    </span>
                  </button>

                  {/* Right: price + change + verdict + remove */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.price != null ? (
                      <>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          ${item.price.toFixed(2)}
                        </span>
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: (item.change_pct ?? 0) >= 0
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                          }}
                        >
                          {(item.change_pct ?? 0) >= 0 ? "+" : ""}{(item.change_pct ?? 0).toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>
                    )}
                    {item.verdict && (
                      <span
                        className="hidden sm:inline text-xs font-bold px-2 py-0.5 rounded-full"
                        style={verdictColor(item.verdict)}
                      >
                        {verdictLabel(item.verdict)}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveTicker(item.ticker)}
                      className="p-1 transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
                      }}
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

        {/* Referral section */}
        {user?.id && (
          <section className="mt-8">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} style={{ color: "var(--accent-primary)" }} />
                <h3 className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  Inviter des amis
                </h3>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                Partage ton lien et gagne des avantages. 3 filleuls = 1 mois Pro offert.
              </p>
              <div className="flex gap-2 items-center mb-3">
                <input
                  readOnly
                  value={`https://valuengine.fr?ref=${user.id}`}
                  className="flex-1 rounded-lg px-3 py-2 text-xs truncate outline-none"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://valuengine.fr?ref=${user.id}`);
                    setRefCopied(true);
                    setTimeout(() => setRefCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg transition-all whitespace-nowrap"
                  style={{
                    color: "var(--accent-primary)",
                    border: "1px solid rgba(108,92,231,0.35)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,92,231,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {refCopied
                    ? <><Check size={13} /> Copié</>
                    : <><Copy size={13} /> Copier</>}
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {referralCount === 0
                  ? "Aucun filleul pour le moment"
                  : `${referralCount} filleul${referralCount > 1 ? "s" : ""} — ${
                      referralCount >= 3
                        ? "1 mois Pro débloqué !"
                        : `encore ${3 - referralCount} pour débloquer 1 mois Pro`
                    }`}
              </p>
            </div>
          </section>
        )}

      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        show={showOnboarding}
        onComplete={(ticker) => {
          localStorage.setItem("ve_onboarding_done", "1");
          setShowOnboarding(false);
          if (user?.id) {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            authedFetch(`${API_BASE}/api/user/onboarding-complete/${user.id}`, getToken, { method: "POST" }).catch((err) => console.error("[Dashboard] onboarding-complete error:", err));
          }
          if (ticker) router.push(`/analyze?ticker=${ticker}`);
        }}
        onSkip={() => {
          localStorage.setItem("ve_onboarding_done", "1");
          setShowOnboarding(false);
          if (user?.id) {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
            authedFetch(`${API_BASE}/api/user/onboarding-complete/${user.id}`, getToken, { method: "POST" }).catch((err) => console.error("[Dashboard] onboarding-complete error:", err));
          }
        }}
      />

      {/* Pro Welcome Modal */}
      <ProWelcomeModal show={showProWelcome} onClose={() => setShowProWelcome(false)} />

    </AppLayout>
  );
}
