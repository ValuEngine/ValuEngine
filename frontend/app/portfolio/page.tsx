"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { Trash2, Plus, X, Loader2, Sparkles } from "lucide-react";
import { searchTicker, authedFetch } from "@/lib/api";
import { useProStatus } from "@/hooks/useProStatus";
import AppLayout from "@/components/AppLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Position {
  id?: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  sector?: string;
}

interface AIInsight {
  score_diversification: number;
  analyse_globale: string;
  concentration_risques: string[];
  opportunites: string[];
  recommandation: string;
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default function PortfolioPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isPro } = useProStatus(user?.id);

  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Inline add form
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // AI Insight
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Load from Supabase
  useEffect(() => {
    fetch("/api/db/portfolio")
      .then((r) => r.json())
      .then((rows: Array<{ id: string; ticker: string; shares: number; avg_price: number }>) => {
        if (Array.isArray(rows)) {
          setPositions(
            rows.map((r) => ({
              id: r.id,
              ticker: r.ticker,
              shares: r.shares,
              avgPrice: r.avg_price,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchPrices = useCallback(async (pos: Position[]) => {
    if (pos.length === 0) return;
    setLoadingPrices(true);
    const prices: Record<string, number> = {};
    await Promise.allSettled(
      pos.map(async (p) => {
        try {
          const data = await searchTicker(p.ticker);
          prices[p.ticker] = data.price;
        } catch {
          /* keep previous price */
        }
      })
    );
    setCurrentPrices((prev) => ({ ...prev, ...prices }));
    setLoadingPrices(false);
  }, []);

  useEffect(() => {
    fetchPrices(positions);
  }, [positions, fetchPrices]);

  const handleAddPosition = () => {
    const ticker = newTicker.trim().toUpperCase();
    const shares = parseFloat(newShares);
    const avgPrice = parseFloat(newAvgPrice);

    if (!ticker || isNaN(shares) || shares <= 0 || isNaN(avgPrice) || avgPrice <= 0) {
      setModalError("Remplis tous les champs correctement.");
      return;
    }

    fetch("/api/db/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, shares, avg_price: avgPrice }),
    })
      .then((r) => r.json())
      .then((row) => {
        const updated = [
          ...positions.filter((p) => p.ticker !== ticker),
          { id: row.id, ticker, shares, avgPrice },
        ];
        setPositions(updated);
      })
      .catch(() => {
        setPositions((prev) => [
          ...prev.filter((p) => p.ticker !== ticker),
          { ticker, shares, avgPrice },
        ]);
      });
    setShowModal(false);
    setNewTicker("");
    setNewShares("");
    setNewAvgPrice("");
    setModalError(null);
  };

  const handleDelete = (ticker: string) => {
    fetch("/api/db/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    }).catch(() => {});
    setPositions((prev) => prev.filter((p) => p.ticker !== ticker));
  };

  const handleAIInsight = async () => {
    if (!isPro || positions.length === 0) return;
    setLoadingAI(true);
    setAiInsight(null);

    const enrichedPositions = positions.map((p) => {
      const currentPrice = currentPrices[p.ticker] ?? p.avgPrice;
      const currentValue = p.shares * currentPrice;
      const cost = p.shares * p.avgPrice;
      const pnlPct = cost > 0 ? ((currentValue - cost) / cost) * 100 : 0;
      return {
        ticker: p.ticker,
        shares: p.shares,
        avg_price: p.avgPrice,
        current_price: currentPrice,
        current_value: currentValue,
        pnl_pct: Math.round(pnlPct * 10) / 10,
      };
    });

    try {
      const resp = await authedFetch(`${API_BASE}/api/portfolio/ai-insight`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: enrichedPositions }),
      });

      if (!resp.ok) throw new Error("Erreur AI");
      const data: AIInsight = await resp.json();
      setAiInsight(data);
    } catch {
      setAiInsight(null);
    } finally {
      setLoadingAI(false);
    }
  };

  // Totals
  const totalValue = positions.reduce((acc, p) => {
    const price = currentPrices[p.ticker] ?? p.avgPrice;
    return acc + p.shares * price;
  }, 0);
  const totalCost = positions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Sector distribution
  const sectorMap: Record<string, number> = {};
  positions.forEach((p) => {
    const price = currentPrices[p.ticker] ?? p.avgPrice;
    const val = p.shares * price;
    const sector = p.sector || "Autre";
    sectorMap[sector] = (sectorMap[sector] || 0) + val;
  });

  const SECTOR_COLORS = [
    "#C9A84C", "#00d4aa", "#ff4d6d", "#818cf8", "#fb923c",
    "#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#34d399",
  ];

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8">

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Portefeuille</h1>
            <p className="text-[#6b7d91] text-sm mt-1">
              Suis tes positions et ton P&amp;L en temps reel
            </p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setModalError(null);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-5 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* ── KPI CARDS ─��──────────────────────────────────────────────── */}
        {positions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-2">
                Valeur totale
              </p>
              <p className="text-2xl font-black text-white">{formatCurrency(totalValue)}</p>
            </div>
            <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-2">
                P&amp;L total
              </p>
              <p className={`text-2xl font-black ${totalPnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                {totalPnl >= 0 ? "+" : ""}
                {formatCurrency(totalPnl)}
              </p>
              <p className={`text-sm ${totalPnlPct >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                {totalPnlPct >= 0 ? "+" : ""}
                {totalPnlPct.toFixed(1)}%
              </p>
            </div>
            <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-2">
                Positions
              </p>
              <p className="text-2xl font-black text-white">{positions.length}</p>
            </div>
          </div>
        )}

        {/* ── INLINE ADD FORM ──────────────────────────────────────────── */}
        {positions.length > 0 && (
          <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
              Ajouter une position
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Ticker (ex: AAPL)"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                className="bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
              <input
                type="number"
                placeholder="Quantite"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                min="0"
                step="0.01"
                className="bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
              <input
                type="number"
                placeholder="Prix moyen ($)"
                value={newAvgPrice}
                onChange={(e) => setNewAvgPrice(e.target.value)}
                min="0"
                step="0.01"
                className="bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
              />
              <button
                onClick={handleAddPosition}
                className="bg-[#C9A84C] text-black font-bold rounded-xl px-4 py-2.5 hover:bg-[#e8c55a] transition-colors text-sm"
              >
                Ajouter +
              </button>
            </div>
            {modalError && (
              <p className="text-[#ff4d6d] text-sm mt-2">{modalError}</p>
            )}
          </div>
        )}

        {/* ── POSITIONS TABLE ───────────────────────────────────────────── */}
        {positions.length > 0 ? (
          <>
            <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(201,168,76,0.05)]">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        Ticker
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        Qte
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        Prix achat
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        Prix actuel
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        Valeur
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        P&amp;L
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">
                        %
                      </th>
                      <th className="px-5 py-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => {
                      const currentPrice = currentPrices[p.ticker] ?? p.avgPrice;
                      const value = p.shares * currentPrice;
                      const cost = p.shares * p.avgPrice;
                      const pnl = value - cost;
                      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                      const isPositive = pnl >= 0;
                      const pnlClass = isPositive ? "text-[#00d4aa]" : "text-[#ff4d6d]";

                      return (
                        <tr
                          key={p.ticker}
                          className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                        >
                          <td className="px-5 py-4 text-[#C9A84C] font-black">{p.ticker}</td>
                          <td className="px-5 py-4 text-right text-white text-sm">{p.shares}</td>
                          <td className="px-5 py-4 text-right text-white text-sm">
                            ${p.avgPrice.toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-right text-white text-sm font-semibold">
                            {loadingPrices && !currentPrices[p.ticker] ? (
                              <span className="text-[#4a6070]">...</span>
                            ) : (
                              `$${currentPrice.toFixed(2)}`
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-white font-bold text-sm">
                            ${value.toFixed(2)}
                          </td>
                          <td className={`px-5 py-4 text-right font-bold text-sm ${pnlClass}`}>
                            {pnl >= 0 ? "+" : ""}
                            {formatCurrency(pnl)}
                          </td>
                          <td className={`px-5 py-4 text-right font-bold text-sm ${pnlClass}`}>
                            {pnlPct >= 0 ? "+" : ""}
                            {pnlPct.toFixed(1)}%
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  router.push(`/analyze?ticker=${p.ticker}`)
                                }
                                className="text-[#C9A84C] text-xs hover:underline"
                              >
                                Analyser
                              </button>
                              <button
                                onClick={() => handleDelete(p.ticker)}
                                className="text-[#4a6070] hover:text-[#ff4d6d] transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Total footer */}
                  <tfoot>
                    <tr className="bg-[rgba(201,168,76,0.05)] font-bold">
                      <td className="px-5 py-4 text-white" colSpan={4}>
                        TOTAL
                      </td>
                      <td className="px-5 py-4 text-right text-white">
                        {formatCurrency(totalValue)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right ${totalPnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}
                      >
                        {totalPnl >= 0 ? "+" : ""}
                        {formatCurrency(totalPnl)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right ${totalPnlPct >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}
                      >
                        {totalPnlPct >= 0 ? "+" : ""}
                        {totalPnlPct.toFixed(1)}%
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── SECTOR DISTRIBUTION ────────────────────────────────────── */}
            {Object.keys(sectorMap).length >= 2 && (
              <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                  Repartition sectorielle
                </h3>
                <div className="space-y-3">
                  {Object.entries(sectorMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([sector, val], i) => {
                      const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                      return (
                        <div key={sector} className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length],
                            }}
                          />
                          <span className="text-sm text-zinc-300 w-40 truncate">
                            {sector}
                          </span>
                          <div className="flex-1 bg-[#27272a] rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-sm text-zinc-400 w-16 text-right">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ── AI INSIGHT ─────────────────────────────────────────────── */}
            <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-8 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                    Analyse IA du portefeuille
                  </h3>
                  <Sparkles size={14} className="text-[#C9A84C]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-1.5 py-0.5 rounded-full">
                    Pro
                  </span>
                </div>
                <button
                  onClick={handleAIInsight}
                  disabled={loadingAI || !isPro || positions.length === 0}
                  className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Analyse...
                    </>
                  ) : (
                    "Analyser mon portefeuille"
                  )}
                </button>
              </div>

              {/* Pro gate blur */}
              {!isPro && (
                <div className="absolute inset-0 bg-[#18181b]/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <Sparkles size={24} className="text-[#C9A84C] mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm mb-3">
                      Fonctionnalite reservee aux membres Pro
                    </p>
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="bg-[#C9A84C] text-black font-bold px-4 py-2 rounded-xl text-sm"
                    >
                      Passer Pro
                    </button>
                  </div>
                </div>
              )}

              {/* AI Results */}
              {aiInsight && (
                <div className="space-y-4">
                  {/* Score diversification */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="#27272a"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="#C9A84C"
                          strokeWidth="3"
                          strokeDasharray={`${(aiInsight.score_diversification / 100) * 97.4} 97.4`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {aiInsight.score_diversification}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        Score diversification
                      </p>
                      <p className="text-sm text-zinc-300 mt-1">
                        {aiInsight.analyse_globale}
                      </p>
                    </div>
                  </div>

                  {/* Risks & Opportunities */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                        Risques identifies
                      </p>
                      {aiInsight.concentration_risques?.map((r, i) => (
                        <p key={i} className="text-sm text-zinc-400 mb-1">
                          &#9888;&#65039; {r}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">
                        Opportunites
                      </p>
                      {aiInsight.opportunites?.map((o, i) => (
                        <p key={i} className="text-sm text-zinc-400 mb-1">
                          &#10003; {o}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  {aiInsight.recommandation && (
                    <div className="bg-[#09090b]/60 border border-[#C9A84C]/20 rounded-xl p-4 mt-4">
                      <p className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-1">
                        Recommandation
                      </p>
                      <p className="text-sm text-zinc-300">
                        {aiInsight.recommandation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty AI state */}
              {!aiInsight && !loadingAI && isPro && (
                <p className="text-sm text-zinc-600 italic">
                  Cliquez sur &quot;Analyser mon portefeuille&quot; pour obtenir une analyse IA personnalisee.
                </p>
              )}
            </div>
          </>
        ) : (
          /* ── EMPTY STATE ──────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
              <span className="text-3xl">&#128188;</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Ton portefeuille est vide</h2>
            <p className="text-[#4a6070] text-sm max-w-xs mb-2">
              Ajoute tes positions pour suivre ta performance et ton P&amp;L en temps reel.
            </p>
            <p className="text-[#4a6070] text-xs mb-6">
              Exemple : 10 actions AAPL achetees a 185$
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
            >
              <Plus size={16} /> Ajouter une position
            </button>
          </div>
        )}

        {/* ── MODAL ──────────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm">
            <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.3)] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[slideUp_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">Ajouter une position</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#4a6070] hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">
                    Ticker
                  </label>
                  <input
                    type="text"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                    placeholder="Ex: AAPL, MC.PA"
                    className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-base sm:text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">
                    Nombre d&apos;actions
                  </label>
                  <input
                    type="number"
                    value={newShares}
                    onChange={(e) => setNewShares(e.target.value)}
                    placeholder="Ex: 10"
                    min="0"
                    step="0.01"
                    className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-base sm:text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">
                    Prix d&apos;achat moyen ($)
                  </label>
                  <input
                    type="number"
                    value={newAvgPrice}
                    onChange={(e) => setNewAvgPrice(e.target.value)}
                    placeholder="Ex: 150.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-base sm:text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
                  />
                </div>
              </div>

              {modalError && (
                <p className="text-[#ff4d6d] text-sm mt-4">{modalError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPosition}
                  className="flex-1 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-[rgba(255,255,255,0.1)] text-[#7a8fa3] font-semibold py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
