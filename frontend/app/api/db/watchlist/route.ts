import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getAdminClient();

  // 1. Watchlist items
  const { data: items, error } = await sb
    .from("watchlist")
    .select("ticker, company_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!items?.length) return NextResponse.json([]);

  // 2. Last verdict per ticker from analyses
  const tickers = items.map((i) => i.ticker);
  const { data: analysesData } = await sb
    .from("analyses")
    .select("ticker, verdict, created_at")
    .eq("user_id", userId)
    .in("ticker", tickers)
    .order("created_at", { ascending: false });

  const lastVerdicts: Record<string, string> = {};
  for (const a of analysesData ?? []) {
    if (!lastVerdicts[a.ticker]) lastVerdicts[a.ticker] = a.verdict;
  }

  // 3. Live quotes from FastAPI backend (parallel, individual failure safe)
  const enriched = await Promise.all(
    items.map(async (item) => {
      try {
        const r = await fetch(`${API_BASE}/api/quote/${item.ticker}`, {
          next: { revalidate: 0 },
          signal: AbortSignal.timeout(4000),
        });
        const q = r.ok ? await r.json() : {};
        return {
          ticker:     item.ticker,
          name:       q.name ?? item.company_name ?? item.ticker,
          price:      q.price ?? null,
          change_pct: q.change_pct ?? null,
          verdict:    lastVerdicts[item.ticker] ?? null,
        };
      } catch {
        return {
          ticker:     item.ticker,
          name:       item.company_name ?? item.ticker,
          price:      null,
          change_pct: null,
          verdict:    lastVerdicts[item.ticker] ?? null,
        };
      }
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker, company_name } = await req.json();
  const sb = getAdminClient();

  // Max 20 tickers per user
  const { count } = await sb
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: "Limite de 20 tickers atteinte" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("watchlist")
    .upsert(
      { user_id: userId, ticker: ticker.toUpperCase(), company_name },
      { onConflict: "user_id,ticker", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker } = await req.json();
  const sb = getAdminClient();
  const { error } = await sb
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("ticker", ticker.toUpperCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
