"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { NavAuth } from "@/components/NavAuth";
import AnimatedBackground from "@/components/AnimatedBackground";
import { searchTicker, type SearchResult } from "@/lib/api";

/* ── Ticker tape data (visual only) ──────────────────────────────────── */
const TAPE = [
  { t: "AAPL",  p: 253.79, c: +1.24 },
  { t: "MSFT",  p: 378.52, c: +0.87 },
  { t: "NVDA",  p: 875.43, c: +3.21 },
  { t: "GOOGL", p: 165.11, c: -0.45 },
  { t: "TSLA",  p: 247.15, c: +2.63 },
  { t: "META",  p: 512.38, c: +1.09 },
  { t: "AMZN",  p: 184.92, c: +0.72 },
  { t: "BRK.B", p: 458.20, c: +0.33 },
  { t: "JPM",   p: 224.65, c: -0.58 },
  { t: "V",     p: 289.30, c: +0.44 },
];

const TYPEWRITER_TICKERS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL"];

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: "DCF Interactif",
    desc: "Ajustez les hypothèses en temps réel et observez la valeur intrinsèque évoluer instantanément.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    title: "Matrice de Sensibilité",
    desc: "Visualisez l'impact de chaque variable sur votre valorisation via une heatmap dynamique.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    title: "IA Bull & Bear",
    desc: "Claude analyse les données financières et génère des scénarios haussiers et baissiers argumentés.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: "Trading Comps",
    desc: "Comparez automatiquement votre cible avec ses principaux pairs sectoriels.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: "Verdict Actionnable",
    desc: "Sous-évalué / Juste valeur / Surévalué — basé sur l'écart entre prix de marché et valeur intrinsèque DCF.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Données Temps Réel",
    desc: "Cours, bilans, flux de trésorerie, marges — tout mis à jour depuis Financial Modeling Prep.",
  },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Cherche", desc: "Tape n'importe quel ticker boursier — AAPL, TSLA, LVMH..." },
  { n: "02", title: "Analyse", desc: "Notre moteur DCF + IA calcule la valeur intrinsèque en quelques secondes." },
  { n: "03", title: "Décide", desc: "Reçois une estimation Sous-évalué / Juste valeur / Surévalué et des arguments Bull & Bear." },
];

interface RecentEntry {
  id: string;
  ticker: string;
  name: string;
  verdict: string;
  performance_pct: number | null;
  created_at: string;
}

/* ── Typewriter hook ─────────────────────────────────────────────────── */
function useTypewriter(words: string[], speed = 120, pause = 1600) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1));
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx((c) => c + 1);
        }
      } else {
        setDisplay(word.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setWordIdx((w) => (w + 1) % words.length);
          setCharIdx(0);
        } else {
          setCharIdx((c) => c - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [ticker, setTicker] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typewriterText = useTypewriter(TYPEWRITER_TICKERS);

  const handleAnalyze = (t: string) => {
    const value = (t || ticker).trim().toUpperCase();
    if (value) router.push(`/analyze?ticker=${value}`);
  };

  const handleTickerChange = useCallback((value: string) => {
    const upper = value.toUpperCase();
    setTicker(upper);
    setSearchResult(null);
    setSearchError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!upper || upper.length < 1) { setSearching(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchTicker(upper);
        setSearchResult(result);
        setSearchError(null);
      } catch {
        setSearchResult(null);
        setSearchError("Ticker introuvable");
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const isValid = !!searchResult;
  const hasError = !!searchError && ticker.length > 0;

  const [recentAnalyses, setRecentAnalyses] = useState<RecentEntry[]>([]);
  useEffect(() => {
    fetch("/api/track-record")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.entries) setRecentAnalyses(d.entries.slice(0, 5)); })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#09090b] text-white overflow-x-hidden relative">

      {/* Aurora background */}
      <AnimatedBackground />

      {/* ── TICKER TAPE ─────────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden bg-[rgba(255,255,255,0.02)] border-b border-[#27272a] py-2">
        <div className="flex animate-[tickerScroll_30s_linear_infinite] whitespace-nowrap" style={{ width: "max-content" }}>
          {[...TAPE, ...TAPE].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold">
              <span className="text-[#C9A84C]">{item.t}</span>
              <span className="text-zinc-300">${item.p.toFixed(2)}</span>
              <span className={item.c > 0 ? "text-emerald-400" : "text-red-400"}>
                {item.c > 0 ? "+" : ""}{item.c.toFixed(2)}%
              </span>
              <span className="text-zinc-700 mx-2">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-[33px] left-0 right-0 z-50 border-b border-[#27272a] bg-[rgba(9,9,11,0.85)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#09090b] border border-[rgba(201,168,76,0.3)] flex items-center justify-center">
              <span className="text-[#C9A84C] font-black text-sm leading-none">V</span>
            </div>
            <span className="text-base font-bold tracking-tight">ValuEngine</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(isSignedIn ? "/dashboard" : "/analyze")}
              className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2"
            >
              {isSignedIn ? "Dashboard" : "Analyser"}
            </button>
            <NavAuth />
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-3xl mx-auto">

          {/* Pill badge */}
          <div className="inline-block text-xs tracking-[0.25em] text-zinc-500 border border-zinc-800 rounded-full px-4 py-1.5 mb-8">
            · ANALYSE DCF · IA CLAUDE · TEMPS RÉEL ·
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white text-center leading-tight tracking-tight mb-6">
            Sais{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #C9A84C, #f5d78e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              exactement
            </span>{" "}
            ce que vaut ton action
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-zinc-400 text-center max-w-lg mx-auto mb-10">
            Valeur intrinsèque DCF, analyse IA Bull/Bear,
            SWOT et PESTLE. Gratuit.
          </p>

          {/* CTA buttons */}
          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <button
              onClick={() => router.push(isSignedIn ? "/dashboard" : "/sign-up")}
              className="px-6 py-3 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-semibold rounded-lg transition-all hover:scale-105 duration-200"
            >
              Commencer gratuitement →
            </button>
            <button
              onClick={() => router.push("/analyze")}
              className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-lg hover:border-zinc-500 hover:text-white transition-all duration-200"
            >
              Voir la démo
            </button>
          </div>

          {/* Smart Search bar */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 relative">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => handleTickerChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze("")}
                  placeholder={`${typewriterText}|`}
                  className={`w-full bg-[rgba(255,255,255,0.04)] border rounded-xl px-5 py-3.5 text-white placeholder-zinc-600 text-sm font-semibold focus:outline-none transition-all ${
                    hasError
                      ? "border-red-500/50 focus:border-red-500"
                      : isValid
                      ? "border-emerald-500/50 focus:border-emerald-500"
                      : "border-zinc-800 focus:border-[rgba(201,168,76,0.5)]"
                  }`}
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-t-2 border-[#C9A84C] rounded-full animate-spin" />
                )}
              </div>
              <button
                onClick={() => handleAnalyze("")}
                disabled={!ticker || hasError}
                className="font-bold px-5 py-3.5 rounded-xl bg-[#C9A84C] hover:bg-[#b8943d] text-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Analyser
              </button>
            </div>

            {searchResult && (
              <button
                onClick={() => handleAnalyze(searchResult.ticker)}
                className="mt-2 w-full bg-[#18181b] border border-[rgba(0,212,170,0.2)] rounded-xl px-4 py-3 flex items-center justify-between hover:border-[rgba(0,212,170,0.4)] transition-all text-left"
              >
                <div>
                  <span className="text-[#C9A84C] font-bold text-sm mr-2">{searchResult.ticker}</span>
                  <span className="text-white text-sm">{searchResult.name}</span>
                  <span className="text-zinc-500 text-xs ml-2">· {searchResult.sector}</span>
                </div>
                <span className="text-white font-bold text-sm">${searchResult.price.toFixed(2)}</span>
              </button>
            )}

            {hasError && (
              <p className="mt-2 text-red-400 text-xs text-center font-medium">
                Ticker introuvable. Vérifiez le symbole (ex: AAPL, TSLA).
              </p>
            )}
          </div>

          {/* Quick tickers */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-5">
            <span className="text-zinc-600 text-xs mr-1">Essayez :</span>
            {["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL"].map((t) => (
              <button
                key={t}
                onClick={() => handleAnalyze(t)}
                className="text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg hover:border-zinc-600 hover:text-white transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600 animate-bounce">
          <ArrowDown size={20} />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Comment ça marche</p>
            <h2 className="text-4xl font-bold tracking-tight">En 3 étapes simples.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                  <span className="text-2xl font-black text-[#C9A84C]">{n}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Ce que vous obtenez</p>
            <h2 className="text-4xl font-bold tracking-tight">
              Tout ce dont un investisseur sérieux
              <br />
              <span className="text-zinc-500">a besoin en un seul endroit.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 hover:border-[#3f3f46] transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#C9A84C] mb-4">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold mb-1.5 text-white">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Tarifs</p>
            <h2 className="text-4xl font-bold tracking-tight">Simple et transparent.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 hover:border-[#3f3f46] transition-colors">
              <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Gratuit</p>
              <p className="text-5xl font-black mb-1">0€</p>
              <p className="text-zinc-500 text-sm mb-8">Pour toujours</p>
              <ul className="space-y-3 text-sm mb-8">
                {["3 analyses par jour", "DCF basique", "Estimation Sous-évalué/Juste valeur/Surévalué"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push(isSignedIn ? "/dashboard" : "/sign-up")}
                className="w-full border border-zinc-700 text-zinc-300 font-semibold py-3 rounded-lg hover:border-zinc-500 hover:text-white transition-all"
              >
                {isSignedIn ? "Aller au Dashboard" : "Commencer gratuitement"}
              </button>
            </div>
            {/* Pro */}
            <div className="bg-[#18181b] border-2 border-[#C9A84C] rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C9A84C] text-black text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-wider">
                POPULAIRE
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#C9A84C] mb-3">Pro</p>
              <p className="text-5xl font-black mb-1">12€</p>
              <p className="text-zinc-500 text-sm mb-8">par mois · ou 99€/an</p>
              <ul className="space-y-3 text-sm mb-8">
                {[
                  "Analyses illimitées", "DCF interactif complet", "Analyse IA Bull & Bear",
                  "Trading Comps sectoriels", "Matrice de sensibilité",
                  "Export PDF professionnel", "Watchlist (50 tickers)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push("/analyze")}
                className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Démarrer l&apos;essai gratuit <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── ANALYSES RÉCENTES ────────────────────────────────────────── */}
      {recentAnalyses.length > 0 && (
        <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Analyses récentes</p>
              <h2 className="text-3xl font-bold tracking-tight">Ce que l&apos;IA a analysé</h2>
              <p className="text-zinc-500 text-sm mt-2">Verdicts et performances en temps réel</p>
            </div>
            <div className="flex flex-col gap-3 mb-8">
              {recentAnalyses.map((entry) => {
                const isUp   = (entry.performance_pct ?? 0) >= 0;
                const isBuy  = entry.verdict === "BUY";
                const isSell = entry.verdict === "SELL";
                return (
                  <Link
                    key={entry.id}
                    href={`/analyse-action/${entry.ticker}`}
                    className="flex items-center justify-between gap-4 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-xl px-5 py-4 transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isBuy  ? "bg-emerald-500/10 text-emerald-400" :
                        isSell ? "bg-red-500/10 text-red-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {isBuy ? <TrendingUp size={14} /> : isSell ? <TrendingDown size={14} /> : <Minus size={14} />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-sm">{entry.ticker}</span>
                        <span className="text-zinc-500 text-sm ml-2 truncate hidden sm:inline">{entry.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isBuy  ? "bg-emerald-500/10 text-emerald-400" :
                        isSell ? "bg-red-500/10 text-red-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {isBuy ? "Sous-évalué" : isSell ? "Surévalué" : "Juste valeur"}
                      </span>
                      {entry.performance_pct != null && (
                        <span className={`text-sm font-bold w-16 text-right ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                          {isUp ? "+" : ""}{entry.performance_pct.toFixed(1)}%
                        </span>
                      )}
                      <span className="text-[#C9A84C] text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="text-center">
              <Link
                href="/track-record"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-5 py-2.5 rounded-lg transition-all"
              >
                Voir tout le track record →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-8 px-6 border-t border-[#27272a]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#09090b] border border-[rgba(201,168,76,0.3)] flex items-center justify-center">
              <span className="text-[#C9A84C] font-black text-xs leading-none">V</span>
            </div>
            <span className="text-sm font-bold">ValuEngine</span>
            <span className="text-zinc-600 text-sm">© 2025</span>
          </div>
          <p className="text-zinc-600 text-xs text-center max-w-md">
            Outil d&apos;aide à la décision uniquement. Ne constitue pas un conseil en investissement.{" "}
            <a href="/legal" className="underline hover:text-zinc-400 transition-colors">Mentions légales</a>
          </p>
        </div>
      </footer>

    </main>
  );
}
