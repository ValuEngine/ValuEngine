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
import Tabs from "@/components/ui/Tabs";

/* ─────────────── helpers ────────────────────────────────────────────── */

function VerdictBadgePremium({ verdict }: { verdict: string }) {
  if (verdict === "BUY") return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border"
      style={{ background: "rgba(0,230,138,0.1)", color: "var(--color-success)", borderColor: "rgba(0,230,138,0.2)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
      Sous-évalué
    </span>
  );
  if (verdict === "SELL") return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border"
      style={{ background: "rgba(255,84,112,0.1)", color: "var(--color-danger)", borderColor: "rgba(255,84,112,0.2)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-danger)" }} />
      Surévalué
    </span>
  );
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border"
      style={{ background: "rgba(255,184,77,0.1)", color: "var(--color-warning)", borderColor: "rgba(255,184,77,0.2)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-warning)" }} />
      Juste valeur
    </span>
  );
}

function VerdictConfig(verdict: string) {
  if (verdict === "BUY")  return { color: "var(--color-success)", rawColor: "#00E68A", bg: "rgba(0,230,138,0.06)",   border: "rgba(0,230,138,0.2)",   icon: <TrendingUp  size={20} />, action: "Potentiel haussier identifié" };
  if (verdict === "SELL") return { color: "var(--color-danger)",  rawColor: "#FF5470", bg: "rgba(255,84,112,0.06)",  border: "rgba(255,84,112,0.2)",  icon: <TrendingDown size={20} />, action: "Valorisation tendue"            };
  return                         { color: "var(--color-warning)", rawColor: "#FFB84D", bg: "rgba(255,184,77,0.06)",  border: "rgba(255,184,77,0.2)",  icon: <Minus        size={20} />, action: "Zone de juste valeur"           };
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div
      className="card rounded-xl p-4 transition-colors duration-200"
    >
      <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      <p className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: color || "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-4 group">
        <span className="text-lg font-semibold" style={{ color: "var(--accent-primary)" }}>{title}</span>
        <span className="transition-colors" style={{ color: "var(--text-secondary)" }}>
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
  return (
    <div
      className={`backdrop-blur-sm rounded-2xl animate-pulse ${className}`}
      style={{ background: "rgba(19,32,50,0.8)" }}
    />
  );
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
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Analyse de <span style={{ color: "var(--accent-primary)" }}>{ticker}</span>
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{Math.min(step + 1, steps.length)}/{steps.length}</span>
        </div>
        <div className="w-full rounded-full h-1.5 mb-4" style={{ background: "var(--bg-overlay)" }}>
          <div
            className="h-1.5 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%`, background: "var(--accent-primary)" }}
          />
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-3 text-xs transition-colors"
              style={{
                color: i < step
                  ? "var(--color-success)"
                  : i === step
                  ? "var(--accent-primary)"
                  : "var(--text-tertiary)",
              }}
            >
              {i < step ? (
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.78 5.22a.75.75 0 00-1.06 0L7 8.94 5.28 7.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25a.75.75 0 000-1.06z" /></svg>
              ) : i === step ? (
                <div className="w-3.5 h-3.5 flex-shrink-0 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
              ) : (
                <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full border" style={{ borderColor: "var(--border-default)" }} />
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
  const color = upsidePct > 15 ? "var(--color-success)" : upsidePct < -15 ? "var(--color-danger)" : "var(--color-warning)";
  const label = upsidePct > 15 ? "Potentiel haussier" : upsidePct < -15 ? "Risque de correction" : "Zone de juste valeur";

  return (
    <div className="mt-4 w-full max-w-xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium" style={{ color }}>{label}</span>
        <span className="text-xl font-black" style={{ color }}>
          {animatedPct > 0 ? "+" : ""}{animatedPct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
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
      <div
        className="rounded-2xl p-6 mb-6 border"
        style={{ background: "rgba(19,32,50,0.8)", borderColor: "rgba(108,92,231,0.14)" }}
      >
        <p className="text-lg font-semibold mb-4" style={{ color: "var(--accent-primary)" }}>Analyse SWOT</p>
        {error && <p className="text-sm mb-4" style={{ color: "var(--color-danger)" }}>{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Génération...</> : "Générer SWOT"}
        </button>
      </div>
    );
  }

  const quadrants = [
    { key: "strengths",     label: "Forces",        items: data.strengths,     border: "#00E68A", bg: "rgba(0,230,138,0.05)" },
    { key: "weaknesses",    label: "Faiblesses",    items: data.weaknesses,    border: "#FF5470", bg: "rgba(255,84,112,0.05)" },
    { key: "opportunities", label: "Opportunités",  items: data.opportunities, border: "#54B8FF", bg: "rgba(84,184,255,0.05)" },
    { key: "threats",       label: "Menaces",       items: data.threats,       border: "#FFB84D", bg: "rgba(255,184,77,0.05)" },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg font-semibold" style={{ color: "var(--accent-primary)" }}>Analyse SWOT</p>
        <button
          onClick={() => setData(null)}
          className="text-xs transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          Régénérer
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quadrants.map(({ key, label, items, border, bg }) => (
          <div key={key} className="rounded-2xl p-5" style={{ background: bg, border: `1px solid ${border}40` }}>
            <p className="text-[13px] font-medium uppercase tracking-wider mb-3" style={{ color: border }}>{label}</p>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
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
      <div
        className="rounded-2xl p-6 border"
        style={{ background: "rgba(19,32,50,0.8)", borderColor: "rgba(108,92,231,0.14)" }}
      >
        <p className="text-lg font-semibold mb-4" style={{ color: "var(--accent-primary)" }}>Analyse PESTLE</p>
        {error && <p className="text-sm mb-4" style={{ color: "var(--color-danger)" }}>{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
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
        <p className="text-lg font-semibold" style={{ color: "var(--accent-primary)" }}>Analyse PESTLE</p>
        <button
          onClick={() => setData(null)}
          className="text-xs transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          Régénérer
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ key, label, icon, text }) => (
          <div
            key={key}
            className="rounded-2xl p-5 border"
            style={{
              background: "linear-gradient(to bottom, var(--bg-elevated), var(--bg-surface))",
              borderColor: "rgba(108,92,231,0.14)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{icon}</span>
              <p className="text-[13px] font-medium uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>{label}</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── main component ─────────────────────────────────────── */

type NewTabId = "overview" | "dcf" | "deep";

const ANALYSIS_TABS: { id: NewTabId; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "dcf",      label: "DCF & Scénarios" },
  { id: "deep",     label: "Analyse profonde" },
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
    <div
      className="mt-8 rounded-2xl border p-6"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Bell size={16} style={{ color: "var(--accent-primary)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Créer une alerte prix</h3>
      </div>

      {/* Create form */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Direction toggle */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border-default)" }}>
          {(["above", "below"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className="px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                background: direction === d ? "var(--accent-primary)" : "var(--bg-elevated)",
                color: direction === d ? "#fff" : "var(--text-secondary)",
              }}
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
          className="flex-1 min-w-[140px] rounded-lg px-4 py-2 text-base sm:text-sm placeholder-[#5A5A72] focus:outline-none transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "rgba(108,92,231,0.5)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--border-default)")}
        />

        <button
          onClick={handleCreate}
          disabled={creating || !targetPrice}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-40 whitespace-nowrap"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          Créer l&apos;alerte
        </button>
      </div>

      {createError && <p className="text-xs mb-3" style={{ color: "var(--color-danger)" }}>{createError}</p>}
      {createSuccess && (
        <p className="text-xs mb-3" style={{ color: "var(--color-success)" }}>&#10003; Alerte créée — email envoyé quand le seuil est franchi</p>
      )}

      {/* Active alerts for this ticker */}
      {alertsLoading ? (
        <div className="skeleton h-8 rounded-lg w-full" />
      ) : alerts.length > 0 && (
        <div>
          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>Alertes actives</p>
          <div className="space-y-1.5">
            {alerts.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
              >
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>{a.condition === "above" ? "↑ Au-dessus de" : "↓ En-dessous de"}</span>
                  {" "}<span className="font-bold" style={{ color: "var(--text-primary)" }}>${Number(a.target_price).toFixed(2)}</span>
                </span>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--color-danger)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
                >
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
  const [activeTab,    setActiveTab]    = useState<NewTabId>("overview");
  const [visitedTabs,  setVisitedTabs]  = useState<Set<NewTabId>>(() => new Set<NewTabId>(["overview"]));
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
      <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>

        <FreemiumGate
          pendingTicker={pendingTicker}
          showPaywall={showPaywall}
          onApproved={(t) => { setPendingTicker(null); doAnalyze(t); }}
          onBlocked={() => { setPendingTicker(null); setShowPaywall(true); }}
          onClosePaywall={() => setShowPaywall(false)}
        />

        {/* ── TOP BAR ─────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40 backdrop-blur-xl border-b"
          style={{
            background: "rgba(10,10,15,0.85)",
            borderColor: "rgba(108,92,231,0.12)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4">
            <div className="flex-1 flex items-center gap-2 sm:gap-3 max-w-md">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && runAnalysis(inputValue)}
                  placeholder="Ticker (AAPL, TSLA...)"
                  className="w-full rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm font-semibold focus:outline-none transition-all"
                  style={{
                    background: "rgba(27,45,69,0.9)",
                    border: "1px solid rgba(108,92,231,0.25)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(108,92,231,0.25)")}
                />
              </div>
              <button
                onClick={() => runAnalysis(inputValue)}
                disabled={loading || !inputValue}
                className="btn-primary text-sm px-4 sm:px-5 py-2.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Analyser"}
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {data && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-all"
                  style={{
                    background: showAdvanced ? "rgba(108,92,231,0.12)" : "transparent",
                    borderColor: showAdvanced ? "rgba(108,92,231,0.3)" : "var(--border-subtle)",
                    color: showAdvanced ? "var(--accent-primary)" : "var(--text-secondary)",
                  }}
                  onMouseEnter={e => { if (!showAdvanced) e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { if (!showAdvanced) e.currentTarget.style.color = "var(--text-secondary)"; }}
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
            <div
              className="backdrop-blur-sm rounded-2xl p-6 mb-8 animate-[slideUp_0.3s_ease-out] border"
              style={{
                background: "rgba(19,32,50,0.8)",
                borderColor: "rgba(108,92,231,0.18)",
              }}
            >
              <p className="text-lg font-semibold mb-5" style={{ color: "var(--accent-primary)" }}>
                Hypothèses DCF — modifiez et relancez l&apos;analyse
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Croissance FCF",    value: growth,   set: setGrowth,   min: 1, max: 30, suffix: "%" },
                  { label: "WACC",              value: wacc,     set: setWacc,     min: 2, max: 25, suffix: "%" },
                  { label: "Croiss. terminale", value: terminal, set: setTerminal, min: 1, max: 6,  suffix: "%" },
                  { label: "Horizon (ans)",     value: horizon,  set: setHorizon,  min: 3, max: 10, suffix: "ans" },
                ].map(({ label, value, set, min, max, suffix }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                      <span className="text-sm font-bold" style={{ color: "var(--accent-primary)" }}>{value}{suffix}</span>
                    </div>
                    <input
                      type="range" min={min} max={max} value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="w-full cursor-pointer accent-[#6C5CE7]"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowAdvanced(false); runAnalysis(ticker); }}
                className="btn-primary mt-5 text-sm px-6 py-2.5"
              >
                Relancer avec ces hypothèses
              </button>
            </div>
          )}

          {/* ── DISCLAIMER ────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-4 py-2 mb-4 rounded-lg border text-xs"
            style={{
              background: "rgba(255,184,77,0.08)",
              borderColor: "rgba(255,184,77,0.25)",
              color: "var(--color-warning)",
            }}
          >
            <span>&#9888;&#65039;</span>
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
                  <p className="text-sm font-medium animate-pulse" style={{ color: "var(--accent-primary)" }}>{retryInfo}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Première requête parfois lente (réveil du serveur)</p>
                </div>
              )}
              <SkeletonDashboard ticker={ticker} />
            </>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────── */}
          {error && (
            <div
              className="rounded-2xl p-8 text-center max-w-lg mx-auto mt-16 border"
              style={{
                background: "rgba(255,84,112,0.07)",
                borderColor: "rgba(255,84,112,0.2)",
              }}
            >
              <p className="font-bold text-lg mb-3" style={{ color: "var(--color-danger)" }}>Connexion impossible</p>
              <p className="text-sm leading-relaxed mb-1" style={{ color: "var(--text-secondary)" }}>{error}</p>
              <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>Le serveur peut mettre quelques secondes à se réveiller lors de la première requête.</p>
              <button
                onClick={() => runAnalysis(ticker || inputValue)}
                className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-2.5"
              >
                Réessayer l&apos;analyse
              </button>
            </div>
          )}

          {/* ── EMPTY STATE ───────────────────────────────────────────── */}
          {!loading && !error && !data && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border"
                style={{
                  background: "rgba(108,92,231,0.08)",
                  borderColor: "rgba(108,92,231,0.18)",
                }}
              >
                <Search size={24} style={{ color: "var(--accent-primary)" }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Entre un ticker pour commencer</h2>
              <p className="text-sm max-w-xs" style={{ color: "var(--text-secondary)" }}>
                Exemples :{" "}
                {["AAPL", "MC.PA", "TSLA", "TTE.PA", "NVDA"].map((t, i) => (
                  <span key={t}>
                    <button
                      onClick={() => runAnalysis(t)}
                      className="hover:underline"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {t}
                    </button>
                    {i < 4 ? ", " : ""}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* ── RESULTS ───────────────────────────────────────────────── */}
          {data && vc && (
            <div className="animate-[fadeIn_0.4s_ease-out]">

              {/* Trial Pro banner */}
              {trialPro && (
                <div
                  className="rounded-xl p-4 mb-6 flex items-center gap-3 border"
                  style={{
                    background: "rgba(240,200,80,0.08)",
                    borderColor: "rgba(240,200,80,0.25)",
                  }}
                >
                  <span className="text-xl flex-shrink-0" style={{ color: "var(--accent-gold)" }}>&#10022;</span>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--accent-gold)" }}>
                      Analyse Pro offerte &mdash; d&eacute;couvre la puissance compl&egrave;te
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Deep Analysis, 3 sc&eacute;narios DCF et anomalies sectorielles d&eacute;bloqu&eacute;s pour cette premi&egrave;re analyse.
                    </p>
                  </div>
                </div>
              )}

              {/* Company header */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{data.company.name}</h1>
                    <span className="text-xl font-light" style={{ color: "var(--text-tertiary)" }}>·</span>
                    <span className="text-xl font-mono" style={{ color: "var(--text-secondary)" }}>{data.company.ticker}</span>
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
                      style={{
                        color: "var(--accent-primary)",
                        background: "rgba(108,92,231,0.1)",
                        borderColor: "rgba(108,92,231,0.25)",
                      }}
                    >
                      {data.company.sector}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {data.company.industry} · {data.company.exchange}
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/analyze?ticker=${data.company.ticker}`;
                        navigator.clipboard.writeText(url);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }}
                      className="ml-3 text-xs transition-colors inline-flex items-center gap-1 w-full sm:w-auto"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                      <Share2 size={12} /> {shareCopied ? "Lien copié !" : "Partager"}
                    </button>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    className="btn-secondary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {exportingPDF ? (
                      <><Loader2 size={14} className="animate-spin" /> Generation...</>
                    ) : (
                      <>&#128196; Exporter PDF</>
                    )}
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-primary)" }}>{currencySymbol(data.company.ticker)}{data.company.price.toFixed(2)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{data.company.currency} · Cours actuel</p>
                </div>
              </div>

              {/* ── VERDICT CARD — always visible ─────────────────────── */}
              <div
                className="card-highlight rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: vc.bg, color: vc.color }}
                  >
                    {vc.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                      Verdict ValuEngine
                    </p>
                    <VerdictBadgePremium verdict={data.verdict} />
                    <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>{vc.action}</p>
                    <p className="text-sm mt-2 max-w-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
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
                    <p className="text-[13px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Prix actuel</p>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text-primary)" }}>{currencySymbol(data.company.ticker)}{data.company.price.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>Valeur DCF</p>
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
              <div
                className="flex items-start gap-2 px-4 py-3 rounded-xl border mb-6"
                style={{
                  background: "rgba(255,184,77,0.06)",
                  borderColor: "rgba(255,184,77,0.18)",
                }}
              >
                <span className="mt-0.5" style={{ color: "var(--color-warning)" }}>&#9888;&#65039;</span>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,220,140,0.7)" }}>
                  Cette estimation est basée sur un modèle DCF mathématique. Elle ne constitue pas un conseil en investissement au sens de la directive MIF II. Fais tes propres recherches.
                </p>
              </div>

              {/* ── TAB SYSTEM ─────────────────────────────────────────── */}
              <div
                className="rounded-xl p-1 mb-8 border"
                style={{
                  background: "var(--bg-base)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <Tabs
                  tabs={ANALYSIS_TABS}
                  activeTab={activeTab}
                  onChange={(id) => setActiveTab(id as NewTabId)}
                />
              </div>

              {/* ── TAB 1: VUE D'ENSEMBLE ─────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="animate-fade-in-up">
                  {/* KPI Grid */}
                  <Section title="Fondamentaux clés">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                      <KPI label="Market Cap"         value={fmt(data.company.market_cap, currencySymbol(data.company.ticker))} />
                      <KPI label="Chiffre d'affaires" value={fmt(data.company.revenue, currencySymbol(data.company.ticker))} />
                      <KPI label="EBITDA"             value={fmt(data.company.ebitda, currencySymbol(data.company.ticker))} />
                      <KPI label="Résultat net"       value={fmt(data.company.net_income, currencySymbol(data.company.ticker))}
                        color={data.company.net_income > 0 ? "var(--color-success)" : "var(--color-danger)"}
                        sub={data.company.net_income > 0 ? "▲ Positif" : "▼ Négatif"} />
                      <KPI label="Free Cash Flow"     value={fmt(data.company.free_cash_flow, currencySymbol(data.company.ticker))}
                        color={data.company.free_cash_flow > 0 ? "var(--color-success)" : "var(--color-danger)"}
                        sub={data.company.free_cash_flow > 0 ? "▲ Génère du cash" : "▼ Consomme du cash"} />
                      <KPI label="Dette nette"        value={fmt(data.company.net_debt, currencySymbol(data.company.ticker))} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                      <KPI label="P/E Ratio"   value={data.company.pe_ratio != null ? `${data.company.pe_ratio.toFixed(1)}x` : "N/A"}
                        sub={data.company.pe_ratio != null ? (data.company.pe_ratio > 30 ? "Élevé" : "Modéré") : ""} />
                      <KPI label="EV/EBITDA"  value={data.company.ev_ebitda != null ? `${data.company.ev_ebitda.toFixed(1)}x` : "N/A"} />
                      <KPI label="P/B Ratio"  value={data.company.pb_ratio != null ? `${data.company.pb_ratio.toFixed(1)}x` : "N/A"} />
                      <KPI label="ROE"        value={data.company.roe != null ? `${(data.company.roe * 100).toFixed(1)}%` : "N/A"}
                        color={data.company.roe != null && data.company.roe > 0.15 ? "var(--color-success)" : undefined} />
                      <KPI label="Croissance CA" value={data.company.revenue_growth != null ? pct(data.company.revenue_growth) : "N/A"}
                        color={data.company.revenue_growth != null && data.company.revenue_growth > 0 ? "var(--color-success)" : "var(--color-danger)"} />
                      <KPI label="Beta"       value={data.company.beta != null ? data.company.beta.toFixed(2) : "N/A"}
                        sub={data.company.beta != null ? (data.company.beta > 1.2 ? "Volatil" : data.company.beta < 0.8 ? "Défensif" : "Neutre") : ""} />
                    </div>
                  </Section>

                  {/* Bull & Bear Case */}
                  <Section title="Bull & Bear Case">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                      {[
                        { key: "bull_case", label: "BULL CASE — Scénario Haussier", color: "var(--color-success)", rawColor: "#00E68A", bg: "rgba(0,230,138,0.05)", border: "rgba(0,230,138,0.2)" },
                        { key: "bear_case", label: "BEAR CASE — Scénario Baissier", color: "var(--color-danger)",  rawColor: "#FF5470", bg: "rgba(255,84,112,0.05)", border: "rgba(255,84,112,0.2)" },
                      ].map(({ key, label, color, bg, border }) => (
                        <div key={key} className="rounded-2xl p-6" style={{ background: bg, border: `1px solid ${border}` }}>
                          <p
                            className="text-[13px] font-medium mb-4 pb-3 border-b"
                            style={{ color, borderColor: "var(--border-subtle)" }}
                          >
                            {label}
                          </p>
                          <div className="text-sm leading-7 whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
                            {data.analysis[key as "bull_case" | "bear_case"]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  {/* Historical chart */}
                  <Section title="Cours historique">
                    <div className="mb-6">
                      <PriceChart ticker={data.company.ticker} currentPrice={data.company.price} />
                    </div>
                  </Section>
                </div>
              )}

              {/* ── TAB 2: DCF & SCÉNARIOS ────────────────────────────── */}
              {activeTab === "dcf" && (
                <div className="animate-fade-in-up">
                  {/* DCF Scenarios Pro (Niveau 3) */}
                  <DCFScenariosSection ticker={data.company.ticker} trialPro={trialPro} />

                  {/* Anomalies */}
                  <AnomaliesSection ticker={data.company.ticker} trialPro={trialPro} />

                  <Section title="Résultats DCF & Projections FCF">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div
                        className="rounded-2xl p-6 border"
                        style={{
                          background: "linear-gradient(to bottom, var(--bg-elevated), var(--bg-surface))",
                          borderColor: "rgba(108,92,231,0.14)",
                        }}
                      >
                        <p className="text-lg font-semibold mb-5" style={{ color: "var(--accent-primary)" }}>Modèle DCF</p>
                        {[
                          ["Valeur d'entreprise (EV)",   fmt(data.dcf.enterprise_value_dcf, currencySymbol(data.company.ticker)), ""],
                          ["Valeur des fonds propres",    fmt(data.dcf.equity_value, currencySymbol(data.company.ticker)),         ""],
                          ["Valeur terminale actualisée", fmt(data.dcf.terminal_value_pv, currencySymbol(data.company.ticker)),    ""],
                          ["Valeur intrinsèque / action", `${currencySymbol(data.company.ticker)}${data.dcf.intrinsic_value.toFixed(2)}`, "highlight"],
                          ["Prix de marché actuel",       `${currencySymbol(data.company.ticker)}${data.company.price.toFixed(2)}`, ""],
                          ["Potentiel",                   `${data.dcf.upside_pct > 0 ? "+" : ""}${data.dcf.upside_pct.toFixed(1)}%`,
                            data.dcf.upside_pct > 0 ? "pos" : data.dcf.upside_pct < 0 ? "neg" : ""],
                        ].map(([label, value, cls]) => (
                          <div
                            key={label}
                            className={`flex justify-between items-center py-2.5 border-b last:border-0 ${cls === "highlight" ? "-mx-2 px-2 rounded-lg" : ""}`}
                            style={{
                              borderColor: "rgba(255,255,255,0.04)",
                              background: cls === "highlight" ? "rgba(108,92,231,0.06)" : "transparent",
                            }}
                          >
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                            <span
                              className={`text-sm font-bold ${cls === "highlight" ? "text-base" : ""}`}
                              style={{
                                color: cls === "pos"
                                  ? "var(--color-success)"
                                  : cls === "neg"
                                  ? "var(--color-danger)"
                                  : cls === "highlight"
                                  ? "var(--accent-primary)"
                                  : "var(--text-primary)",
                              }}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        className="rounded-2xl p-6 border"
                        style={{
                          background: "linear-gradient(to bottom, var(--bg-elevated), var(--bg-surface))",
                          borderColor: "rgba(108,92,231,0.14)",
                        }}
                      >
                        <p className="text-lg font-semibold mb-5" style={{ color: "var(--accent-primary)" }}>Projections Free Cash Flow</p>
                        <FCFChart projections={data.dcf.fcf_projections} />
                      </div>
                    </div>
                  </Section>

                  <Section title={`Matrice de sensibilité — Valeur intrinsèque (${currencySymbol(data.company.ticker)})`} defaultOpen={false}>
                    <div
                      className="rounded-2xl p-6 mb-6 border"
                      style={{
                        background: "linear-gradient(to bottom, var(--bg-elevated), var(--bg-surface))",
                        borderColor: "rgba(108,92,231,0.14)",
                      }}
                    >
                      <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
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
                    <div
                      className="backdrop-blur-sm rounded-2xl p-6 border"
                      style={{
                        background: "rgba(19,32,50,0.8)",
                        borderColor: "rgba(108,92,231,0.18)",
                      }}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                          { label: "Croissance FCF",    value: growth,   set: setGrowth,   min: 1, max: 30, suffix: "%" },
                          { label: "WACC",              value: wacc,     set: setWacc,     min: 2, max: 25, suffix: "%" },
                          { label: "Croiss. terminale", value: terminal, set: setTerminal, min: 1, max: 6,  suffix: "%" },
                          { label: "Horizon (ans)",     value: horizon,  set: setHorizon,  min: 3, max: 10, suffix: "ans" },
                        ].map(({ label, value, set, min, max, suffix }) => (
                          <div key={label}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
                              <span className="text-sm font-bold" style={{ color: "var(--accent-primary)" }}>{value}{suffix}</span>
                            </div>
                            <input
                              type="range" min={min} max={max} value={value}
                              onChange={(e) => set(Number(e.target.value))}
                              className="w-full cursor-pointer accent-[#6C5CE7]"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => runAnalysis(ticker)}
                        className="btn-primary mt-5 text-sm px-6 py-2.5"
                      >
                        Relancer avec ces hypothèses
                      </button>
                    </div>
                  </Section>
                </div>
              )}

              {/* ── TAB 3: ANALYSE PROFONDE ───────────────────────────── */}
              {activeTab === "deep" && (
                <div className="animate-fade-in-up">
                  {/* Deep Analysis Pro (Niveau 1) */}
                  <DeepAnalysisSection ticker={data.company.ticker} trialPro={trialPro} />

                  {/* Trading Comps */}
                  <Section title="Comparaison sectorielle — Trading Comps">
                    <div className="overflow-x-auto">
                      <TradingComps ticker={data.company.ticker} sector={data.company.sector} />
                    </div>
                  </Section>

                  {/* SWOT */}
                  <SwotSection ticker={data.company.ticker} />

                  {/* PESTLE */}
                  <PestleSection ticker={data.company.ticker} />
                </div>
              )}

              {/* ── Price Alert ─────────────────────────────────────── */}
              <PriceAlertSection ticker={data.company.ticker} tickerName={data.company.name} />

              {/* Pro conversion CTA after trial */}
              {trialPro && (
                <div
                  className="rounded-2xl p-8 text-center mt-8 border"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "rgba(240,200,80,0.25)",
                  }}
                >
                  <p className="font-bold text-lg mb-2" style={{ color: "var(--accent-gold)" }}>
                    Tu viens de voir ValuEngine Pro en action &#10022;
                  </p>
                  <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                    Deep Analysis, 3 sc&eacute;narios DCF, d&eacute;tection d&apos;anomalies,
                    export PDF, screener IA &mdash; tout &ccedil;a pour 99&euro;/an.
                  </p>
                  <button
                    onClick={() => router.push("/#pricing")}
                    className="btn-pro font-bold rounded-xl px-8 py-3 transition-all"
                  >
                    Passer Pro &#10022;
                  </button>
                  <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
                    Sinon, tu gardes 3 analyses gratuites par jour.
                  </p>
                </div>
              )}

              <p className="text-xs text-center mt-8 pb-4" style={{ color: "var(--text-tertiary)" }}>
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
