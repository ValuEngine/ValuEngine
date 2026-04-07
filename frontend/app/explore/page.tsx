"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Flame, BarChart3, Users, Loader2, TrendingUp, Briefcase,
  Calendar, Search, Sparkles, Clock,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import Tabs from "@/components/ui/Tabs";
import { useProStatus } from "@/hooks/useProStatus";
import { authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/* ── Types ─────────────────────────────────────────────── */
interface TrendTicker { ticker: string; count?: number; holders?: number; rank: number; }
interface CommunityStats { total_users: number; total_analyses: number; total_positions: number; }
interface TrendsData { top_analyzed: TrendTicker[]; top_held: TrendTicker[]; stats: CommunityStats; }

interface EarningsEvent {
  symbol: string; date: string; time: string;
  eps_estimated: number | null; revenue_estimated: number | null;
  in_portfolio: boolean; fiscal_period: string;
}

interface ScreenerResult {
  ticker: string; nom: string; score_match: number;
  raison: string; points_forts: string[]; secteur: string; capitalisation: string;
}

const TABS = [
  { id: "trends", label: "Tendances" },
  { id: "screener", label: "Screener IA" },
  { id: "earnings", label: "Earnings" },
];

/* ── Trends Tab ────────────────────────────────────────── */
function TrendsTab() {
  const router = useRouter();
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/trends`)
      .then((r) => r.json()).then(setData).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} /></div>;
  if (!data) return <p className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>Chargement impossible</p>;

  return (
    <div className="space-y-6 animate-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { icon: Users, value: data.stats.total_users, label: "Utilisateurs" },
          { icon: BarChart3, value: data.stats.total_analyses, label: "Analyses" },
          { icon: Briefcase, value: data.stats.total_positions, label: "Positions" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="card text-center">
            <Icon size={20} className="mx-auto mb-2" style={{ color: "var(--accent-primary)" }} />
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value.toLocaleString()}</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RankList
          title="Les plus analysés" icon={<TrendingUp size={16} />}
          items={data.top_analyzed} valueKey="count" valueSuffix="analyses"
          color="var(--accent-primary)" onClickTicker={(t) => router.push(`/analyze?ticker=${t}`)}
        />
        <RankList
          title="Les plus détenus" icon={<Briefcase size={16} />}
          items={data.top_held} valueKey="holders" valueSuffix="users"
          color="var(--color-success)" onClickTicker={(t) => router.push(`/analyze?ticker=${t}`)}
        />
      </div>
    </div>
  );
}

function RankList({ title, icon, items, valueKey, valueSuffix, color, onClickTicker }: {
  title: string; icon: React.ReactNode; items: TrendTicker[];
  valueKey: "count" | "holders"; valueSuffix: string; color: string;
  onClickTicker: (t: string) => void;
}) {
  const maxVal = (valueKey === "count" ? items[0]?.count : items[0]?.holders) || 1;
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <span style={{ color }}>{icon}</span>
        <h3 className="font-display text-[15px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{title}</h3>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((t) => {
            const val = (valueKey === "count" ? t.count : t.holders) || 0;
            return (
              <div key={t.ticker} onClick={() => onClickTicker(t.ticker)}
                className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg-elevated)]">
                <span className="text-sm font-bold w-6 text-center" style={{ color: t.rank <= 3 ? color : "var(--text-tertiary)" }}>{t.rank}</span>
                <span className="text-sm font-bold w-20" style={{ color }}>{t.ticker}</span>
                <div className="flex-1 rounded-full h-2" style={{ background: "var(--bg-elevated)" }}>
                  <div className="h-2 rounded-full progress-bar" style={{ width: `${(val / (maxVal as number)) * 100}%`, background: color }} />
                </div>
                <span className="text-xs w-20 text-right" style={{ color: "var(--text-tertiary)" }}>{val} {valueSuffix}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>Pas encore assez de données.</p>
      )}
    </div>
  );
}

/* ── Screener Tab ──────────────────────────────────────── */
function ScreenerTab() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isPro } = useProStatus(user?.id);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/screener/suggestions`).then(r => r.json()).then(d => setSuggestions(d.suggestions || [])).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || !isPro) return;
    setLoading(true);
    try {
      const res = await authedFetch(`${API_BASE}/api/screener/search`, getToken, {
        method: "POST", body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      setResults(data.resultats || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="card-highlight">
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} style={{ color: "var(--accent-primary)" }} />
          <h3 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Screener IA</h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-gold-muted)", color: "var(--accent-gold)", border: "1px solid rgba(240,200,80,0.2)" }}>Pro</span>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Décris ce que tu cherches en langage naturel
        </p>
        <div className="flex gap-3">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ex: Actions tech sous-évaluées avec dividende > 3%..."
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          />
          <button onClick={handleSearch} disabled={loading || !isPro || !query.trim()} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Chercher
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {suggestions.slice(0, 4).map(s => (
              <button key={s} onClick={() => setQuery(s)} className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((r) => (
            <div key={r.ticker} className="card-interactive" onClick={() => router.push(`/analyze?ticker=${r.ticker}`)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: "var(--accent-primary)" }}>{r.ticker}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-primary-muted)", color: "var(--accent-primary)" }}>{r.score_match}% match</span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{r.nom}</p>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{r.raison}</p>
              <div className="flex gap-2 flex-wrap">
                {r.points_forts.slice(0, 2).map((p, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,230,138,0.1)", color: "var(--color-success)" }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Earnings Tab ──────────────────────────────────────── */
function EarningsTab() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioOnly, setPortfolioOnly] = useState(false);

  useEffect(() => {
    authedFetch(`${API_BASE}/api/earnings/calendar`, getToken, {
      method: "POST", body: JSON.stringify({ days_ahead: 14 }),
    })
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getToken]);

  const filtered = portfolioOnly ? events.filter(e => e.in_portfolio) : events;
  const grouped = filtered.reduce<Record<string, EarningsEvent[]>>((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} /></div>;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <button onClick={() => setPortfolioOnly(!portfolioOnly)}
          className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
          style={{
            background: portfolioOnly ? "var(--accent-primary-muted)" : "var(--bg-elevated)",
            color: portfolioOnly ? "var(--accent-primary)" : "var(--text-secondary)",
            border: `1px solid ${portfolioOnly ? "rgba(108,92,231,0.3)" : "var(--border-subtle)"}`,
          }}>
          <Briefcase size={14} className="inline mr-1.5" /> Mon portefeuille
        </button>
      </div>

      {Object.entries(grouped).length === 0 ? (
        <div className="card text-center py-8">
          <Calendar size={24} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p style={{ color: "var(--text-secondary)" }}>Aucun earning prévu dans les 14 prochains jours</p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, evts]) => (
          <div key={date}>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="space-y-2">
              {evts.map((e) => (
                <div key={e.symbol} onClick={() => router.push(`/analyze?ticker=${e.symbol}`)}
                  className="card-interactive flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm" style={{ color: "var(--accent-primary)" }}>{e.symbol}</span>
                    {e.in_portfolio && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(0,230,138,0.1)", color: "var(--color-success)" }}>Portfolio</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                      <Clock size={10} className="inline mr-1" />{e.time === "bmo" ? "Avant marché" : "Après marché"}
                    </span>
                    {e.eps_estimated && (
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        EPS est. ${e.eps_estimated.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */
export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState("trends");

  return (
    <AppLayout>
      <div className="min-h-screen px-4 sm:px-6 md:px-10 py-6 sm:py-8 max-w-5xl">
        <div className="mb-10">
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Explorer
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Tendances, screener IA et calendrier earnings
          </p>
        </div>

        <div className="mb-10">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "trends" && <TrendsTab />}
        {activeTab === "screener" && <ScreenerTab />}
        {activeTab === "earnings" && <EarningsTab />}
      </div>
    </AppLayout>
  );
}
