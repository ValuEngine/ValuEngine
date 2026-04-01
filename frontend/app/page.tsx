"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Star, ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { NavAuth } from "@/components/NavAuth";
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

/* ── Typewriter tickers ───────────────────────────────────────────────── */
const TYPEWRITER_TICKERS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL"];

/* ── Features with SVG icons ─────────────────────────────────────────── */
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
    desc: "Comparez automatiquement votre cible avec ses 4 principaux pairs sectoriels.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: "Verdict Actionnable",
    desc: "BUY / HOLD / SELL basé sur l'écart entre prix de marché et valeur intrinsèque DCF.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Données Temps Réel",
    desc: "Cours, bilans, flux de trésorerie, marges — tout mis à jour depuis Yahoo Finance.",
  },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Cherche", desc: "Tape n'importe quel ticker boursier — AAPL, TSLA, LVMH..." },
  { n: "02", title: "Analyse", desc: "Notre moteur DCF + IA calcule la valeur intrinsèque en quelques secondes." },
  { n: "03", title: "Décide", desc: "Reçois un verdict BUY / HOLD / SELL clair et des arguments Bull & Bear." },
];

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

  return (
    <main className="min-h-screen bg-[#0a1628] text-white overflow-x-hidden">

      {/* ── TICKER TAPE ─────────────────────────────────────────────── */}
      <div className="overflow-hidden bg-[rgba(201,168,76,0.04)] border-b border-[rgba(201,168,76,0.08)] py-2">
        <div className="flex animate-[tickerScroll_30s_linear_infinite] whitespace-nowrap" style={{ width: "max-content" }}>
          {[...TAPE, ...TAPE].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold">
              <span className="text-[#C9A84C]">{item.t}</span>
              <span className="text-white">${item.p.toFixed(2)}</span>
              <span className={item.c > 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}>
                {item.c > 0 ? "+" : ""}{item.c.toFixed(2)}%
              </span>
              <span className="text-[#2a3a4a] mx-2">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-[33px] left-0 right-0 z-50 border-b border-[rgba(201,168,76,0.1)] bg-[rgba(10,22,40,0.92)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">ValuEngine</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(isSignedIn ? "/dashboard" : "/analyze")}
              className="text-sm text-[#7a8fa3] hover:text-white transition-colors px-4 py-2"
            >
              {isSignedIn ? "Dashboard" : "Analyser"}
            </button>
            <NavAuth />
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="pt-52 pb-28 px-6 text-center">
        <div className="max-w-4xl mx-auto">

          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A84C] tracking-widest uppercase bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-full mb-8">
            <Star size={12} fill="currentColor" />
            Analyse financière augmentée par l'IA
          </div>

          <h1 className="text-6xl sm:text-7xl font-black tracking-tight leading-none mb-6">
            Stop guessing.
            <br />
            <span className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] bg-clip-text text-transparent">
              Start valuing.
            </span>
          </h1>

          <p className="text-xl text-[#6b7d91] leading-relaxed max-w-2xl mx-auto mb-12">
            Valorisez n'importe quelle action en quelques secondes.
            DCF interactif, analyse IA Bull/Bear, Trading Comps.
            <br />
            L'outil que les analystes gardent pour eux — à 12€/mois.
          </p>

          {/* Smart Search bar */}
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-center gap-3 relative">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => handleTickerChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze("")}
                  placeholder={`${typewriterText}|`}
                  className={`w-full bg-[rgba(27,45,69,0.9)] border rounded-xl px-5 py-4 text-white placeholder-[#3a5070] text-sm font-semibold focus:outline-none transition-all ${
                    hasError
                      ? "border-[#ff4d6d] focus:border-[#ff4d6d] focus:shadow-[0_0_0_3px_rgba(255,77,109,0.12)]"
                      : isValid
                      ? "border-[#00d4aa] focus:border-[#00d4aa] focus:shadow-[0_0_0_3px_rgba(0,212,170,0.12)]"
                      : "border-[rgba(201,168,76,0.3)] focus:border-[#C9A84C] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]"
                  }`}
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-t-2 border-[#C9A84C] rounded-full animate-spin" />
                )}
              </div>
              <button
                onClick={() => handleAnalyze("")}
                disabled={!ticker || hasError}
                className={`font-bold px-6 py-4 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap ${
                  isValid
                    ? "bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] hover:shadow-[0_4px_24px_rgba(201,168,76,0.45)]"
                    : "bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] hover:shadow-[0_4px_24px_rgba(201,168,76,0.45)]"
                }`}
              >
                Analyser <ArrowRight size={16} />
              </button>
            </div>

            {/* Dropdown result */}
            {searchResult && (
              <button
                onClick={() => handleAnalyze(searchResult.ticker)}
                className="mt-2 w-full bg-[#132032] border border-[rgba(0,212,170,0.25)] rounded-xl px-4 py-3 flex items-center justify-between hover:bg-[#1a2d45] transition-all text-left"
              >
                <div>
                  <span className="text-[#C9A84C] font-bold text-sm mr-2">{searchResult.ticker}</span>
                  <span className="text-white text-sm">{searchResult.name}</span>
                  <span className="text-[#5d7289] text-xs ml-2">· {searchResult.sector}</span>
                </div>
                <span className="text-white font-bold text-sm">${searchResult.price.toFixed(2)}</span>
              </button>
            )}

            {/* Error */}
            {hasError && (
              <p className="mt-2 text-[#ff4d6d] text-xs text-center font-medium">
                Ticker introuvable. Vérifiez le symbole (ex: AAPL, TSLA).
              </p>
            )}
          </div>

          {/* Quick tickers */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[#3a5070] text-xs mr-1">Essayez :</span>
            {["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL"].map((t) => (
              <button
                key={t}
                onClick={() => handleAnalyze(t)}
                className="text-xs font-semibold text-[#C9A84C] bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] px-3 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.14)] transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Comment ça marche</p>
            <h2 className="text-4xl font-black tracking-tight">En 3 étapes simples.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center mb-5">
                  <span className="text-2xl font-black text-[#C9A84C]">{n}</span>
                </div>
                <h3 className="text-xl font-black mb-2">{title}</h3>
                <p className="text-sm text-[#5d7289] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Ce que vous obtenez</p>
            <h2 className="text-4xl font-black tracking-tight">
              Tout ce dont un investisseur sérieux
              <br />
              <span className="text-[#6b7d91]">a besoin en un seul endroit.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.12)] rounded-2xl p-7 hover:border-[rgba(201,168,76,0.28)] hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[#C9A84C] mb-5">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[#5d7289] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Tarifs</p>
            <h2 className="text-4xl font-black tracking-tight">Simple et transparent.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(255,255,255,0.07)] rounded-2xl p-8">
              <p className="text-xs font-bold tracking-widest uppercase text-[#5d7289] mb-3">Gratuit</p>
              <p className="text-5xl font-black mb-1">0€</p>
              <p className="text-[#5d7289] text-sm mb-8">Pour toujours</p>
              <ul className="space-y-3 text-sm mb-8">
                {["3 analyses par jour", "DCF basique", "Verdict BUY/HOLD/SELL"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#7a8fa3]">
                    <div className="w-4 h-4 rounded-full bg-[rgba(201,168,76,0.15)] flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push(isSignedIn ? "/dashboard" : "/sign-up")}
                className="w-full border border-[rgba(201,168,76,0.3)] text-[#C9A84C] font-bold py-3 rounded-xl hover:bg-[rgba(201,168,76,0.08)] transition-all"
              >
                {isSignedIn ? "Aller au Dashboard" : "Commencer gratuitement"}
              </button>
            </div>
            {/* Pro */}
            <div className="bg-gradient-to-b from-[#1e3050] to-[#162540] border-2 border-[#C9A84C] rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-[#C9A84C] to-[#e8c55a] text-[#0a1628] text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-wider">
                POPULAIRE
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#C9A84C] mb-3">Pro</p>
              <p className="text-5xl font-black mb-1">12€</p>
              <p className="text-[#5d7289] text-sm mb-8">par mois · ou 99€/an</p>
              <ul className="space-y-3 text-sm mb-8">
                {[
                  "Analyses illimitées", "DCF interactif complet", "Analyse IA Bull & Bear",
                  "Trading Comps sectoriels", "Matrice de sensibilité",
                  "Export PDF professionnel", "Watchlist (50 tickers)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <div className="w-4 h-4 rounded-full bg-[rgba(201,168,76,0.2)] flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push("/analyze")}
                className="w-full bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-black py-3 rounded-xl hover:shadow-[0_6px_24px_rgba(201,168,76,0.4)] transition-all flex items-center justify-center gap-2"
              >
                Démarrer l'essai gratuit <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-[rgba(255,255,255,0.04)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              </svg>
            </div>
            <span className="text-sm font-bold">ValuEngine</span>
            <span className="text-[#3a5070] text-sm">© 2025</span>
          </div>
          <p className="text-[#3a5070] text-xs text-center max-w-md">
            Outil d'aide à la décision uniquement. Ne constitue pas un conseil en investissement.
            Tout investissement comporte des risques.
          </p>
        </div>
      </footer>

    </main>
  );
}
