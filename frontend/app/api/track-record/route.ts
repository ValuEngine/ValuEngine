export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_TTL = 10 * 60 * 1000; // 10 min

interface RawAnalysis {
  id: string;
  ticker: string;
  ticker_name: string | null;
  company_name: string | null;
  verdict: string;
  price_at_analysis: number | null;
  price: number | null;
  price_now: number | null;
  performance_pct: number | null;
  created_at: string;
}

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
  };
}

let _cache: { data: TrackRecordResponse; ts: number } | null = null;

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data);
  }

  const sb = getAdminClient();

  const { data: analyses, error } = await sb
    .from("analyses")
    .select("id, ticker, ticker_name, company_name, verdict, price_at_analysis, price, price_now, performance_pct, created_at")
    .not("verdict", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!analyses?.length) {
    return NextResponse.json({
      entries: [],
      summary: { total: 0, wins: 0, win_rate: 0, avg_performance: 0 },
    });
  }

  // Collect unique tickers that have an entry price
  const withPrice = (analyses as RawAnalysis[]).filter(
    (a) => (a.price_at_analysis ?? a.price) != null
  );
  const uniqueTickers = Array.from(new Set(withPrice.map((a) => a.ticker)));

  // Batch fetch live prices from FastAPI
  const priceMap: Record<string, number> = {};
  if (uniqueTickers.length > 0 && API_BASE) {
    try {
      const r = await fetch(
        `${API_BASE}/api/quotes?tickers=${uniqueTickers.join(",")}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (r.ok) {
        const quotes: Array<{ ticker: string; price: number }> = await r.json();
        for (const q of quotes) priceMap[q.ticker] = q.price;
      }
    } catch { /* fall back to stored price_now */ }
  }

  // Compute performance, build entries + update batch
  const updates: Array<{ id: string; price_now: number; performance_pct: number }> = [];
  const entries: TrackRecordEntry[] = [];

  for (const a of analyses as RawAnalysis[]) {
    const priceEntry = a.price_at_analysis ?? a.price;
    const priceNow = priceMap[a.ticker] ?? a.price_now ?? null;
    let perf = a.performance_pct ?? null;

    if (priceEntry && priceNow) {
      perf = +((priceNow - priceEntry) / priceEntry * 100).toFixed(2);
      updates.push({ id: a.id, price_now: priceNow, performance_pct: perf });
    }

    entries.push({
      id: a.id,
      ticker: a.ticker,
      name: a.ticker_name ?? a.company_name ?? a.ticker,
      verdict: a.verdict,
      price_entry: priceEntry ?? null,
      price_now: priceNow,
      performance_pct: perf,
      created_at: a.created_at,
    });
  }

  // Fire-and-forget Supabase update
  if (updates.length > 0) {
    void sb.from("analyses").upsert(updates, { onConflict: "id" });
  }

  // Summary stats (BUY/SELL verdicts with performance data only)
  const scoreable = entries.filter(
    (e) => e.performance_pct != null && (e.verdict === "BUY" || e.verdict === "SELL")
  );
  const wins = scoreable.filter(
    (e) =>
      (e.verdict === "BUY" && (e.performance_pct ?? 0) > 0) ||
      (e.verdict === "SELL" && (e.performance_pct ?? 0) < 0)
  ).length;
  const win_rate =
    scoreable.length > 0 ? +(wins / scoreable.length * 100).toFixed(1) : 0;
  const avg_performance =
    scoreable.length > 0
      ? +(
          scoreable.reduce((s, e) => s + (e.performance_pct ?? 0), 0) /
          scoreable.length
        ).toFixed(2)
      : 0;

  const result: TrackRecordResponse = {
    entries,
    summary: { total: entries.length, wins, win_rate, avg_performance },
  };

  _cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}
