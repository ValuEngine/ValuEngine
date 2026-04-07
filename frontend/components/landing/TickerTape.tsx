"use client";

import { useState, useEffect } from "react";

interface MarketItem { label: string; value: string; change: string; up: boolean }

export default function TickerTape() {
  const [tapeData, setTapeData] = useState<MarketItem[]>([]);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    const fetchMarket = () => {
      fetch(`${API_BASE}/api/market-overview`)
        .then((r) => r.ok ? r.json() : [])
        .then((d: MarketItem[]) => { if (d.length) setTapeData(d); })
        .catch(() => {});
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex animate-[tickerScroll_30s_linear_infinite] whitespace-nowrap" style={{ width: "max-content" }}>
      {tapeData.length > 0 ? (
        [...tapeData, ...tapeData, ...tapeData].map((m, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold">
            <span style={{ color: "var(--accent-primary)" }}>{m.label}</span>
            <span style={{ color: "var(--text-primary)" }}>{m.value}</span>
            <span style={{ color: m.up ? "var(--color-success)" : "var(--color-danger)" }}>{m.change}</span>
            <span className="mx-2" style={{ color: "var(--text-tertiary)" }}>&middot;</span>
          </span>
        ))
      ) : (
        ["S&P 500", "NASDAQ", "CAC 40", "DAX"].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
            {t}<span className="mx-2" style={{ color: "var(--text-tertiary)" }}>&middot;</span>
          </span>
        ))
      )}
    </div>
  );
}
