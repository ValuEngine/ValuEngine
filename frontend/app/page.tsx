"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronDown, ArrowDown, TrendingUp, TrendingDown, Minus, Search, Shield, Zap, BarChart3 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { NavAuth } from "@/components/NavAuth";
import AnimatedBackground from "@/components/AnimatedBackground";
import { MockupVerdict, MockupBullBear, MockupSensitivity } from "@/components/MockupScreenshots";
import { searchTicker, type SearchResult } from "@/lib/api";

/* ── Features ────────────────────────────────────────────────────────── */
const FEATURES: { title: string; desc: string; pro?: boolean; icon: React.ReactNode }[] = [
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
    title: "DCF Interactif",
    desc: "Ajuste les hypothèses en temps réel et observe la valeur intrinsèque évoluer instantanément.",
    pro: true,
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>,
    title: "IA Bull & Bear",
    desc: "Arguments haussiers et baissiers étayés sur les fondamentaux, générés par IA.",
    pro: true,
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    title: "SWOT & PESTLE",
    desc: "Analyse stratégique et macro-économique complète, synthétisée par l&apos;IA.",
    pro: true,
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    title: "Trading Comps",
    desc: "Comparaison automatique avec les principaux pairs sectoriels.",
    pro: true,
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    title: "Track Record vérifié",
    desc: "Performance historique de nos verdicts, actualisée en temps réel.",
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
    title: "Matrice de sensibilité",
    desc: "Teste différents scénarios WACC / croissance et visualise l&apos;impact.",
    pro: true,
  },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Cherche", desc: "Tape un ticker — Apple, LVMH, Tesla, Total..." },
  { n: "02", title: "Analyse", desc: "Notre moteur DCF + IA calcule la valeur intrinsèque en 60 secondes." },
  { n: "03", title: "Décide", desc: "Sous-évalué, juste valeur ou surévalué — avec les arguments pour et contre." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "C'est quoi un DCF ?", a: "Le DCF (Discounted Cash Flow) est la méthode de valorisation utilisée par les analystes professionnels. Elle estime la valeur d'une entreprise en actualisant ses flux de trésorerie futurs. ValuEngine automatise ce calcul en quelques secondes." },
  { q: "Est-ce que les analyses sont fiables ?", a: "Nos analyses sont basées sur des données financières réelles (Financial Modeling Prep) et un modèle DCF standard. L'IA ajoute une couche qualitative. Consulte notre Track Record pour juger par toi-même — nous publions toutes nos performances passées." },
  { q: "Quelles actions sont couvertes ?", a: "Toutes les actions cotées sur les bourses américaines (NYSE, NASDAQ) et européennes (Euronext Paris, Xetra, etc.). Plus de 50 000 tickers disponibles." },
  { q: "Pourquoi c'est en français ?", a: "Parce qu'aucun outil de valorisation sérieux n'existait en français. Les investisseurs francophones méritent des outils de qualité professionnelle dans leur langue." },
  { q: "Est-ce un conseil en investissement ?", a: "Non. ValuEngine est un outil d'aide à la décision éducatif. Nos verdicts sont des estimations mathématiques, pas des recommandations au sens de la directive MIF II. Consulte un conseiller agréé avant d'investir." },
  { q: "Je peux annuler mon abonnement Pro ?", a: "Oui, à tout moment. Pas d'engagement, pas de frais cachés. Tu gardes l'accès jusqu'à la fin de ta période en cours." },
];

const TYPEWRITER_TICKERS = ["AAPL", "MC.PA", "TSLA", "TTE.PA", "NVDA", "BNP.PA"];

interface MarketItem { label: string; value: string; change: string; up: boolean }
interface RecentEntry { id: string; ticker: string; name: string; verdict: string; performance_pct: number | null; created_at: string }
interface TrackRecordData { entries: RecentEntry[]; summary?: { total: number; wins: number; win_rate: number; avg_performance: number } }

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

/* ── FAQ Accordion ───────────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#27272a]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm font-semibold text-white group-hover:text-[#C9A84C] transition-colors">{q}</span>
        <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 flex-shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="text-sm text-zinc-400 leading-relaxed pb-5">{a}</p>}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [ticker, setTicker] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typewriterText = useTypewriter(TYPEWRITER_TICKERS);

  /* ── Live ticker tape from backend ── */
  const [tapeData, setTapeData] = useState<MarketItem[]>([]);
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    const fetchMarket = () => {
      fetch(`${API_BASE}/api/market-overview`)
        .then((r) => r.ok ? r.json() : [])
        .then((d: MarketItem[]) => { if (d.length) setTapeData(d); })
        .catch(() => {});
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Track record data ── */
  const [trackData, setTrackData] = useState<TrackRecordData | null>(null);
  useEffect(() => {
    fetch("/api/track-record")
      .then((r) => r.ok ? r.json() : null)
      .then((d: TrackRecordData | null) => { if (d) setTrackData(d); })
      .catch(() => {});
  }, []);

  /* ── Sticky CTA visibility ── */
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Pricing toggle ── */
  const [annual, setAnnual] = useState(true);

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

  const recentAnalyses = trackData?.entries?.slice(0, 5) ?? [];
  const summary = trackData?.summary;

  return (
    <main className="min-h-screen bg-[#09090b] text-white overflow-x-hidden relative">

      <AnimatedBackground />

      {/* ── LIVE TICKER TAPE ─────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden bg-[rgba(255,255,255,0.02)] border-b border-[#27272a] py-2">
        <div className="flex items-center">
          <span className="flex-shrink-0 text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-4">Marchés</span>
          <div className="flex animate-[tickerScroll_30s_linear_infinite] whitespace-nowrap" style={{ width: "max-content" }}>
            {tapeData.length > 0 ? (
              [...tapeData, ...tapeData, ...tapeData].map((m, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold">
                  <span className="text-[#C9A84C]">{m.label}</span>
                  <span className="text-zinc-300">{m.value}</span>
                  <span className={m.up ? "text-emerald-400" : "text-red-400"}>{m.change}</span>
                  <span className="text-zinc-700 mx-2">·</span>
                </span>
              ))
            ) : (
              ["S&P 500", "NASDAQ", "CAC 40", "DAX"].map((t, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold text-zinc-500">
                  {t}<span className="text-zinc-700 mx-2">·</span>
                </span>
              ))
            )}
          </div>
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
          <div className="flex items-center gap-2">
            <Link href="/track-record" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2 hidden sm:block">Track Record</Link>
            <Link href="/methodology" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2 hidden sm:block">Méthodologie</Link>
            <button onClick={() => router.push(isSignedIn ? "/dashboard" : "/analyze")} className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2">
              {isSignedIn ? "Dashboard" : "Analyser"}
            </button>
            <NavAuth />
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-3xl mx-auto">

          <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-zinc-500 border border-zinc-800 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            1ER OUTIL DE VALORISATION DCF EN FRANÇAIS
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center leading-[1.1] tracking-tight mb-6">
            Prends de meilleures<br />décisions d&apos;investissement,{" "}
            <span style={{ background: "linear-gradient(135deg, #C9A84C, #f5d78e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              plus vite
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 text-center max-w-xl mx-auto mb-10">
            Valorisation DCF, arguments Bull &amp; Bear par IA, matrice de sensibilité — en 60 secondes, en français, avec un{" "}
            <Link href="/track-record" className="text-[#C9A84C] hover:underline">Track Record vérifié</Link>.
          </p>

          {/* Smart Search bar */}
          <div className="max-w-md mx-auto mb-4">
            <div className="flex items-center gap-3 relative">
              <div className="flex-1 relative">
                <input
                  type="text" value={ticker}
                  onChange={(e) => handleTickerChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze("")}
                  placeholder={`Essaie ${typewriterText}|`}
                  className={`w-full bg-[rgba(255,255,255,0.04)] border rounded-xl px-5 py-3.5 text-white placeholder-zinc-600 text-sm font-semibold focus:outline-none transition-all ${hasError ? "border-red-500/50 focus:border-red-500" : isValid ? "border-emerald-500/50 focus:border-emerald-500" : "border-zinc-800 focus:border-[rgba(201,168,76,0.5)]"}`}
                />
                {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-t-2 border-[#C9A84C] rounded-full animate-spin" />}
              </div>
              <button onClick={() => handleAnalyze("")} disabled={!ticker || hasError} className="font-bold px-5 py-3.5 rounded-xl bg-[#C9A84C] hover:bg-[#b8943d] text-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                Analyser
              </button>
            </div>
            {searchResult && (
              <button onClick={() => handleAnalyze(searchResult.ticker)} className="mt-2 w-full bg-[#18181b] border border-[rgba(0,212,170,0.2)] rounded-xl px-4 py-3 flex items-center justify-between hover:border-[rgba(0,212,170,0.4)] transition-all text-left">
                <div>
                  <span className="text-[#C9A84C] font-bold text-sm mr-2">{searchResult.ticker}</span>
                  <span className="text-white text-sm">{searchResult.name}</span>
                  <span className="text-zinc-500 text-xs ml-2">· {searchResult.sector}</span>
                </div>
                <span className="text-white font-bold text-sm">${searchResult.price.toFixed(2)}</span>
              </button>
            )}
            {hasError && <p className="mt-2 text-red-400 text-xs text-center font-medium">Ticker introuvable. Vérifie le symbole (ex: AAPL, MC.PA).</p>}
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            <span className="text-zinc-600 text-xs mr-1">Populaires :</span>
            {["MC.PA", "AAPL", "TTE.PA", "TSLA", "BNP.PA", "NVDA"].map((t) => (
              <button key={t} onClick={() => handleAnalyze(t)} className="text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg hover:border-zinc-600 hover:text-white transition-all">{t}</button>
            ))}
          </div>

          <p className="text-zinc-400 text-xs font-medium">✓ Gratuit · ✓ Sans carte bancaire · ✓ 3 analyses/jour</p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600 animate-bounce"><ArrowDown size={20} /></div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Comment ça marche</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Une analyse complète en 3 étapes.</h2>
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

      {/* ── TRACK RECORD (moved up — strongest social proof) ──────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase">Track Record</p>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Nos verdicts, vérifiés en temps réel</h2>
            <p className="text-zinc-500 text-sm mt-2">Aucun autre outil ne publie ses performances passées. Nous si.</p>
          </div>

          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Win Rate", value: `${summary.win_rate.toFixed(0)}%` },
                { label: "Analyses", value: String(summary.total) },
                { label: "Perf. moyenne", value: `${summary.avg_performance >= 0 ? "+" : ""}${summary.avg_performance.toFixed(1)}%` },
              ].map((s) => (
                <div key={s.label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{s.label}</p>
                  <p className="text-xl font-black text-white">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {recentAnalyses.length > 0 && (
            <div className="flex flex-col gap-3 mb-8">
              {recentAnalyses.map((entry) => {
                const isUp = (entry.performance_pct ?? 0) >= 0;
                const isBuy = entry.verdict === "BUY";
                const isSell = entry.verdict === "SELL";
                return (
                  <Link key={entry.id} href={`/analyse-action/${entry.ticker}`} className="flex items-center justify-between gap-4 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-xl px-5 py-4 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isBuy ? "bg-emerald-500/10 text-emerald-400" : isSell ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {isBuy ? <TrendingUp size={14} /> : isSell ? <TrendingDown size={14} /> : <Minus size={14} />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-sm">{entry.ticker}</span>
                        <span className="text-zinc-500 text-sm ml-2 truncate hidden sm:inline">{entry.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBuy ? "bg-emerald-500/10 text-emerald-400" : isSell ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
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
          )}
          <div className="text-center">
            <Link href="/track-record" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-5 py-2.5 rounded-lg transition-all">
              Voir le Track Record complet →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Ce que tu obtiens</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              6 outils d&apos;analyse professionnels,<br /><span className="text-zinc-500">accessibles en un clic.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 hover:border-[#3f3f46] transition-colors duration-200 relative">
                {f.pro && (
                  <span className="absolute top-3 right-3 text-[10px] font-black tracking-wider text-[#09090b] bg-[#C9A84C] px-2.5 py-0.5 rounded-full">PRO</span>
                )}
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#C9A84C] mb-4">{f.icon}</div>
                <h3 className="text-sm font-bold mb-1.5 text-white">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERFACE PREVIEW ───────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a] overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Aperçu</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3">Une analyse complète en un coup d&apos;œil</h2>
            <p className="text-sm text-zinc-500 max-w-lg mx-auto">Verdict DCF, analyse IA Bull & Bear, et matrice de sensibilité — tout ce dont tu as besoin pour prendre une décision éclairée.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="flex justify-center"><MockupVerdict /></div>
            <div className="flex justify-center"><MockupBullBear /></div>
            <div className="flex justify-center"><MockupSensitivity /></div>
          </div>
        </div>
      </section>

      {/* ── WHY VALUENGINE ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Pourquoi ValuEngine</p>
            <h2 className="text-3xl font-bold tracking-tight">Ce qui nous différencie</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Shield size={22} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold mb-2">Transparence totale</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Nous publions notre Track Record en temps réel. Chaque verdict est vérifiable. Aucun autre outil ne fait ça.</p>
            </div>
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Zap size={22} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-bold mb-2">60 secondes</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Une analyse DCF complète prend 2-3 heures sur Excel. ValuEngine la génère en moins d&apos;une minute.</p>
            </div>
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center mx-auto mb-4">
                <BarChart3 size={22} className="text-[#C9A84C]" />
              </div>
              <h3 className="text-sm font-bold mb-2">100% en français</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Le seul outil de valorisation DCF + IA conçu pour les investisseurs francophones. Actions US et européennes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Témoignages</p>
            <h2 className="text-3xl font-bold tracking-tight">Ce qu&apos;en pensent nos utilisateurs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                prenom: "Thomas", initiale: "T", profil: "Investisseur particulier — 9 ans d'expérience", ville: "Lyon", note: 5,
                texte: "J'ai analysé TotalEnergies avec ValuEngine avant de renforcer ma position. Le DCF m'a montré un upside de 22% que j'avais pas vu avec mes propres calculs Excel. L'analyse IA Bull/Bear était vraiment bien construite — pas du bullshit générique.",
              },
              {
                prenom: "Sarah", initiale: "S", profil: "Analyste financière junior", ville: "Paris", note: 5,
                texte: "Enfin un outil sérieux en français. J'utilisais Simply Wall St mais l'interface était en anglais et les données sur les actions françaises étaient souvent fausses. Là sur LVMH et Sanofi les fondamentaux sont corrects et le SWOT est vraiment pertinent.",
              },
              {
                prenom: "Marc", initiale: "M", profil: "Ingénieur — investisseur depuis 4 ans", ville: "Bordeaux", note: 5,
                texte: "La matrice de sensibilité DCF c'est ce qui m'a convaincu. Je modifie le WACC et le taux de croissance, je vois instantanément l'impact sur la valorisation. C'est ce que je faisais sur Excel depuis des heures, là c'est en 30 secondes.",
              },
              {
                prenom: "Julie", initiale: "J", profil: "Étudiante en finance — Master CCA", ville: "Toulouse", note: 4,
                texte: "J'utilise ValuEngine pour mes études de cas. Le modèle DCF est bien implémenté et les ratios de trading comps m'évitent de chercher les données manuellement. Seul bémol : j'aurais aimé pouvoir exporter le rapport en PDF.",
              },
              {
                prenom: "Karim", initiale: "K", profil: "Chef de projet — portefeuille long terme", ville: "Marseille", note: 5,
                texte: "J'avais essayé Morningstar et AlphaSpread. Morningstar c'est trop cher, AlphaSpread c'est en anglais avec des données approximatives sur le CAC 40. ValuEngine c'est le seul qui fait du DCF sérieux sur les valeurs françaises avec une interface propre.",
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className={`bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 hover:border-[#3f3f46] transition-colors ${idx >= 3 ? "hidden md:block" : ""}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.25)] flex items-center justify-center text-[#C9A84C] font-bold text-sm">
                    {t.initiale}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{t.prenom}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{t.profil}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">{t.ville}</span>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-xs ${i < t.note ? "text-[#C9A84C]" : "text-zinc-700"}`}>★</span>
                  ))}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed italic">&ldquo;{t.texte}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Tarifs</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">Simple. Transparent. Sans engagement.</h2>
            <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-full p-1">
              <button onClick={() => setAnnual(false)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? "bg-[#C9A84C] text-black" : "text-zinc-400 hover:text-white"}`}>Mensuel</button>
              <button onClick={() => setAnnual(true)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${annual ? "bg-[#C9A84C] text-black" : "text-zinc-400 hover:text-white"}`}>
                Annuel <span className="text-xs font-bold text-emerald-400 ml-1">-17%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 hover:border-[#3f3f46] transition-colors">
              <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Gratuit</p>
              <p className="text-5xl font-black mb-1">0€</p>
              <p className="text-zinc-500 text-sm mb-8">Pour toujours</p>
              <ul className="space-y-3 text-sm mb-8">
                {["3 analyses par jour", "Verdict DCF (sous-évalué / surévalué)", "Estimation de valeur intrinsèque"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-zinc-400"><div className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />{item}</li>
                ))}
              </ul>
              <button onClick={() => router.push(isSignedIn ? "/dashboard" : "/sign-up")} className="w-full border border-zinc-700 text-zinc-300 font-semibold py-3 rounded-lg hover:border-zinc-500 hover:text-white transition-all">
                {isSignedIn ? "Aller au Dashboard" : "Commencer gratuitement"}
              </button>
            </div>
            {/* Pro */}
            <div className="bg-[#18181b] border-2 border-[#C9A84C] rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C9A84C] text-black text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-wider">
                {annual ? "2 MOIS OFFERTS" : "POPULAIRE"}
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#C9A84C] mb-3">Pro</p>
              {annual ? (
                <>
                  <p className="text-5xl font-black mb-1">99€</p>
                  <p className="text-zinc-500 text-sm mb-8">par an · soit 8,25€/mois</p>
                </>
              ) : (
                <>
                  <p className="text-5xl font-black mb-1">12€</p>
                  <p className="text-zinc-500 text-sm mb-8">par mois</p>
                </>
              )}
              <ul className="space-y-3 text-sm mb-8">
                {["Analyses illimitées", "DCF interactif complet", "Analyse IA Bull & Bear", "SWOT & PESTLE", "Trading Comps sectoriels", "Matrice de sensibilité", "Watchlist (50 tickers)"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white"><div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />{item}</li>
                ))}
              </ul>
              <button
                onClick={async () => {
                  if (!isSignedIn) { router.push("/sign-up"); return; }
                  try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://peaceful-acceptance-production-2e1d.up.railway.app";
                    const res = await fetch(`${apiUrl}/api/stripe/create-checkout`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user?.id,
                        userEmail: user?.emailAddresses?.[0]?.emailAddress,
                        plan: annual ? "yearly" : "monthly",
                      }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                    else alert(data.detail || "Erreur lors de la création du paiement.");
                  } catch { alert("Impossible de contacter le serveur de paiement."); }
                }}
                className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Passer Pro <ChevronRight size={16} />
              </button>
              <p className="text-center text-zinc-400 text-sm mt-3">✓ Sans engagement · Annulable à tout moment</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 border-t border-[#27272a]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Questions fréquentes</p>
            <h2 className="text-3xl font-bold tracking-tight">Tout ce que tu veux savoir</h2>
          </div>
          <div>
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-12 px-6 border-t border-[#27272a]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-6 flex-wrap text-zinc-500 text-xs font-medium">
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-emerald-400" /> Données Financial Modeling Prep</span>
            <span className="text-zinc-700">·</span>
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-blue-400" /> IA Anthropic Claude</span>
            <span className="text-zinc-700">·</span>
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-[#C9A84C]" /> Hébergé en UE</span>
            <span className="text-zinc-700">·</span>
            <span className="border border-zinc-800 px-3 py-1 rounded-full">RGPD Conforme</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-8 px-6 border-t border-[#27272a]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#09090b] border border-[rgba(201,168,76,0.3)] flex items-center justify-center">
              <span className="text-[#C9A84C] font-black text-xs leading-none">V</span>
            </div>
            <span className="text-sm font-bold">ValuEngine</span>
            <span className="text-zinc-600 text-sm">© 2026</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-600 text-xs">
            <Link href="/legal" className="hover:text-zinc-400 transition-colors">Mentions légales</Link>
            <span>·</span>
            <Link href="/about" className="hover:text-zinc-400 transition-colors">À propos</Link>
            <span>·</span>
            <Link href="/methodology" className="hover:text-zinc-400 transition-colors">Méthodologie</Link>
            <span>·</span>
            <a href="mailto:contact@valuengine.fr" className="hover:text-zinc-400 transition-colors">Contact</a>
          </div>
          <p className="text-zinc-600 text-xs text-center max-w-sm">
            Outil d&apos;aide à la décision uniquement. Ne constitue pas un conseil en investissement.
          </p>
        </div>
      </footer>

      {/* ── STICKY CTA ───────────────────────────────────────────────── */}
      {showSticky && (
        <button
          onClick={() => router.push("/analyze")}
          className="fixed bottom-6 right-6 z-50 bg-[#C9A84C] hover:bg-[#b8943d] text-[#09090b] font-bold px-5 py-3 rounded-xl shadow-lg shadow-[rgba(201,168,76,0.25)] transition-all hover:scale-105 text-sm"
        >
          Analyser une action →
        </button>
      )}

    </main>
  );
}
