"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { searchTicker } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

interface Position {
  id?: string;
  ticker: string;
  shares: number;
  avgPrice: number;
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Modal state
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Load from Supabase
  useEffect(() => {
    fetch("/api/db/portfolio")
      .then(r => r.json())
      .then((rows: Array<{ id: string; ticker: string; shares: number; avg_price: number }>) => {
        if (Array.isArray(rows)) {
          setPositions(rows.map(r => ({ id: r.id, ticker: r.ticker, shares: r.shares, avgPrice: r.avg_price })));
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
          // keep previous price or leave undefined
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
      setModalError("Veuillez remplir tous les champs correctement.");
      return;
    }

    // Save to Supabase
    fetch("/api/db/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, shares, avg_price: avgPrice }),
    })
      .then(r => r.json())
      .then(row => {
        const updated = [
          ...positions.filter(p => p.ticker !== ticker),
          { id: row.id, ticker, shares, avgPrice },
        ];
        setPositions(updated);
      })
      .catch(() => {
        // fallback: add locally
        setPositions(prev => [...prev.filter(p => p.ticker !== ticker), { ticker, shares, avgPrice }]);
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
    setPositions(prev => prev.filter(p => p.ticker !== ticker));
  };

  // Totals
  const totalValue = positions.reduce((acc, p) => {
    const price = currentPrices[p.ticker] ?? p.avgPrice;
    return acc + p.shares * price;
  }, 0);

  const totalCost = positions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-6 py-8 md:px-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Portefeuille</h1>
            <p className="text-[#6b7d91] text-sm mt-1">Suis tes positions et ton P&amp;L en temps réel</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setModalError(null); }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-5 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
          >
            <Plus size={16} /> Ajouter une position
          </button>
        </div>

        {/* Table */}
        {positions.length > 0 ? (
          <>
            <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(201,168,76,0.05)]">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Ticker</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Actions</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Prix achat</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Prix actuel</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">Valeur</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">P&amp;L €</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[2px] text-[#4a6070]">P&amp;L %</th>
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
                        <tr key={p.ticker} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                          <td className="px-5 py-4 text-[#C9A84C] font-black">{p.ticker}</td>
                          <td className="px-5 py-4 text-right text-white text-sm">{p.shares}</td>
                          <td className="px-5 py-4 text-right text-white text-sm">${p.avgPrice.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right text-white text-sm font-semibold">
                            {loadingPrices && !currentPrices[p.ticker]
                              ? <span className="text-[#4a6070]">...</span>
                              : `$${currentPrice.toFixed(2)}`}
                          </td>
                          <td className="px-5 py-4 text-right text-white font-bold text-sm">${value.toFixed(2)}</td>
                          <td className={`px-5 py-4 text-right font-bold text-sm ${pnlClass}`}>
                            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}€
                          </td>
                          <td className={`px-5 py-4 text-right font-bold text-sm ${pnlClass}`}>
                            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleDelete(p.ticker)}
                              className="text-[#4a6070] hover:text-[#ff4d6d] transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer totals */}
            <div className="bg-[#132032]/80 backdrop-blur-sm border border-[rgba(201,168,76,0.14)] rounded-2xl p-6 flex flex-wrap gap-8">
              <div>
                <p className="text-xs text-[#4a6070] mb-1 uppercase tracking-wider">Valeur totale</p>
                <p className="text-2xl font-black text-white">${totalValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-[#4a6070] mb-1 uppercase tracking-wider">P&amp;L total</p>
                <p className={`text-2xl font-black ${totalPnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                  {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}€
                </p>
              </div>
              <div>
                <p className="text-xs text-[#4a6070] mb-1 uppercase tracking-wider">Rendement</p>
                <p className={`text-2xl font-black ${totalPnlPct >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                  {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
              <span className="text-3xl">💼</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Ton portefeuille est vide</h2>
            <p className="text-[#4a6070] text-sm max-w-xs mb-2">Ajoute tes positions pour suivre ta performance et ton P&amp;L en temps réel.</p>
            <p className="text-[#4a6070] text-xs mb-6">Exemple : 10 actions AAPL achetées à 185$</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
            >
              <Plus size={16} /> Ajouter une position
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm">
            <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.3)] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[slideUp_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">Ajouter une position</h2>
                <button onClick={() => setShowModal(false)} className="text-[#4a6070] hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">Ticker</label>
                  <input
                    type="text"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                    placeholder="Ex: AAPL, MC.PA"
                    className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">Nombre d&apos;actions</label>
                  <input
                    type="number"
                    value={newShares}
                    onChange={(e) => setNewShares(e.target.value)}
                    placeholder="Ex: 10"
                    min="0"
                    step="0.01"
                    className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">Prix d&apos;achat moyen ($)</label>
                  <input
                    type="number"
                    value={newAvgPrice}
                    onChange={(e) => setNewAvgPrice(e.target.value)}
                    placeholder="Ex: 150.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
                  />
                </div>
              </div>

              {modalError && <p className="text-[#ff4d6d] text-sm mt-4">{modalError}</p>}

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
