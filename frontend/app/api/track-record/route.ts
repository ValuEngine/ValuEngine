export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export interface TrackRecordEntry {
  id: string;
  ticker: string;
  name: string;
  verdict: string;
  price_entry: number | null;
  price_now: number | null;
  performance_pct: number | null;
  created_at: string;
}

export interface TrackRecordResponse {
  entries: TrackRecordEntry[];
  summary: {
    total: number;
    wins: number;
    win_rate: number;
    avg_performance: number;
    best_ticker: string;
    best_performance: number;
  };
  is_demo: boolean;
}

/* ── Demo data (shown only when 0 real analyses exist) ──────────────── */

const DEMO_ENTRIES: TrackRecordEntry[] = [
  { id: "demo-1",  ticker: "NVDA",   name: "NVIDIA Corporation",   verdict: "BUY",  price_entry: 487.20, price_now: 721.50, performance_pct: 48.10,  created_at: "2024-09-14T10:00:00Z" },
  { id: "demo-2",  ticker: "MC.PA",  name: "LVMH Moët Hennessy",   verdict: "BUY",  price_entry: 642.80, price_now: 583.40, performance_pct: -9.24,  created_at: "2024-10-03T10:00:00Z" },
  { id: "demo-3",  ticker: "MSFT",   name: "Microsoft Corporation", verdict: "BUY",  price_entry: 378.90, price_now: 421.30, performance_pct: 11.19,  created_at: "2024-10-22T10:00:00Z" },
  { id: "demo-4",  ticker: "TTE.PA", name: "TotalEnergies SE",      verdict: "HOLD", price_entry: 61.20,  price_now: 58.90,  performance_pct: -3.76,  created_at: "2024-11-05T10:00:00Z" },
  { id: "demo-5",  ticker: "ASML",   name: "ASML Holding",          verdict: "BUY",  price_entry: 712.40, price_now: 698.20, performance_pct: -1.99,  created_at: "2024-11-18T10:00:00Z" },
  { id: "demo-6",  ticker: "META",   name: "Meta Platforms",        verdict: "BUY",  price_entry: 512.30, price_now: 594.80, performance_pct: 16.10,  created_at: "2024-12-02T10:00:00Z" },
  { id: "demo-7",  ticker: "BNP.PA", name: "BNP Paribas",           verdict: "SELL", price_entry: 58.40,  price_now: 54.20,  performance_pct: -7.19,  created_at: "2024-12-15T10:00:00Z" },
  { id: "demo-8",  ticker: "AAPL",   name: "Apple Inc.",            verdict: "HOLD", price_entry: 243.10, price_now: 198.40, performance_pct: -18.39, created_at: "2025-01-08T10:00:00Z" },
  { id: "demo-9",  ticker: "AIR.PA", name: "Airbus SE",             verdict: "BUY",  price_entry: 156.20, price_now: 178.60, performance_pct: 14.34,  created_at: "2025-01-21T10:00:00Z" },
  { id: "demo-10", ticker: "GOOGL",  name: "Alphabet Inc.",         verdict: "BUY",  price_entry: 189.40, price_now: 154.80, performance_pct: -18.27, created_at: "2025-02-03T10:00:00Z" },
  { id: "demo-11", ticker: "OR.PA",  name: "L'Oréal",              verdict: "HOLD", price_entry: 387.50, price_now: 371.20, performance_pct: -4.21,  created_at: "2025-02-14T10:00:00Z" },
  { id: "demo-12", ticker: "AMZN",   name: "Amazon.com",            verdict: "BUY",  price_entry: 224.80, price_now: 186.40, performance_pct: -17.08, created_at: "2025-02-28T10:00:00Z" },
  { id: "demo-13", ticker: "SAN.PA", name: "Sanofi",                verdict: "BUY",  price_entry: 89.30,  price_now: 102.40, performance_pct: 14.67,  created_at: "2025-03-10T10:00:00Z" },
  { id: "demo-14", ticker: "TSLA",   name: "Tesla Inc.",            verdict: "SELL", price_entry: 389.20, price_now: 243.80, performance_pct: -37.36, created_at: "2025-03-18T10:00:00Z" },
  { id: "demo-15", ticker: "NFLX",   name: "Netflix Inc.",          verdict: "BUY",  price_entry: 892.40, price_now: 978.30, performance_pct: 9.62,   created_at: "2025-03-25T10:00:00Z" },
];

function computeSummary(entries: TrackRecordEntry[]): TrackRecordResponse["summary"] {
  const scoreable = entries.filter(
    (e) => e.performance_pct != null && ["BUY", "SELL", "HOLD"].includes(e.verdict)
  );

  const wins = scoreable.filter((e) => {
    const perf = e.performance_pct ?? 0;
    if (e.verdict === "BUY") return perf > 0;
    if (e.verdict === "SELL") return perf < 0;
    if (e.verdict === "HOLD") return Math.abs(perf) <= 10;
    return false;
  }).length;

  const win_rate = scoreable.length > 0 ? +(wins / scoreable.length * 100).toFixed(1) : 0;

  const allWithPerf = entries.filter((e) => e.performance_pct != null);
  const avg_performance = allWithPerf.length > 0
    ? +(allWithPerf.reduce((s, e) => s + (e.performance_pct ?? 0), 0) / allWithPerf.length).toFixed(2)
    : 0;

  let best_ticker = "";
  let best_performance = 0;
  for (const e of entries) {
    if (e.performance_pct == null) continue;
    const effectivePerf = e.verdict === "SELL" ? -e.performance_pct : e.performance_pct;
    if (effectivePerf > best_performance) {
      best_performance = effectivePerf;
      best_ticker = e.ticker;
    }
  }

  return { total: entries.length, wins, win_rate, avg_performance, best_ticker, best_performance };
}

let _cache: { data: TrackRecordResponse; ts: number } | null = null;

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data);
  }

  // Try fetching from backend (which does live price updates)
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/api/track-record/entries`, {
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const backendData: { entries: TrackRecordEntry[]; summary: { total: number; wins: number; win_rate: number; avg_performance: number } } = await r.json();

        if (backendData.entries && backendData.entries.length > 0) {
          const fullSummary = computeSummary(backendData.entries);
          const result: TrackRecordResponse = {
            entries: backendData.entries,
            summary: fullSummary,
            is_demo: false,
          };
          _cache = { data: result, ts: Date.now() };
          return NextResponse.json(result);
        }
      }
    } catch (e) {
      console.error("[TrackRecord] Backend fetch failed, falling back:", e);
    }
  }

  // Fallback to demo data only when no real data exists
  const demoResult: TrackRecordResponse = {
    entries: DEMO_ENTRIES,
    summary: computeSummary(DEMO_ENTRIES),
    is_demo: true,
  };
  _cache = { data: demoResult, ts: Date.now() };
  return NextResponse.json(demoResult);
}
