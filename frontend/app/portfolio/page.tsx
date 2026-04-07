"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { Trash2, Plus, X, Loader2, Sparkles, Upload } from "lucide-react";
import { searchTicker, authedFetch } from "@/lib/api";
import { gtmEvents } from "@/lib/analytics";
import { useProStatus } from "@/hooks/useProStatus";
import AppLayout from "@/components/AppLayout";
import ImportPortfolioModal from "@/components/ImportPortfolioModal";
import PortfolioHealthScore from "@/components/PortfolioHealthScore";
import SmartAlerts from "@/components/SmartAlerts";
import Tabs from "@/components/ui/Tabs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const MAX_POSITIONS = 50;

const PORTFOLIO_TABS = [
  { id: "positions", label: "Positions" },
  { id: "health", label: "Score Santé" },
];

const SECTOR_COLORS = [
  "var(--accent-primary)",
  "var(--color-success)",
  "var(--color-danger)",
  "var(--color-info)",
  "var(--color-warning)",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#fb923c",
  "#34d399",
];

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
  const [addingPosition, setAddingPosition] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("positions");

  // Load from Supabase
  useEffect(() => {
    fetch("/api/db/portfolio")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur chargement");
        return r.json();
      })
      .then((rows: Array<{ id: string; ticker: string; shares: number; avg_price: number; sector?: string }>) => {
        if (Array.isArray(rows)) {
          setPositions(
            rows.map((r) => ({
              id: r.id,
              ticker: r.ticker,
              shares: r.shares,
              avgPrice: r.avg_price,
              sector: r.sector || undefined,
            }))
          );
        }
      })
      .catch(() => {
        setLoadError("Impossible de charger le portefeuille. Rechargez la page.");
      });
  }, []);

  const fetchPrices = useCallback(async (pos: Position[]) => {
    if (pos.length === 0) return;
    setLoadingPrices(true);
    const prices: Record<string, number> = {};
    const sectorUpdates: Record<string, string> = {};
    await Promise.allSettled(
      pos.map(async (p) => {
        try {
          const data = await searchTicker(p.ticker);
          prices[p.ticker] = data.price;
          // Backfill sector if missing
          if (!p.sector && data.sector) {
            sectorUpdates[p.ticker] = data.sector;
          }
        } catch {
          /* keep previous price */
        }
      })
    );
    setCurrentPrices((prev) => ({ ...prev, ...prices }));
    // Backfill sectors for positions that were missing them + persist to DB
    if (Object.keys(sectorUpdates).length > 0) {
      setPositions((prev) => {
        const updated = prev.map((p) =>
          sectorUpdates[p.ticker] ? { ...p, sector: sectorUpdates[p.ticker] } : p
        );
        // Persist sector updates to Supabase in background
        updated.forEach((p) => {
          if (sectorUpdates[p.ticker]) {
            fetch("/api/db/portfolio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticker: p.ticker,
                shares: p.shares,
                avg_price: p.avgPrice,
                sector: sectorUpdates[p.ticker],
              }),
            }).catch(() => {});
          }
        });
        return updated;
      });
    }
    setLoadingPrices(false);
  }, []);

  useEffect(() => {
    fetchPrices(positions);
  }, [positions, fetchPrices]);

  const handleAddPosition = async () => {
    const ticker = newTicker.trim().toUpperCase();
    const shares = parseFloat(newShares);
    const avgPrice = parseFloat(newAvgPrice);

    if (!ticker || isNaN(shares) || shares <= 0 || isNaN(avgPrice) || avgPrice <= 0) {
      setModalError("Remplis tous les champs correctement.");
      return;
    }

    // Check max positions limit
    const isUpdate = positions.some((p) => p.ticker === ticker);
    if (!isUpdate && positions.length >= MAX_POSITIONS) {
      setModalError(`Maximum ${MAX_POSITIONS} positions atteint.`);
      return;
    }

    setAddingPosition(true);
    setModalError(null);

    // Validate ticker exists and fetch sector
    let sector: string | undefined;
    try {
      const data = await searchTicker(ticker);
      if (!data || !data.price) {
        setModalError(`Ticker "${ticker}" introuvable. Verifie le symbole.`);
        setAddingPosition(false);
        return;
      }
      sector = data.sector || undefined;
    } catch {
      setModalError(`Ticker "${ticker}" introuvable. Verifie le symbole (ex: AAPL, MSFT).`);
      setAddingPosition(false);
      return;
    }

    try {
      const resp = await fetch("/api/db/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, shares, avg_price: avgPrice, sector: sector || null }),
      });
      const row = await resp.json();
      const updated = [
        ...positions.filter((p) => p.ticker !== ticker),
        { id: row.id, ticker, shares, avgPrice, sector },
      ];
      setPositions(updated);
      gtmEvents.portfolioPositionAdded(ticker);
    } catch {
      setPositions((prev) => [
        ...prev.filter((p) => p.ticker !== ticker),
        { ticker, shares, avgPrice, sector },
      ]);
    }

    setShowModal(false);
    setNewTicker("");
    setNewShares("");
    setNewAvgPrice("");
    setModalError(null);
    setAddingPosition(false);
  };

  const handleDelete = async (ticker: string) => {
    const previousPositions = [...positions];
    // Optimistic update
    setPositions((prev) => prev.filter((p) => p.ticker !== ticker));
    try {
      const resp = await fetch("/api/db/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!resp.ok) throw new Error("Delete failed");
    } catch {
      // Rollback on failure
      setPositions(previousPositions);
    }
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

  return (
    <AppLayout>
      <div
        className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8"
        style={{ color: "var(--text-primary)" }}
      >

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
              Portefeuille
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Suis tes positions et ton P&amp;L en temps reel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload size={14} /> Importer CSV
            </button>
            <button
              onClick={() => {
                setShowModal(true);
                setModalError(null);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Ajouter
            </button>
          </div>
        </div>

        {/* ── LOAD ERROR ───────────────────────────────────────────── */}
        {loadError && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{
              background: "rgba(255,84,112,0.08)",
              border: "1px solid rgba(255,84,112,0.25)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>{loadError}</p>
          </div>
        )}

        {/* ── HERO CARD — always visible ──────────────────────────────── */}
        {positions.length > 0 && (
          <div className="card-highlight p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Valeur totale
                </p>
                <p className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  P&amp;L total
                </p>
                <p
                  className="text-3xl font-black"
                  style={{ color: totalPnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {totalPnl >= 0 ? "+" : ""}
                  {formatCurrency(totalPnl)}
                </p>
                <p
                  className="text-sm font-medium mt-0.5"
                  style={{ color: totalPnlPct >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {totalPnlPct >= 0 ? "+" : ""}
                  {totalPnlPct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Positions
                </p>
                <p className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>
                  {positions.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS ────────────────────────────────────────────────────── */}
        {positions.length > 0 && (
          <div className="mb-6">
            <Tabs
              tabs={PORTFOLIO_TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        )}

        {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
        {positions.length > 0 ? (
          <>
            {/* ── POSITIONS TAB ─────────────────────────────────────── */}
            {activeTab === "positions" && (
              <div className="animate-in">
                {/* Inline add form */}
                <div className="card p-6 mb-6">
                  <h3 className="text-[13px] font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
                    Ajouter une position
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Ticker (ex: AAPL)"
                      value={newTicker}
                      onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none transition-colors"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                    />
                    <input
                      type="number"
                      placeholder="Quantite"
                      value={newShares}
                      onChange={(e) => setNewShares(e.target.value)}
                      min="0"
                      step="0.01"
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none transition-colors"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                    />
                    <input
                      type="number"
                      placeholder="Prix moyen ($)"
                      value={newAvgPrice}
                      onChange={(e) => setNewAvgPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none transition-colors"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                    />
                    <button
                      onClick={handleAddPosition}
                      disabled={addingPosition}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {addingPosition ? (
                        <Loader2 size={14} className="animate-spin inline" />
                      ) : (
                        "Ajouter +"
                      )}
                    </button>
                  </div>
                  {modalError && (
                    <p className="text-sm mt-2" style={{ color: "var(--color-danger)" }}>
                      {modalError}
                    </p>
                  )}
                </div>

                {/* Positions table */}
                <div
                  className="rounded-2xl overflow-hidden mb-6"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border-subtle)",
                            background: "rgba(108,92,231,0.04)",
                          }}
                        >
                          {["Ticker", "Qte", "Prix achat", "Prix actuel", "Valeur", "P&L", "%", ""].map(
                            (label, i) => (
                              <th
                                key={i}
                                className={`px-5 py-4 text-[13px] font-medium ${
                                  i === 0 ? "text-left" : i === 7 ? "" : "text-right"
                                }`}
                                style={{ color: "var(--text-tertiary)" }}
                                dangerouslySetInnerHTML={{ __html: label }}
                              />
                            )
                          )}
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
                          const pnlColor = isPositive
                            ? "var(--color-success)"
                            : "var(--color-danger)";

                          return (
                            <tr
                              key={p.ticker}
                              className="transition-colors"
                              style={{ borderBottom: "1px solid var(--border-subtle)" }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLTableRowElement).style.background =
                                  "rgba(255,255,255,0.02)")
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLTableRowElement).style.background = "")
                              }
                            >
                              <td
                                className="px-5 py-4 font-black"
                                style={{ color: "var(--accent-primary)" }}
                              >
                                {p.ticker}
                              </td>
                              <td
                                className="px-5 py-4 text-right text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {p.shares}
                              </td>
                              <td
                                className="px-5 py-4 text-right text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                ${p.avgPrice.toFixed(2)}
                              </td>
                              <td
                                className="px-5 py-4 text-right text-sm font-semibold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {loadingPrices && !currentPrices[p.ticker] ? (
                                  <span style={{ color: "var(--text-tertiary)" }}>...</span>
                                ) : (
                                  `$${currentPrice.toFixed(2)}`
                                )}
                              </td>
                              <td
                                className="px-5 py-4 text-right font-bold text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                ${value.toFixed(2)}
                              </td>
                              <td
                                className="px-5 py-4 text-right font-bold text-sm"
                                style={{ color: pnlColor }}
                              >
                                {pnl >= 0 ? "+" : ""}
                                {formatCurrency(pnl)}
                              </td>
                              <td
                                className="px-5 py-4 text-right font-bold text-sm"
                                style={{ color: pnlColor }}
                              >
                                {pnlPct >= 0 ? "+" : ""}
                                {pnlPct.toFixed(1)}%
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => router.push(`/analyze?ticker=${p.ticker}`)}
                                    className="text-xs font-medium hover:underline transition-colors"
                                    style={{ color: "var(--accent-primary)" }}
                                  >
                                    Analyser
                                  </button>
                                  <button
                                    onClick={() => handleDelete(p.ticker)}
                                    className="transition-colors"
                                    style={{ color: "var(--text-tertiary)" }}
                                    onMouseEnter={(e) =>
                                      ((e.currentTarget as HTMLButtonElement).style.color =
                                        "var(--color-danger)")
                                    }
                                    onMouseLeave={(e) =>
                                      ((e.currentTarget as HTMLButtonElement).style.color =
                                        "var(--text-tertiary)")
                                    }
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
                        <tr
                          className="font-bold"
                          style={{ background: "rgba(108,92,231,0.04)" }}
                        >
                          <td
                            className="px-5 py-4"
                            colSpan={4}
                            style={{ color: "var(--text-primary)" }}
                          >
                            TOTAL
                          </td>
                          <td
                            className="px-5 py-4 text-right"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {formatCurrency(totalValue)}
                          </td>
                          <td
                            className="px-5 py-4 text-right"
                            style={{
                              color:
                                totalPnl >= 0
                                  ? "var(--color-success)"
                                  : "var(--color-danger)",
                            }}
                          >
                            {totalPnl >= 0 ? "+" : ""}
                            {formatCurrency(totalPnl)}
                          </td>
                          <td
                            className="px-5 py-4 text-right"
                            style={{
                              color:
                                totalPnlPct >= 0
                                  ? "var(--color-success)"
                                  : "var(--color-danger)",
                            }}
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

                {/* Sector distribution */}
                {Object.keys(sectorMap).length >= 1 &&
                  !Object.keys(sectorMap).every((k) => k === "Autre") && (
                    <div className="card p-6 mb-6">
                      <h3 className="text-[13px] font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
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
                                <span
                                  className="text-sm w-40 truncate"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {sector}
                                </span>
                                <div
                                  className="flex-1 rounded-full h-2"
                                  style={{ background: "var(--bg-base)" }}
                                >
                                  <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length],
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-sm w-16 text-right"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {/* AI Insight */}
                <div className="card p-6 mb-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        Analyse IA du portefeuille
                      </h3>
                      <Sparkles size={14} style={{ color: "var(--accent-gold)" }} />
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{
                          color: "var(--accent-gold)",
                          background: "rgba(240,200,80,0.1)",
                          border: "1px solid rgba(240,200,80,0.25)",
                        }}
                      >
                        Pro
                      </span>
                    </div>
                    <button
                      onClick={handleAIInsight}
                      disabled={loadingAI || !isPro || positions.length === 0}
                      className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
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
                    <div
                      className="absolute inset-0 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10"
                      style={{ background: "rgba(18,18,26,0.85)" }}
                    >
                      <div className="text-center">
                        <Sparkles
                          size={24}
                          className="mx-auto mb-3"
                          style={{ color: "var(--accent-gold)" }}
                        />
                        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                          Fonctionnalite reservee aux membres Pro
                        </p>
                        <button
                          onClick={() => router.push("/dashboard")}
                          className="btn-pro"
                        >
                          Passer Pro
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Results */}
                  {aiInsight && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="15.5"
                              fill="none"
                              stroke="var(--bg-base)"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.5"
                              fill="none"
                              stroke="var(--accent-primary)"
                              strokeWidth="3"
                              strokeDasharray={`${(aiInsight.score_diversification / 100) * 97.4} 97.4`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {aiInsight.score_diversification}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                            Score diversification
                          </p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {aiInsight.analyse_globale}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--color-danger)" }}>
                            Risques identifies
                          </p>
                          {aiInsight.concentration_risques?.map((r, i) => (
                            <p key={i} className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                              &#9888;&#65039; {r}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--color-success)" }}>
                            Opportunites
                          </p>
                          {aiInsight.opportunites?.map((o, i) => (
                            <p key={i} className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                              &#10003; {o}
                            </p>
                          ))}
                        </div>
                      </div>

                      {aiInsight.recommandation && (
                        <div
                          className="rounded-xl p-4 mt-4"
                          style={{
                            background: "var(--bg-base)",
                            border: "1px solid rgba(108,92,231,0.2)",
                          }}
                        >
                          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--accent-primary)" }}>
                            Recommandation
                          </p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {aiInsight.recommandation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!aiInsight && !loadingAI && isPro && (
                    <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
                      Cliquez sur &quot;Analyser mon portefeuille&quot; pour obtenir une analyse IA personnalisee.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── HEALTH TAB ────────────────────────────────────────────── */}
            {activeTab === "health" && (
              <div className="animate-in">
                <SmartAlerts
                  positions={positions}
                  currentPrices={currentPrices}
                  isPro={isPro}
                />
                <PortfolioHealthScore
                  positions={positions}
                  currentPrices={currentPrices}
                  isPro={isPro}
                />
              </div>
            )}
          </>
        ) : (
          /* ── EMPTY STATE ──────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: "rgba(108,92,231,0.08)",
                border: "1px solid rgba(108,92,231,0.18)",
              }}
            >
              <span className="text-3xl">&#128188;</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Ton portefeuille est vide
            </h2>
            <p className="text-sm max-w-xs mb-2" style={{ color: "var(--text-secondary)" }}>
              Ajoute tes positions pour suivre ta performance et ton P&amp;L en temps reel.
            </p>
            <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
              Exemple : 10 actions AAPL achetees a 185$
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter une position
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload size={14} /> Importer mon PEA
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL ──────────────────────────────────────────────────── */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <div
              className="rounded-2xl p-8 max-w-md w-full shadow-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                  Ajouter une position
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)")
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-[13px] font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Ticker
                  </label>
                  <input
                    type="text"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                    placeholder="Ex: AAPL, MC.PA"
                    className="w-full rounded-xl px-5 py-3 text-base sm:text-sm font-semibold focus:outline-none transition-all"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  />
                </div>
                <div>
                  <label
                    className="block text-[13px] font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Nombre d&apos;actions
                  </label>
                  <input
                    type="number"
                    value={newShares}
                    onChange={(e) => setNewShares(e.target.value)}
                    placeholder="Ex: 10"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl px-5 py-3 text-base sm:text-sm font-semibold focus:outline-none transition-all"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  />
                </div>
                <div>
                  <label
                    className="block text-[13px] font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Prix d&apos;achat moyen ($)
                  </label>
                  <input
                    type="number"
                    value={newAvgPrice}
                    onChange={(e) => setNewAvgPrice(e.target.value)}
                    placeholder="Ex: 150.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl px-5 py-3 text-base sm:text-sm font-semibold focus:outline-none transition-all"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  />
                </div>
              </div>

              {modalError && (
                <p className="text-sm mt-4" style={{ color: "var(--color-danger)" }}>
                  {modalError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPosition}
                  disabled={addingPosition}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {addingPosition ? (
                    <>
                      <Loader2 size={14} className="animate-spin inline mr-2" />
                      Verification...
                    </>
                  ) : (
                    "Ajouter"
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORT MODAL ────────────────────────────────────────────── */}
        {showImportModal && (
          <ImportPortfolioModal
            onClose={() => setShowImportModal(false)}
            onImported={() => {
              // Reload positions from DB
              fetch("/api/db/portfolio")
                .then((r) => r.json())
                .then(
                  (rows: Array<{
                    id: string;
                    ticker: string;
                    shares: number;
                    avg_price: number;
                    sector?: string;
                  }>) => {
                    if (Array.isArray(rows)) {
                      setPositions(
                        rows.map((r) => ({
                          id: r.id,
                          ticker: r.ticker,
                          shares: r.shares,
                          avgPrice: r.avg_price,
                          sector: r.sector || undefined,
                        }))
                      );
                    }
                  }
                )
                .catch(() => {});
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
