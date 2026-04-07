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
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

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
    <div className="flex items-center gap-3 py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>
      <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
      Chargement des comparables sectoriels…
    </div>
  );

  if (error || peers.length === 0) return (
    <p className="text-sm py-4" style={{ color: "var(--text-tertiary)" }}>
      {error || "Aucun comparable disponible pour ce secteur."}
    </p>
  );

  const headers = ["Ticker", "Société", "Prix", "Market Cap", "P/E", "EV/EBITDA", "Marge nette", "Croissance CA", "Beta"];

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const sortedPeers = (() => {
    if (!sortCol) return peers;
    const keyMap: Record<string, (p: Peer) => number | string | null> = {
      "Ticker": p => p.ticker,
      "Société": p => p.name,
      "Prix": p => p.price,
      "Market Cap": p => p.market_cap,
      "P/E": p => p.pe_ratio,
      "EV/EBITDA": p => p.ev_ebitda,
      "Marge nette": p => p.profit_margin,
      "Croissance CA": p => p.revenue_growth,
      "Beta": p => p.beta,
    };
    const getter = keyMap[sortCol];
    if (!getter) return peers;
    return [...peers].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string" && typeof vb === "string") {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  })();

  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgba(99,102,241,0.14)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.1)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3.5 text-[13px] font-medium whitespace-nowrap cursor-pointer select-none transition-colors"
                style={{ color: sortCol === h ? "var(--accent-primary)" : "var(--text-tertiary)" }}
                onClick={() => handleSort(h)}
              >
                {h} {sortCol === h ? (sortAsc ? "▲" : "▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedPeers.map((p, i) => (
            <tr key={p.ticker}
              className="border-b transition-colors hover:bg-[rgba(99,102,241,0.03)]"
              style={{
                borderColor: "rgba(255,255,255,0.03)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <td className="px-5 py-4 font-bold font-mono" style={{ color: "var(--accent-primary)" }}>{p.ticker}</td>
              <td className="px-5 py-4 font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</td>
              <td className="px-5 py-4 font-bold" style={{ color: "var(--text-primary)" }}>${p.price.toFixed(2)}</td>
              <td className="px-5 py-4" style={{ color: "var(--text-secondary)" }}>{fmtCap(p.market_cap)}</td>
              <td className="px-5 py-4" style={{ color: "var(--text-secondary)" }}>{fmt(p.pe_ratio, "x")}</td>
              <td className="px-5 py-4" style={{ color: "var(--text-secondary)" }}>{fmt(p.ev_ebitda, "x")}</td>
              <td className="px-5 py-4 font-semibold" style={{ color: p.profit_margin != null && p.profit_margin > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                {p.profit_margin != null ? `${p.profit_margin}%` : "—"}
              </td>
              <td className="px-5 py-4 font-semibold" style={{ color: p.revenue_growth != null && p.revenue_growth > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                {p.revenue_growth != null ? `${p.revenue_growth > 0 ? "+" : ""}${p.revenue_growth}%` : "—"}
              </td>
              <td className="px-5 py-4" style={{ color: "var(--text-secondary)" }}>{fmt(p.beta)}</td>
            </tr>
          ))}
          {/* Median row */}
          {peers.length > 0 && (() => {
            const median = (arr: number[]) => {
              const sorted = [...arr].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            };
            const peValues = peers.map(p => p.pe_ratio).filter((v): v is number => v != null && v > 0 && v < 200);
            const evValues = peers.map(p => p.ev_ebitda).filter((v): v is number => v != null && v > 0 && v < 100);
            const marginValues = peers.map(p => p.profit_margin).filter((v): v is number => v != null);
            const growthValues = peers.map(p => p.revenue_growth).filter((v): v is number => v != null);
            const betaValues = peers.map(p => p.beta).filter((v): v is number => v != null && v > 0);

            return (
              <tr style={{ borderTop: "2px solid var(--accent-primary)", background: "rgba(108,92,231,0.06)" }}>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--accent-primary)" }}>MÉDIANE</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>Secteur</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>—</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>—</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--text-primary)" }}>{peValues.length ? `${median(peValues).toFixed(1)}x` : "—"}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--text-primary)" }}>{evValues.length ? `${median(evValues).toFixed(1)}x` : "—"}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: marginValues.length && median(marginValues) > 0 ? "var(--color-success)" : "var(--color-danger)" }}>{marginValues.length ? `${(median(marginValues) * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: growthValues.length && median(growthValues) > 0 ? "var(--color-success)" : "var(--color-danger)" }}>{growthValues.length ? `${(median(growthValues) * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--text-primary)" }}>{betaValues.length ? median(betaValues).toFixed(2) : "—"}</td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}
