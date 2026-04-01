"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Peer {
  ticker: string; name: string; price: number; market_cap: number;
  pe_ratio: number | null; ev_ebitda: number | null;
  profit_margin: number | null; revenue_growth: number | null; beta: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function fmt(n: number | null, suffix = ""): string {
  if (n == null) return "—";
  return `${n}${suffix}`;
}

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(0)}B`;
  return `$${n.toLocaleString()}`;
}

export function TradingComps({ ticker, sector }: { ticker: string; sector: string }) {
  const [peers, setPeers]   = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/peers/${ticker}?sector=${encodeURIComponent(sector)}`);
        if (!res.ok) throw new Error("Impossible de charger les comparables");
        const json = await res.json();
        setPeers(json.peers || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [ticker, sector]);

  if (loading) return (
    <div className="flex items-center gap-3 py-8 text-[#5d7289] text-sm">
      <Loader2 size={16} className="animate-spin text-[#C9A84C]" />
      Chargement des comparables sectoriels…
    </div>
  );

  if (error || peers.length === 0) return (
    <p className="text-[#4a6070] text-sm py-4">
      {error || "Aucun comparable disponible pour ce secteur."}
    </p>
  );

  const headers = ["Ticker", "Société", "Prix", "Market Cap", "P/E", "EV/EBITDA", "Marge nette", "Croissance CA", "Beta"];

  return (
    <div className="overflow-x-auto rounded-2xl border border-[rgba(201,168,76,0.14)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[rgba(201,168,76,0.05)] border-b border-[rgba(201,168,76,0.1)]">
            {headers.map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#5d7289] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {peers.map((p, i) => (
            <tr key={p.ticker}
              className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(201,168,76,0.03)] transition-colors ${i % 2 === 0 ? "" : "bg-[rgba(255,255,255,0.01)]"}`}
            >
              <td className="px-5 py-4 font-bold text-[#C9A84C] font-mono">{p.ticker}</td>
              <td className="px-5 py-4 text-white font-medium">{p.name}</td>
              <td className="px-5 py-4 text-white font-bold">${p.price.toFixed(2)}</td>
              <td className="px-5 py-4 text-[#7a8fa3]">{fmtCap(p.market_cap)}</td>
              <td className="px-5 py-4 text-[#7a8fa3]">{fmt(p.pe_ratio, "x")}</td>
              <td className="px-5 py-4 text-[#7a8fa3]">{fmt(p.ev_ebitda, "x")}</td>
              <td className={`px-5 py-4 font-semibold ${p.profit_margin != null && p.profit_margin > 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                {p.profit_margin != null ? `${p.profit_margin}%` : "—"}
              </td>
              <td className={`px-5 py-4 font-semibold ${p.revenue_growth != null && p.revenue_growth > 0 ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                {p.revenue_growth != null ? `${p.revenue_growth > 0 ? "+" : ""}${p.revenue_growth}%` : "—"}
              </td>
              <td className="px-5 py-4 text-[#7a8fa3]">{fmt(p.beta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
