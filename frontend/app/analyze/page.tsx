"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import {
  TrendingUp, TrendingDown, Minus, Search, Settings2,
  ChevronDown, ChevronUp, Loader2, Bell, Trash2, Share2,
} from "lucide-react";
import { FreemiumGate } from "@/components/FreemiumWrapper";
import { analyzeStock, warmupBackend, fmt, pct, currencySymbol, authedFetch, type AnalyzeResponse } from "@/lib/api";
import { gtmEvents } from "@/lib/analytics";
import { SensitivityHeatmap } from "@/components/SensitivityHeatmap";
import { FCFChart } from "@/components/FCFChart";
import { TradingComps } from "@/components/TradingComps";
import { PriceChart } from "@/components/PriceChart";
import AppLayout from "@/components/AppLayout";
import DeepAnalysisSection from "@/components/DeepAnalysisSection";
import AnomaliesSection from "@/components/AnomaliesSection";
import DCFScenariosSection from "@/components/DCFScenariosSection";
import { useProStatus } from "@/hooks/useProStatus";

/* ─────────────── helpers ────────────────────────────────────────────── */

function VerdictBadgePremium({ verdict }: { verdict: string }) {
  if (verdict === "BUY") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Sous-évalué
    </span>
  );
  if (verdict === "SELL") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Surévalué
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Juste valeur
    </span>
  );
}

function VerdictConfig(verdict: string) {
  if (verdict === "BUY")  return { color: "#10b981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)",  icon: <TrendingUp  size={20} />, action: "Potentiel haussier identifié" };
  if (verdict === "SELL") return { color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)",   icon: <TrendingDown size={20} />, action: "Valorisation tendue"            };
  return                         { color: "#C9A84C", bg: "rgba(201,168,76,0.06)",  border: "rgba(201,168,76,0.2)",  icon: <Minus        size={20} />, action: "Zone de juste valeur"           };
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] transition-colors duration-200">
      <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-2">{label}</p>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: color || "#71717a" }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-4 group">
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#C9A84C]">{title}</span>
        <span className="text-zinc-400 group-hover:text-[#C9A84C] transition-colors">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && <div className="animate-[fadeIn_0.3s_ease-out]">{children}</div>}
    </div>
  );
}

/* ── Counter animation hook ──────────────────────────────────────────── */
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return () => setValue(target);
  }, [target, duration]);
  return value;
}

/* ── Skeleton Loading ─────────────────────────────────────────────────── */
function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`bg-[#132032]/80 backdrop-blur-sm rounded-2xl animate-pulse ${className}`} />;
}

function SkeletonDashboard({ ticker }: { ticker: string }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Récupération des données financières",
    "Calcul du DCF et de la valeur intrinsèque",
    "Génération de l'analyse IA Bull & Bear",
    "Finalisation du rapport",
  ];
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 3000),
      setTimeout(() => setStep(2), 8000),
      setTimeout(() => setStep(3), 15000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Progress steps */}
      <div className="max-w-md mx-auto mb-10 mt-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-white">Analyse de <span className="text-[#C9A84C]">{ticker}</span></span>
          <span className="text-xs text-zinc-500">{Math.min(step + 1, steps.length)}/{steps.length}</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-4">
          <div className="bg-[#C9A84C] h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={s} className={`flex items-center gap-3 text-xs transition-colors ${i < step ? "text-emerald-400" : i === step ? "text-[#C9A84C]" : "text-zinc-500"}`}>
              {i < step ? (
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.78 5.22a.75.75 0 00-1.06 0L7 8.94 5.28 7.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25a.75.75 0 000-1.06z" /></svg>
              ) : i === step ? (
                <div className="w-3.5 h-3.5 flex-shrink-0 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full border border-zinc-700" />
              )}
              <span className={i <= step ? "font-medium" : ""}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="space-y-2">
          <SkeletonCard className="h-8 w-56" />
          <SkeletonCard className="h-4 w-36" />
        </div>
        <SkeletonCard className="h-10 w-28" />
      </div>
      <SkeletonCard className="h-36 w-full mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
    </div>
  );
}

/* ── Verdict confidence badge ──────────────────────────────────────────── */
function VerdictBadge({ upsidePct }: { upsidePct: number }) {
  const animatedPct = useCountUp(upsidePct, 1500);
  const abs = Math.abs(upsidePct);
  const clamped = Math.min(abs, 60);
  const barWidth = Math.round((clamped / 60) * 100);
  const color = upsidePct > 15 ? "#00d4aa" : upsidePct < -15 ? "#ff4d6d" : "#C9A84C";
  const label = upsidePct > 15 ? "Potentiel haussier" : upsidePct < -15 ? "Risque de correction" : "Zone de juste valeur";

  return (
    <div className="mt-4 w-full max-w-xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-xl font-black" style={{ color }}>
          {animatedPct > 0 ? "+" : ""}{animatedPct.toFixed(1)}%
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

/* ── SWOT types ──────────────────────────────────────────────────────── */
interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface PestleData {
  political: string;
  economic: string;
  social: string;
  technological: string;
  legal: string;
  environmental: string;
}

/* ─────────────── SWOT Section ───────────────────────────────────────── */
function SwotSection({ ticker }: { ticker: string }) {
  const [data, setData] = useState<SwotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`${API_BASE}/api/ai/swot/${ticker}`, getToken);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: SwotData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl p-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyse SWOT</p>
        {error && <p className="text-[#ff4d6d] text-sm mb-4">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-5 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Génération...</> : "Générer SWOT"}
        </button>
      </div>
    );
  }

  const quadrants = [
    { key: "strengths",     label: "Forces",        items: data.strengths,     border: "#00d4aa", bg: "rgba(0,212,170,0.05)" },
    { key: "weaknesses",    label: "Faiblesses",    items: data.weaknesses,    border: "#ff4d6d", bg: "rgba(255,77,109,0.05)" },
    { key: "opportunities", label: "Opportunités",  items: data.opportunities, border: "#3b82f6", bg: "rgba(59,130,246,0.05)" },
    { key: "threats",       label: "Menaces",       items: data.threats,       border: "#f97316", bg: "rgba(249,115,22,0.05)" },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">Analyse SWOT</p>
        <button onClick={() => setData(null)} className="text-xs text-zinc-400 hover:text-white transition-colors">Régénérer</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quadrants.map(({ key, label, items, border, bg }) => (
          <div key={key} className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${border}40` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: border }}>{label}</p>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#c8d8e8]">
                  <span style={{ color: border }} className="mt-1 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── PESTLE Section ─────────────────────────────────────── */
function PestleSection({ ticker }: { ticker: string }) {
  const [data, setData] = useState<PestleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`${API_BASE}/api/ai/pestle/${ticker}`, getToken);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: PestleData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyse PESTLE</p>
        {error && <p className="text-[#ff4d6d] text-sm mb-4">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-5 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Génération...</> : "Générer PESTLE"}
        </button>
      </div>
    );
  }

  const cards = [
    { key: "political",     label: "Politique",     icon: "🏛️", text: data.political },
    { key: "economic",      label: "Économique",    icon: "📈", text: data.economic },
    { key: "social",        label: "Social",        icon: "👥", text: data.social },
    { key: "technological", label: "Technologique", icon: "💻", text: data.technological },
    { key: "legal",         label: "Légal",         icon: "⚖️", text: data.legal },
    { key: "environmental", label: "Environnement", icon: "🌿", text: data.environmental },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">Analyse PESTLE</p>
        <button onClick={() => setData(null)} className="text-xs text-zinc-400 hover:text-white transition-colors">Régénérer</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ key, label, icon, text }) => (
          <div key={key} className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{icon}</span>
              <p className="text-xs font-bold uppercase tracking-wider text-[#C9A84C]">{label}</p>
            </div>
            <p className="text-sm text-[#c8d8e8] leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── main component ─────────────────────────────────────── */

type TabId = "overview" | "ai" | "valuation" | "comps" | "swot" | "pestle";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Vue d'ensemble" },
  { id: "ai",        label: "Analyse IA" },
  { id: "valuation", label: "Valorisation DCF" },
  { id: "comps",     label: "Comparables" },
  { id: "swot",      label: "SWOT" },
  { id: "pestle",    label: "PESTLE" },
];

/* ─────────────── PriceAlertSection ─────────────────────────────────────── */

interface AlertItem {
  id: string;
  ticker: string;
  ticker_name: string;
  target_price: number;
  condition: string;
  active: boolean;
}

function PriceAlertSection({ ticker, tickerName }: { ticker: string; tickerName: string }) {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const userId = user?.id;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (!userId) return;
    setAlertsLoading(true);
    authedFetch(`${API_BASE}/api/alerts/${userId}`, getToken)
      .then(r => r.ok ? r.json() : [])
      .then((data: AlertItem[]) => setAlerts(data.filter(a => a.ticker === ticker && a.active)))
      .catch(() => {})
      .finally(() => setAlertsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ticker, API_BASE]);

  const handleCreate = async () => {
    const price = parseFloat(targetPrice.replace(",", "."));
    if (isNaN(price) || price <= 0) { setCreateError("Prix invalide"); return; }
    if (!userId || !email) return;
    setCreating(true);
    setCreateError("");
    try {
      const r = await authedFetch(`${API_BASE}/api/alerts`, getToken, {
        method: "POST",
        body: JSON.stringify({ clerk_user_id: userId, email, ticker, ticker_name: tickerName, target_price: price, direction }),
      });
      if (!r.ok) {
        const e = await r.json();
        setCreateError(e.detail || "Erreur lors de la création");
      } else {
        const newAlert = await r.json();
        setAlerts(prev => [newAlert, ...prev]);
        setTargetPrice("");
        setCreateSuccess(true);
        setTimeout(() => setCreateSuccess(false), 3000);
      }
    } catch { setCreateError("Erreur réseau"); }
    setCreating(false);
  };

  const handleDelete = async (alertId: string) => {
    const previousAlerts = [...alerts];
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    try {
      const resp = await authedFetch(`${API_BASE}/api/alerts/${alertId}`, getToken, { method: "DELETE" });
      if (!resp.ok) throw new Error("Delete failed");
    } catch {
      setAlerts(previousAlerts);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div className="mt-8 rounded-2xl border border-[#27272a] bg-[#18181b]/80 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Bell size={16} className="text-[#C9A84C]" />
        <h3 className="text-sm font-bold text-white">Créer une alerte prix</h3>
      </div>

      {/* Create form */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Direction toggle */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-800">
          {(["above", "below"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                direction === d
                  ? "bg-[#C9A84C] text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {d === "above" ? "Au-dessus de" : "En-dessous de"}
            </button>
          ))}
        </div>

        {/* Price input */}
        <input
          type="number"
          value={targetPrice}
          onChange={e => { setTargetPrice(e.target.value); setCreateError(""); }}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          placeholder="Prix cible ($)"
          className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-base sm:text-sm placeholder-zinc-600 focus:outline-none focus:border-[rgba(201,168,76,0.5)] transition-all"
        />

        <button
          onClick={handleCreate}
          disabled={creating || !targetPrice}
          className="flex items-center gap-1.5 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-40 whitespace-nowrap"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          Créer l&apos;alerte
        </button>
      </div>

      {createError && <p className="text-red-400 text-xs mb-3">{createError}</p>}
      {createSuccess && (
        <p className="text-emerald-400 text-xs mb-3">✓ Alerte créée — email envoyé quand le seuil est franchi</p>
      )}

      {/* Active alerts for this ticker */}
      {alertsLoading ? (
        <div className="skeleton h-8 rounded-lg w-full" />
      ) : alerts.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 mb-2">Alertes actives</p>
          <div className="space-y-1.5">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-xs text-zinc-300">
                  <span className="text-zinc-500">{a.condition === "above" ? "↑ Au-dessus de" : "↓ En-dessous de"}</span>
                  {" "}<span className="text-white font-bold">${Number(a.target_price).toFixed(2)}</span>
                </span>
                <button onClick={() => handleDelete(a.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function AnalyzePage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const initialTicker = searchParams.get("ticker") || "";
  const { user }      = useUser();
  const { getToken }  = useAuth();
  const { isPro }     = useProStatus(user?.id);
  const API_BASE_MAIN = process.env.NEXT_PUBLIC_API_URL || "";

  const [ticker,        setTicker]        = useState(initialTicker);
  const [inputValue,    setInputValue]    = useState(initialTicker);
  const [loading,       setLoading]       = useState(false);
  const [retryInfo,     setRetryInfo]     = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [data,          setData]          = useState<AnalyzeResponse | null>(null);
  const [showAdvanced,  setShowAdvanced]  = useState(false);
  const [showPaywall,   setShowPaywall]   = useState(false);
  const [pendingTicker, setPendingTicker] = useState<string | null>(null);
  const isFirstAnalysis = data?.is_first_analysis === true;
  const trialPro = isFirstAnalysis && !isPro;
  const [activeTab,     setActiveTab]     = useState<TabId>("overview");
  const [visitedTabs,  setVisitedTabs]  = useState<Set<TabId>>(() => new Set<TabId>(["overview"]));
  const [shareCopied,  setShareCopied]  = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [growth,   setGrowth]   = useState(8);
  const [wacc,     setWacc]     = useState(10);
  const [terminal, setTerminal] = useState(3);
  const [horizon,  setHorizon]  = useState(5);

  const saveRecent = (result: AnalyzeResponse) => {
    // localStorage fallback pour le dashboard
    try {
      const recent = JSON.parse(localStorage.getItem("ve_recent") || "[]");
      const entry = {
        ticker: result.company.ticker,
        name: result.company.name,
        verdict: result.verdict,
        date: new Date().toLocaleDateString("fr-FR"),
      };
      const updated = [entry, ...recent.filter((r: { ticker: string }) => r.ticker !== entry.ticker)].slice(0, 5);
      localStorage.setItem("ve_recent", JSON.stringify(updated));
    } catch { /* ignore */ }

    // Persistance Supabase
    fetch("/api/db/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: result.company.ticker,
        company_name: result.company.name,
        ticker_name: result.company.name,
        verdict: result.verdict,
        price: result.company.price,
        price_at_analysis: result.company.price,
        intrinsic_value: result.dcf.intrinsic_value,
        upside_pct: result.dcf.upside_pct,
      }),
    }).catch(() => {});
  };

  const handleExportPDF = async () => {
    if (!isPro) {
      gtmEvents.proGateSeen('pdf_export');
      setShowPaywall(true);
      return;
    }
    if (!data) return;
    gtmEvents.pdfExported(data.company.ticker);
    setExportingPDF(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_MAIN}/api/analyze/export-pdf`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: data.company.ticker,
          company_name: data.company.name,
          verdict: data.verdict,
          price: data.company.price,
          intrinsic_price: data.dcf.intrinsic_value,
          kpis: {
            pe_ratio: data.company.pe_ratio,
            pb_ratio: data.company.pb_ratio,
            ev_ebitda: data.company.ev_ebitda,
            profit_margin: data.company.profit_margin != null ? data.company.profit_margin * 100 : null,
            fcf_margin: data.company.free_cash_flow && data.company.revenue
              ? (data.company.free_cash_flow / data.company.revenue) * 100
              : null,
            roe: data.company.roe != null ? data.company.roe * 100 : null,
            debt_to_ebitda: data.company.net_debt && data.company.ebitda
              ? data.company.net_debt / data.company.ebitda
              : null,
            revenue_growth: data.company.revenue_growth != null ? data.company.revenue_growth * 100 : null,
            dividend_yield: data.company.dividend_yield != null ? data.company.dividend_yield * 100 : null,
            beta: data.company.beta,
            market_cap: data.company.market_cap,
            free_cash_flow: data.company.free_cash_flow,
          },
        }),
      });

      if (!response.ok) throw new Error("Erreur generation PDF");

      const blob = await response.blob();
      // Validate response is actually a PDF
      if (!blob.type.includes("pdf") && blob.size < 500) {
        throw new Error("Reponse invalide du serveur");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ValuEngine_${data.company.ticker}_${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erreur lors de l'export PDF. Veuillez réessayer.");
    } finally {
      setExportingPDF(false);
    }
  };

  const doAnalyze = async (symbol: string) => {
    setTicker(symbol);
    setLoading(true);
    setError(null);
    setRetryInfo(null);
    setData(null);
    gtmEvents.firstAnalysisStarted(symbol);
    try {
      const result = await analyzeStock(
        {
          ticker: symbol,
          growth_rate:    growth   / 100,
          wacc:           wacc     / 100,
          terminal_growth:terminal / 100,
          horizon,
        },
        (attempt, max) => setRetryInfo(`Tentative ${attempt}/${max}…`),
      );
      setData(result);
      saveRecent(result);
      gtmEvents.firstAnalysisCompleted(symbol, result.verdict);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(
        msg === "Failed to fetch" || msg.includes("abort")
          ? "Connexion au serveur impossible. Le serveur est peut-être en veille — réessaie dans quelques secondes."
          : msg,
      );
    } finally {
      setLoading(false);
      setRetryInfo(null);
    }
  };

  const runAnalysis = (t: string) => {
    const symbol = t.trim().toUpperCase();
    if (!symbol) return;
    setPendingTicker(symbol);
  };

  // Warmup le backend Railway dès le montage (évite cold start)
  useEffect(() => { warmupBackend(); }, []);
  useEffect(() => { if (initialTicker) runAnalysis(initialTicker); }, []);

  const vc = data ? VerdictConfig(data.verdict) : null;

  return (
    <AppLayout>
      <div className="min-h-screen text-white">

        <FreemiumGate
          pendingTicker={pendingTicker}
          showPaywall={showPaywall}
          onApproved={(t) => { setPendingTicker(null); doAnalyze(t); }}
          onBlocked={() => { setPendingTicker(null); setShowPaywall(true); }}
          onClosePaywall={() => setShowPaywall(false)}
        />

        {/* ── TOP BAR ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl border-b border-[rgba(201,168,76,0.1)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
            <div className="flex-1 flex items-center gap-2 sm:gap-3 max-w-md">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && runAnalysis(inputValue)}
                  placeholder="Ticker (AAPL, TSLA...)"
                  className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm font-semibold text-white placeholder-[#304560] focus:outline-none focus:border-[#C9A84C] transition-all"
                />
              </div>
              <button
                onClick={() => runAnalysis(inputValue)}
                disabled={loading || !inputValue}
                className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold text-sm px-4 sm:px-5 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Analyser"}
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {data && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                    showAdvanced
                      ? "bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.3)] text-[#C9A84C]"
                      : "border-[rgba(255,255,255,0.08)] text-zinc-400 hover:text-white"
                  }`}
                >
                  <Settings2 size={14} />
                  <span className="hidden sm:block">Hypothèses DCF</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">

          {/* ── DCF PARAMS PANEL ──────────────────────────────────────── */}
          {data && showAdvanced && (
            <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.18)] rounded-2xl p-6 mb-8 animate-[slideUp_0.3s_ease-out]">
              <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-5">Hypothèses DCF — modifiez et relancez l&apos;analyse</p>
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

          {/* ── DISCLAIMER ────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-2 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
            <span>⚠️</span>
            <span>
              Outil éducatif uniquement — pas un conseil en investissement.
              Les analyses DCF sont des estimations mathématiques.
              Consulte un professionnel avant toute décision financière.
            </span>
          </div>

          {/* ── SKELETON LOADING ──────────────────────────────────────── */}
          {loading && (
            <>
              {retryInfo && (
                <div className="text-center mb-4">
                  <p className="text-[#C9A84C] text-sm font-medium animate-pulse">{retryInfo}</p>
                  <p className="text-zinc-500 text-xs mt-1">Première requête parfois lente (réveil du serveur)</p>
                </div>
              )}
              <SkeletonDashboard ticker={ticker} />
            </>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-[rgba(255,77,109,0.07)] border border-[rgba(255,77,109,0.2)] rounded-2xl p-8 text-center max-w-lg mx-auto mt-16">
              <p className="text-[#ff4d6d] font-bold text-lg mb-3">Connexion impossible</p>
              <p className="text-[#7a8fa3] text-sm leading-relaxed mb-1">{error}</p>
              <p className="text-zinc-500 text-xs mb-5">Le serveur peut mettre quelques secondes à se réveiller lors de la première requête.</p>
              <button
                onClick={() => runAnalysis(ticker || inputValue)}
                className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-black font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Réessayer l&apos;analyse
              </button>
            </div>
          )}

          {/* ── EMPTY STATE ───────────────────────────────────────────── */}
          {!loading && !error && !data && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
                <Search size={24} className="text-[#C9A84C]" />
              </div>
              <h2 className="text-xl font-bold mb-2">Entre un ticker pour commencer</h2>
              <p className="text-zinc-400 text-sm max-w-xs">
                Exemples :{" "}
                {["AAPL", "MC.PA", "TSLA", "TTE.PA", "NVDA"].map((t, i) => (
                  <span key={t}>
                    <button onClick={() => runAnalysis(t)} className="text-[#C9A84C] hover:underline">{t}</button>
                    {i < 4 ? ", " : ""}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* ── RESULTS ───────────────────────────────────────────────── */}
          {data && vc && (
            <div className="animate-[fadeIn_0.4s_ease-out]">

              {/* Analysis completeness */}
              <div className="flex flex-wrap items-center gap-3 mb-6 px-3 py-2 bg-zinc-900/50 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1">Complétude :</span>
                {([
                  { label: "DCF",     tabId: "overview" as TabId },
                  { label: "Bull/Bear", tabId: "ai" as TabId },
                  { label: "Comps",   tabId: "comps" as TabId },
                  { label: "Matrice", tabId: "valuation" as TabId },
                  { label: "SWOT",    tabId: "swot" as TabId },
                  { label: "PESTLE",  tabId: "pestle" as TabId },
                ] as const).map((s) => (
                  <span key={s.label} className={`text-xs font-medium ${visitedTabs.has(s.tabId) ? "text-emerald-400" : "text-zinc-500"}`}>
                    {visitedTabs.has(s.tabId) ? "\u2713" : "\u2717"} {s.label}
                  </span>
                ))}
              </div>

              {/* Company header */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data.company.name}</h1>
                    <span className="text-zinc-400 text-xl font-light">·</span>
                    <span className="text-xl text-[#6b7d91] font-mono">{data.company.ticker}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-3 py-1 rounded-full">
                      {data.company.sector}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm mt-1">
                    {data.company.industry} · {data.company.exchange}
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/analyze?ticker=${data.company.ticker}`;
                        navigator.clipboard.writeText(url);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }}
                      className="ml-3 text-xs text-zinc-400 hover:text-[#C9A84C] transition-colors inline-flex items-center gap-1 w-full sm:w-auto"
                    >
                      <Share2 size={12} /> {shareCopied ? "Lien copié !" : "Partager"}
                    </button>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {exportingPDF ? (
                      <><Loader2 size={14} className="animate-spin" /> Generation...</>
                    ) : (
                      <>&#128196; Exporter PDF</>
                    )}
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-2xl sm:text-3xl font-black">{currencySymbol(data.company.ticker)}{data.company.price.toFixed(2)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{data.company.currency} · Cours actuel</p>
                </div>
              </div>

              {/* ── TAB BAR ─────────────────────────────────────────────── */}
              <div className="flex border-b border-zinc-800 mb-8 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? "text-white border-b-2 border-[#C9A84C]"
                        : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB 1: VUE D'ENSEMBLE ─────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="animate-fade-in-up">
                  {/* Trial Pro banner */}
                  {trialPro && (
                    <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                      <span className="text-[#C9A84C] text-xl flex-shrink-0">&#10022;</span>
                      <div>
                        <p className="text-[#C9A84C] font-semibold">
                          Analyse Pro offerte &mdash; d&eacute;couvre la puissance compl&egrave;te
                        </p>
                        <p className="text-gray-400 text-sm">
                          Deep Analysis, 3 sc&eacute;narios DCF et anomalies sectorielles d&eacute;bloqu&eacute;s pour cette premi&egrave;re analyse.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Verdict hero card */}
                  <div
                    className="rounded-xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] hover:border-[#3f3f46] transition-colors anim-1"
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${vc.color}15`, color: vc.color }}
                      >
                        {vc.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[2px] text-zinc-500 mb-2">
                          Verdict ValuEngine
                        </p>
                        <VerdictBadgePremium verdict={data.verdict} />
                        <p className="text-zinc-300 text-sm mt-2">{vc.action}</p>
                        <p className="text-[#6b7d91] text-sm mt-2 max-w-lg leading-relaxed">
                          {data.company.name} se négocie{" "}
                          {data.dcf.upside_pct > 0
                            ? `avec une décote de ${Math.abs(data.dcf.upside_pct).toFixed(1)}% par rapport à sa valeur intrinsèque DCF.`
                            : data.dcf.upside_pct < 0
                            ? `avec une prime de ${Math.abs(data.dcf.upside_pct).toFixed(1)}% au-dessus de sa valeur intrinsèque DCF.`
                            : `proche de sa valeur intrinsèque (écart ${data.dcf.upside_pct.toFixed(1)}%).`}
                        </p>
                        <VerdictBadge upsidePct={data.dcf.upside_pct} />
                      </div>
                    </div>
                    {/* Price vs intrinsic side by side */}
                    <div className="flex gap-4 sm:gap-6 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-[#5d7289] uppercase tracking-wider mb-1">Prix actuel</p>
                        <p className="text-2xl sm:text-3xl font-black text-white">{currencySymbol(data.company.ticker)}{data.company.price.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#5d7289] uppercase tracking-wider mb-1">Valeur DCF</p>
                        <p className="text-2xl sm:text-3xl font-black" style={{ color: vc.color }}>
                          {currencySymbol(data.company.ticker)}{data.dcf.intrinsic_value.toFixed(2)}
                        </p>
                        <p className="text-sm font-bold mt-1" style={{ color: vc.color }}>
                          {data.dcf.upside_pct > 0 ? "+" : ""}{data.dcf.upside_pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AMF Warning */}
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/20 mb-6">
                    <span className="text-yellow-400 mt-0.5">⚠️</span>
                    <p className="text-xs text-yellow-200/70 leading-relaxed">
                      Cette estimation est basée sur un modèle DCF mathématique. Elle ne constitue pas un conseil en investissement au sens de la directive MIF II. Fais tes propres recherches.
                    </p>
                  </div>

                  {/* Historical chart */}
                  <Section title="Cours historique">
                    <div className="mb-6 anim-2">
                      <PriceChart ticker={data.company.ticker} currentPrice={data.company.price} />
                    </div>
                  </Section>

                  {/* KPI Grid */}
                  <Section title="Fondamentaux clés">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 anim-3">
                      <KPI label="Market Cap"         value={fmt(data.company.market_cap, currencySymbol(data.company.ticker))} />
                      <KPI label="Chiffre d'affaires" value={fmt(data.company.revenue, currencySymbol(data.company.ticker))} />
                      <KPI label="EBITDA"             value={fmt(data.company.ebitda, currencySymbol(data.company.ticker))} />
                      <KPI label="Résultat net"       value={fmt(data.company.net_income, currencySymbol(data.company.ticker))}
                        color={data.company.net_income > 0 ? "#00d4aa" : "#ff4d6d"}
                        sub={data.company.net_income > 0 ? "▲ Positif" : "▼ Négatif"} />
                      <KPI label="Free Cash Flow"     value={fmt(data.company.free_cash_flow, currencySymbol(data.company.ticker))}
                        color={data.company.free_cash_flow > 0 ? "#00d4aa" : "#ff4d6d"}
                        sub={data.company.free_cash_flow > 0 ? "▲ Génère du cash" : "▼ Consomme du cash"} />
                      <KPI label="Dette nette"        value={fmt(data.company.net_debt, currencySymbol(data.company.ticker))} />
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

                  {/* Anomalies (Niveau 2) — auto-loads */}
                  <AnomaliesSection ticker={data.company.ticker} trialPro={trialPro} />
                </div>
              )}

              {/* ── TAB 2: ANALYSE IA ─────────────────────────────────── */}
              {activeTab === "ai" && (
                <div className="animate-fade-in-up">
                  {/* Deep Analysis Pro (Niveau 1) */}
                  <DeepAnalysisSection ticker={data.company.ticker} trialPro={trialPro} />

                  {/* Bull & Bear (analyse rapide existante) */}
                  <Section title="Bull & Bear Case (aperçu rapide)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
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

                  {/* SWOT */}
                  <SwotSection ticker={data.company.ticker} />

                  {/* PESTLE */}
                  <PestleSection ticker={data.company.ticker} />
                </div>
              )}

              {/* ── TAB 3: VALORISATION ───────────────────────────────── */}
              {activeTab === "valuation" && (
                <div className="animate-fade-in-up">
                  {/* DCF Scenarios Pro (Niveau 3) */}
                  <DCFScenariosSection ticker={data.company.ticker} trialPro={trialPro} />

                  <Section title="Résultats DCF & Projections FCF">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-6">
                        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-5">Modèle DCF</p>
                        {[
                          ["Valeur d'entreprise (EV)",   fmt(data.dcf.enterprise_value_dcf, currencySymbol(data.company.ticker)), ""],
                          ["Valeur des fonds propres",    fmt(data.dcf.equity_value, currencySymbol(data.company.ticker)),         ""],
                          ["Valeur terminale actualisée", fmt(data.dcf.terminal_value_pv, currencySymbol(data.company.ticker)),    ""],
                          ["Valeur intrinsèque / action", `${currencySymbol(data.company.ticker)}${data.dcf.intrinsic_value.toFixed(2)}`, "highlight"],
                          ["Prix de marché actuel",       `${currencySymbol(data.company.ticker)}${data.company.price.toFixed(2)}`, ""],
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

                  <Section title={`Matrice de sensibilité — Valeur intrinsèque (${currencySymbol(data.company.ticker)})`} defaultOpen={false}>
                    <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-6 mb-6">
                      <p className="text-xs text-[#5d7289] mb-5">
                        Lignes = Croissance FCF · Colonnes = WACC · Vert = sous-évalué · Rouge = surévalué (vs {currencySymbol(data.company.ticker)}{data.company.price.toFixed(2)})
                      </p>
                      <div className="overflow-x-auto">
                        <div className="min-w-[400px]">
                          <SensitivityHeatmap data={data.sensitivity} currentPrice={data.company.price} />
                        </div>
                      </div>
                    </div>
                  </Section>

                  {/* DCF params panel inline */}
                  <Section title="Paramètres DCF" defaultOpen={false}>
                    <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.18)] rounded-2xl p-6">
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
                        onClick={() => runAnalysis(ticker)}
                        className="mt-5 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold text-sm px-6 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.35)] transition-all"
                      >
                        Relancer avec ces hypothèses
                      </button>
                    </div>
                  </Section>
                </div>
              )}

              {/* ── TAB 4: COMPARABLES ────────────────────────────────── */}
              {activeTab === "comps" && (
                <div className="animate-fade-in-up">
                  <Section title="Comparaison sectorielle — Trading Comps">
                    <div className="overflow-x-auto">
                      <TradingComps ticker={data.company.ticker} sector={data.company.sector} />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── TAB 5: SWOT ───────────────────────────────────────── */}
              {activeTab === "swot" && (
                <div className="animate-fade-in-up">
                  <SwotSection ticker={data.company.ticker} />
                </div>
              )}

              {/* ── TAB 6: PESTLE ─────────────────────────────────────── */}
              {activeTab === "pestle" && (
                <div className="animate-fade-in-up">
                  <PestleSection ticker={data.company.ticker} />
                </div>
              )}

              {/* ── Price Alert ─────────────────────────────────────── */}
              <PriceAlertSection ticker={data.company.ticker} tickerName={data.company.name} />

              {/* Pro conversion CTA after trial */}
              {trialPro && (
                <div className="bg-[#18181b]/80 border border-[#C9A84C]/30 rounded-2xl p-8 text-center mt-8">
                  <p className="text-[#C9A84C] font-bold text-lg mb-2">
                    Tu viens de voir ValuEngine Pro en action &#10022;
                  </p>
                  <p className="text-gray-300 mb-6">
                    Deep Analysis, 3 sc&eacute;narios DCF, d&eacute;tection d&apos;anomalies,
                    export PDF, screener IA &mdash; tout &ccedil;a pour 99&euro;/an.
                  </p>
                  <button
                    onClick={() => router.push("/#pricing")}
                    className="bg-[#C9A84C] text-black font-bold rounded-xl px-8 py-3 hover:bg-[#A8863C] transition-all"
                  >
                    Passer Pro &#10022;
                  </button>
                  <p className="text-gray-500 text-xs mt-3">
                    Sinon, tu gardes 3 analyses gratuites par jour.
                  </p>
                </div>
              )}

              <p className="text-[#2a3a4a] text-xs text-center mt-8 pb-4">
                ValuEngine est un outil d&apos;analyse éducatif uniquement. Les analyses ne constituent pas des conseils en investissement au sens de la directive MIF II.
                FCF issu des données Yahoo Finance. Tout investissement comporte des risques. · ValuEngine 2026
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function AnalyzePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AnalyzePage />
    </Suspense>
  );
}
