"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Calendar, Loader2, Briefcase, Clock } from "lucide-react";
import { authedFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface EarningsEvent {
  symbol: string;
  date: string;
  time: string;
  eps_estimated: number | null;
  eps_actual: number | null;
  revenue_estimated: number | null;
  revenue_actual: number | null;
  fiscal_period: string;
  in_portfolio: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRevenue(v: number | null): string {
  if (v === null || v === undefined) return "-";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

export default function EarningsPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "portfolio">("all");
  const [daysAhead, setDaysAhead] = useState(30);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      // Fetch user portfolio tickers
      let portfolioTickers: string[] = [];
      try {
        const portfolioResp = await fetch("/api/db/portfolio");
        if (portfolioResp.ok) {
          const rows = await portfolioResp.json();
          portfolioTickers = (rows || []).map((r: { ticker: string }) => r.ticker);
        }
      } catch { /* ignore */ }

      const resp = await authedFetch(`${API_BASE}/api/earnings/calendar`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: portfolioTickers.length > 0 ? portfolioTickers : undefined,
          days_ahead: daysAhead,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setEarnings(data.earnings || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, daysAhead]);

  const filteredEarnings = filter === "portfolio"
    ? earnings.filter((e) => e.in_portfolio)
    : earnings;

  // Group by date
  const grouped = filteredEarnings.reduce<Record<string, EarningsEvent[]>>((acc, e) => {
    const date = e.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(e);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Calendar size={24} className="text-[#C9A84C]" />
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Earnings Calendar</h1>
            </div>
            <p className="text-zinc-500 text-sm">
              Prochaines publications de resultats
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === "all" ? "bg-[#C9A84C] text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter("portfolio")}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === "portfolio" ? "bg-[#C9A84C] text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Briefcase size={12} /> Mon portefeuille
            </button>
          </div>

          <select
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-[#C9A84C]/50"
          >
            <option value={7}>7 jours</option>
            <option value={14}>14 jours</option>
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
            <option value={90}>90 jours</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
          </div>
        )}

        {/* Earnings list */}
        {!loading && Object.keys(grouped).length > 0 && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, events]) => {
              const days = daysUntil(date);
              return (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                      {formatDate(date)}
                    </h2>
                    {days <= 2 && days >= 0 && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 px-2 py-0.5 rounded-full">
                        {days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : "Dans 2j"}
                      </span>
                    )}
                    {days > 2 && days <= 7 && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#fb923c] bg-[#fb923c]/10 border border-[#fb923c]/25 px-2 py-0.5 rounded-full">
                        Dans {days}j
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {events.map((e, i) => (
                      <div
                        key={`${e.symbol}-${i}`}
                        className={`bg-[#18181b]/80 border rounded-xl px-5 py-4 flex items-center gap-4 transition-all hover:bg-[rgba(255,255,255,0.02)] cursor-pointer ${
                          e.in_portfolio ? "border-[#C9A84C]/30" : "border-[#27272a]"
                        }`}
                        onClick={() => router.push(`/analyze?ticker=${e.symbol}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#C9A84C]">{e.symbol}</span>
                            {e.in_portfolio && (
                              <Briefcase size={10} className="text-[#C9A84C]" />
                            )}
                            {e.time && (
                              <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                                <Clock size={8} />
                                {e.time === "bmo" ? "Avant marche" : e.time === "amc" ? "Apres marche" : e.time}
                              </span>
                            )}
                          </div>
                          {e.fiscal_period && (
                            <p className="text-[10px] text-zinc-600 mt-0.5">{e.fiscal_period}</p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {e.eps_estimated !== null && (
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase">BPA est.</p>
                              <p className="text-sm font-semibold text-white">
                                ${e.eps_estimated?.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {e.revenue_estimated !== null && (
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase">CA est.</p>
                              <p className="text-sm font-semibold text-white">
                                {formatRevenue(e.revenue_estimated)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredEarnings.length === 0 && (
          <div className="text-center py-16">
            <Calendar size={32} className="text-zinc-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-zinc-400 mb-2">
              {filter === "portfolio"
                ? "Aucun resultat prevu pour tes positions"
                : "Aucun resultat prevu dans cette periode"
              }
            </h2>
            <p className="text-sm text-zinc-600">
              {filter === "portfolio"
                ? "Ajoute des positions a ton portefeuille pour suivre leurs earnings."
                : "Essaie d'elargir la periode de recherche."
              }
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
