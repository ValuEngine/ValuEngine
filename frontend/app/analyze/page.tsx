"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Minus, Search, Settings2,
  ChevronDown, ChevronUp, ArrowLeft, Loader2,
} from "lucide-react";
import { NavAuthCompact } from "@/components/NavAuth";
import { FreemiumGate } from "@/components/FreemiumWrapper";
import { analyzeStock, fmt, pct, type AnalyzeResponse } from "@/lib/api";
import { SensitivityHeatmap } from "@/components/SensitivityHeatmap";
import { FCFChart } from "@/components/FCFChart";
import { TradingComps } from "@/components/TradingComps";
import { PriceChart } from "@/components/PriceChart";

/* ─────────────── helpers ────────────────────────────────────────────── */

function VerdictConfig(verdict: string) {
  if (verdict === "BUY")  return { color: "#00d4aa", bg: "rgba(0,212,170,0.08)",  border: "rgba(0,212,170,0.3)",  icon: <TrendingUp  size={20} />, action: "ACHETER / ACCUMULER" };
  if (verdict === "SELL") return { color: "#ff4d6d", bg: "rgba(255,77,109,0.08)", border: "rgba(255,77,109,0.3)", icon: <TrendingDown size={20} />, action: "VENDRE / ALLÉGER"    };
  return                         { color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.3)", icon: <Minus        size={20} />, action: "CONSERVER / SURVEILLER" };
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C9A84C] to-transparent" />
      <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#4a6070] mb-2">{label}</p>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: color || "#5d7289" }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-4 group">
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#C9A84C]">{title}</span>
        <span className="text-[#4a6070] group-hover:text-[#C9A84C] transition-colors">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && <div className="animate-[fadeIn_0.3s_ease-out]">{children}</div>}
    </div>
  );
}

/* ── Skeleton Loading ─────────────────────────────────────────────────── */
function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`bg-[#132032] rounded-2xl animate-pulse ${className}`} />;
}

function SkeletonDashboard({ ticker }: { ticker: string }) {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Company header skeleton */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="space-y-2">
          <SkeletonCard className="h-8 w-56" />
          <SkeletonCard className="h-4 w-36" />
        </div>
        <SkeletonCard className="h-10 w-28" />
      </div>

      {/* Verdict skeleton */}
      <SkeletonCard className="h-36 w-full mb-8" />

      {/* AI analysis skeleton */}
      <div className="mb-4">
        <SkeletonCard className="h-4 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
      </div>

      {/* KPI grid skeleton */}
      <div className="mb-4">
        <SkeletonCard className="h-4 w-36 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
        </div>
      </div>

      {/* DCF + chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>

      <p className="text-[#3a5070] text-sm text-center mt-4 animate-pulse">
        Analyse de <span className="text-[#C9A84C] font-bold">{ticker}</span> en cours — récupération des données · DCF · IA…
      </p>
    </div>
  );
}

/* ── Verdict confidence badge ──────────────────────────────────────────── */
function VerdictBadge({ upsidePct }: { upsidePct: number }) {
  const abs = Math.abs(upsidePct);
  const clamped = Math.min(abs, 60); // cap at 60% for bar width
  const barWidth = Math.round((clamped / 60) * 100);
  const color = upsidePct > 15 ? "#00d4aa" : upsidePct < -15 ? "#ff4d6d" : "#C9A84C";
  const label = upsidePct > 15 ? "Potentiel haussier" : upsidePct < -15 ? "Risque de correction" : "Zone de juste valeur";

  return (
    <div className="mt-4 w-full max-w-xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-xl font-black" style={{ color }}>
          {upsidePct > 0 ? "+" : ""}{upsidePct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barWidth}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ─────────────── main component ─────────────────────────────────────── */

function AnalyzePage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const initialTicker = searchParams.get("ticker") || "";

  const [ticker,        setTicker]        = useState(initialTicker);
  const [inputValue,    setInputValue]    = useState(initialTicker);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [data,          setData]          = useState<AnalyzeResponse | null>(null);
  const [showAdvanced,  setShowAdvanced]  = useState(false);
  const [showPaywall,   setShowPaywall]   = useState(false);
  const [pendingTicker, setPendingTicker] = useState<string | null>(null);

  const [growth,   setGrowth]   = useState(8);
  const [wacc,     setWacc]     = useState(10);
  const [terminal, setTerminal] = useState(3);
  const [horizon,  setHorizon]  = useState(5);

  const doAnalyze = async (symbol: string) => {
    setTicker(symbol);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await analyzeStock({
        ticker: symbol,
        growth_rate:    growth   / 100,
        wacc:           wacc     / 100,
        terminal_growth:terminal / 100,
        horizon,
      });
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = (t: string) => {
    const symbol = t.trim().toUpperCase();
    if (!symbol) return;
    setPendingTicker(symbol);
  };

  useEffect(() => { if (initialTicker) runAnalysis(initialTicker); }, []);

  const vc = data ? VerdictConfig(data.verdict) : null;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">

      <FreemiumGate
        pendingTicker={pendingTicker}
        showPaywall={showPaywall}
        onApproved={(t) => { setPendingTicker(null); doAnalyze(t); }}
        onBlocked={() => { setPendingTicker(null); setShowPaywall(true); }}
        onClosePaywall={() => setShowPaywall(false)}
      />

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[rgba(10,22,40,0.92)] backdrop-blur-xl border-b border-[rgba(201,168,76,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
          <button onClick={() => router.push("/")} className="text-[#4a6070] hover:text-white transition-colors mr-1 sm:mr-2 flex-shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 mr-2 sm:mr-4 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center">
              <TrendingUp size={14} className="text-[#0a1628]" />
            </div>
            <span className="text-sm font-bold hidden sm:block">ValuEngine</span>
          </div>

          <div className="flex-1 flex items-center gap-2 sm:gap-3 max-w-md">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a6070]" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && runAnalysis(inputValue)}
                placeholder="Ticker (AAPL, TSLA...)"
                className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-white placeholder-[#304560] focus:outline-none focus:border-[#C9A84C] transition-all"
              />
            </div>
            <button
              onClick={() => runAnalysis(inputValue)}
              disabled={loading || !inputValue}
              className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold text-sm px-4 sm:px-5 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Analyser"}
            </button>
          </div>

          {/* Auth + DCF toggle */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {data && (
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                  showAdvanced
                    ? "bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.3)] text-[#C9A84C]"
                    : "border-[rgba(255,255,255,0.08)] text-[#4a6070] hover:text-white"
                }`}
              >
                <Settings2 size={14} />
                <span className="hidden sm:block">Hypothèses DCF</span>
              </button>
            )}
            <NavAuthCompact />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── DCF PARAMS PANEL ──────────────────────────────────────── */}
        {data && showAdvanced && (
          <div className="bg-[#132032] border border-[rgba(201,168,76,0.18)] rounded-2xl p-6 mb-8 animate-[slideUp_0.3s_ease-out]">
            <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-5">Hypothèses DCF — modifiez et relancez l'analyse</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Croissance FCF",    value: growth,   set: setGrowth,   min: 1, max: 30, suffix: "%" },
                { label: "WACC",              value: wacc,     set: setWacc,     min: 2, max: 25, suffix: "%" },
                { label: "Croiss. terminale", value: terminal, set: setTerminal, min: 1, max: 6,  suffix: "%" },
                { label: "Horizon (ans)",     value: horizon,  set: setHorizon,  min: 3, max: 10, suffix: "ans" },
              ].map(({ label, value, set, min, max, suffix }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#5d7289]">{label}</span>
                    <span className="text-sm font-bold text-[#C9A84C]">{value}{suffix}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} value={value}
                    onChange={(e) => set(Number(e.target.value))}
                    className="w-full accent-[#C9A84C] cursor-pointer"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowAdvanced(false); runAnalysis(ticker); }}
              className="mt-5 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold text-sm px-6 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.35)] transition-all"
            >
              Relancer avec ces hypothèses
            </button>
          </div>
        )}

        {/* ── SKELETON LOADING ──────────────────────────────────────── */}
        {loading && <SkeletonDashboard ticker={ticker} />}

        {/* ── ERROR ─────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-[rgba(255,77,109,0.07)] border border-[rgba(255,77,109,0.2)] rounded-2xl p-6 text-center max-w-lg mx-auto mt-16">
            <p className="text-[#ff4d6d] font-bold mb-2">Erreur</p>
            <p className="text-[#7a8fa3] text-sm">{error}</p>
            <button onClick={() => runAnalysis(inputValue)} className="mt-4 text-sm text-[#C9A84C] hover:underline">
              Réessayer
            </button>
          </div>
        )}

        {/* ── EMPTY STATE ───────────────────────────────────────────── */}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
              <Search size={24} className="text-[#C9A84C]" />
            </div>
            <h2 className="text-xl font-bold mb-2">Entrez un ticker pour commencer</h2>
            <p className="text-[#4a6070] text-sm max-w-xs">
              Exemples :{" "}
              {["AAPL", "TSLA", "NVDA"].map((t, i) => (
                <span key={t}>
                  <button onClick={() => runAnalysis(t)} className="text-[#C9A84C] hover:underline">{t}</button>
                  {i < 2 ? ", " : ""}
                </span>
              ))}
            </p>
          </div>
        )}

        {/* ── RESULTS ───────────────────────────────────────────────── */}
        {data && vc && (
          <div className="animate-[fadeIn_0.4s_ease-out]">

            {/* Company header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data.company.name}</h1>
                  <span className="text-[#4a6070] text-xl font-light">·</span>
                  <span className="text-xl text-[#6b7d91] font-mono">{data.company.ticker}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-3 py-1 rounded-full">
                    {data.company.sector}
                  </span>
                </div>
                <p className="text-[#4a6070] text-sm mt-1">{data.company.industry} · {data.company.exchange}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black">${data.company.price.toFixed(2)}</p>
                <p className="text-xs text-[#4a6070] mt-0.5">{data.company.currency} · Cours actuel</p>
              </div>
            </div>

            {/* ── VERDICT — hero card ─────────────────────────────── */}
            <div
              className="rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-l-[5px]"
              style={{ background: vc.bg, borderColor: vc.color, borderWidth: "1px", borderLeftWidth: "5px" }}
            >
              <div className="flex items-start gap-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${vc.color}18`, color: vc.color }}
                >
                  {vc.icon}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[2.5px] mb-1" style={{ color: vc.color }}>
                    Verdict ValuEngine
                  </p>
                  <p className="text-3xl font-black" style={{ color: vc.color }}>{data.verdict_label}</p>
                  <p className="text-white font-semibold text-sm mt-1">{vc.action}</p>
                  <p className="text-[#6b7d91] text-sm mt-2 max-w-lg leading-relaxed">
                    {data.company.name} se négocie{" "}
                    {data.dcf.upside_pct > 0
                      ? `avec une décote de ${Math.abs(data.dcf.upside_pct).toFixed(1)}% par rapport à sa valeur intrinsèque DCF.`
                      : data.dcf.upside_pct < 0
                      ? `avec une prime de ${Math.abs(data.dcf.upside_pct).toFixed(1)}% au-dessus de sa valeur intrinsèque DCF.`
                      : `proche de sa valeur intrinsèque (écart ${data.dcf.upside_pct.toFixed(1)}%).`}
                  </p>
                  {/* Confidence badge */}
                  <VerdictBadge upsidePct={data.dcf.upside_pct} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-[#5d7289] uppercase tracking-wider mb-1">Valeur cible DCF</p>
                <p className="text-5xl font-black" style={{ color: vc.color }}>
                  ${data.dcf.intrinsic_value.toFixed(2)}
                </p>
                <p className="text-sm text-[#5d7289] mt-1.5">
                  vs ${data.company.price.toFixed(2)} aujourd'hui
                </p>
                <p className="text-lg font-bold mt-1" style={{ color: vc.color }}>
                  {data.dcf.upside_pct > 0 ? "+" : ""}{data.dcf.upside_pct.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* ── COURS HISTORIQUE ─────────────────────────────────── */}
            <Section title="Cours historique">
              <div className="mb-6">
                <PriceChart ticker={data.company.ticker} currentPrice={data.company.price} />
              </div>
            </Section>

            {/* ── AI BULL & BEAR ───────────────────────────────────── */}
            <Section title="Analyse IA — Bull & Bear Case">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {[
                  { key: "bull_case", label: "BULL CASE — Scénario Haussier", color: "#00d4aa", bg: "rgba(0,212,170,0.05)", border: "rgba(0,212,170,0.2)" },
                  { key: "bear_case", label: "BEAR CASE — Scénario Baissier", color: "#ff4d6d", bg: "rgba(255,77,109,0.05)", border: "rgba(255,77,109,0.2)" },
                ].map(({ key, label, color, bg, border }) => (
                  <div key={key} className="rounded-2xl p-6" style={{ background: bg, border: `1px solid ${border}` }}>
                    <p className="text-xs font-bold uppercase tracking-[2px] mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]" style={{ color }}>
                      {label}
                    </p>
                    <div className="text-sm text-[#c8d8e8] leading-7 whitespace-pre-line">
                      {data.analysis[key as "bull_case" | "bear_case"]}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── KPI GRID ─────────────────────────────────────────── */}
            <Section title="Fondamentaux clés">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                <KPI label="Market Cap"         value={fmt(data.company.market_cap)} />
                <KPI label="Chiffre d'affaires" value={fmt(data.company.revenue)} />
                <KPI label="EBITDA"             value={fmt(data.company.ebitda)} />
                <KPI label="Résultat net"       value={fmt(data.company.net_income)}
                  color={data.company.net_income > 0 ? "#00d4aa" : "#ff4d6d"}
                  sub={data.company.net_income > 0 ? "▲ Positif" : "▼ Négatif"} />
                <KPI label="Free Cash Flow"     value={fmt(data.company.free_cash_flow)}
                  color={data.company.free_cash_flow > 0 ? "#00d4aa" : "#ff4d6d"}
                  sub={data.company.free_cash_flow > 0 ? "▲ Génère du cash" : "▼ Consomme du cash"} />
                <KPI label="Dette nette"        value={fmt(data.company.net_debt)} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                <KPI label="P/E Ratio"   value={data.company.pe_ratio != null ? `${data.company.pe_ratio.toFixed(1)}x` : "N/A"}
                  sub={data.company.pe_ratio != null ? (data.company.pe_ratio > 30 ? "Élevé" : "Modéré") : ""} />
                <KPI label="EV/EBITDA"  value={data.company.ev_ebitda != null ? `${data.company.ev_ebitda.toFixed(1)}x` : "N/A"} />
                <KPI label="P/B Ratio"  value={data.company.pb_ratio != null ? `${data.company.pb_ratio.toFixed(1)}x` : "N/A"} />
                <KPI label="ROE"        value={data.company.roe != null ? `${(data.company.roe * 100).toFixed(1)}%` : "N/A"}
                  color={data.company.roe != null && data.company.roe > 0.15 ? "#00d4aa" : undefined} />
                <KPI label="Croissance CA" value={data.company.revenue_growth != null ? pct(data.company.revenue_growth) : "N/A"}
                  color={data.company.revenue_growth != null && data.company.revenue_growth > 0 ? "#00d4aa" : "#ff4d6d"} />
                <KPI label="Beta"       value={data.company.beta != null ? data.company.beta.toFixed(2) : "N/A"}
                  sub={data.company.beta != null ? (data.company.beta > 1.2 ? "Volatil" : data.company.beta < 0.8 ? "Défensif" : "Neutre") : ""} />
              </div>
            </Section>

            {/* ── DCF RESULTS ──────────────────────────────────────── */}
            <Section title="Résultats DCF & Projections FCF">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-5">Modèle DCF</p>
                  {[
                    ["Valeur d'entreprise (EV)",   fmt(data.dcf.enterprise_value_dcf), ""],
                    ["Valeur des fonds propres",    fmt(data.dcf.equity_value),         ""],
                    ["Valeur terminale actualisée", fmt(data.dcf.terminal_value_pv),    ""],
                    ["Valeur intrinsèque / action", `$${data.dcf.intrinsic_value.toFixed(2)}`, "highlight"],
                    ["Prix de marché actuel",       `$${data.company.price.toFixed(2)}`, ""],
                    ["Potentiel",                   `${data.dcf.upside_pct > 0 ? "+" : ""}${data.dcf.upside_pct.toFixed(1)}%`,
                      data.dcf.upside_pct > 0 ? "pos" : data.dcf.upside_pct < 0 ? "neg" : ""],
                  ].map(([label, value, cls]) => (
                    <div key={label} className={`flex justify-between items-center py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 ${cls === "highlight" ? "bg-[rgba(201,168,76,0.05)] -mx-2 px-2 rounded-lg" : ""}`}>
                      <span className="text-sm text-[#6b7d91]">{label}</span>
                      <span className={`text-sm font-bold ${cls === "pos" ? "text-[#00d4aa]" : cls === "neg" ? "text-[#ff4d6d]" : cls === "highlight" ? "text-[#C9A84C] text-base" : "text-white"}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-5">Projections Free Cash Flow</p>
                  <FCFChart projections={data.dcf.fcf_projections} />
                </div>
              </div>
            </Section>

            {/* ── SENSITIVITY MATRIX ───────────────────────────────── */}
            <Section title="Matrice de sensibilité — Valeur intrinsèque ($)" defaultOpen={false}>
              {/* Mobile: horizontal scroll wrapper */}
              <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-6 mb-6">
                <p className="text-xs text-[#5d7289] mb-5">
                  Lignes = Croissance FCF · Colonnes = WACC · Vert = sous-évalué · Rouge = surévalué (vs ${data.company.price.toFixed(2)})
                </p>
                <div className="overflow-x-auto">
                  <SensitivityHeatmap data={data.sensitivity} currentPrice={data.company.price} />
                </div>
              </div>
            </Section>

            {/* ── TRADING COMPS ────────────────────────────────────── */}
            <Section title="Comparaison sectorielle — Trading Comps" defaultOpen={false}>
              <TradingComps ticker={data.company.ticker} sector={data.company.sector} />
            </Section>

            <p className="text-[#2a3a4a] text-xs text-center mt-8 pb-4">
              ValuEngine est un outil d'aide à la décision. Les analyses ne constituent pas des conseils en investissement.
              FCF issu des données Yahoo Finance. Tout investissement comporte des risques. · ValuEngine 2025
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyzePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1628]" />}>
      <AnalyzePage />
    </Suspense>
  );
}
