import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getAdminClient();
  const { data, error } = await sb
    .from("portfolio")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker, shares, avg_price, sector } = await req.json();

  // Input validation
  if (!ticker || typeof ticker !== "string" || ticker.length > 10 || !/^[A-Za-z0-9.\-]+$/.test(ticker)) {
    return NextResponse.json({ error: "Ticker invalide" }, { status: 400 });
  }
  if (shares !== undefined && (typeof shares !== "number" || shares <= 0 || shares > 1e9)) {
    return NextResponse.json({ error: "Nombre de parts invalide" }, { status: 400 });
  }
  if (avg_price !== undefined && (typeof avg_price !== "number" || avg_price <= 0 || avg_price > 1e8)) {
    return NextResponse.json({ error: "Prix d'achat invalide" }, { status: 400 });
  }
  if (sector !== undefined && sector !== null && (typeof sector !== "string" || sector.length > 100)) {
    return NextResponse.json({ error: "Secteur invalide" }, { status: 400 });
  }

  const sb = getAdminClient();
  const upsertData: Record<string, unknown> = {
    user_id: userId,
    ticker: ticker.toUpperCase(),
    shares,
    avg_price,
    updated_at: new Date().toISOString(),
  };
  if (sector) upsertData.sector = sector;
  const { data, error } = await sb
    .from("portfolio")
    .upsert(upsertData, { onConflict: "user_id,ticker" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker } = await req.json();

  if (!ticker || typeof ticker !== "string" || ticker.length > 10 || !/^[A-Za-z0-9.\-]+$/.test(ticker)) {
    return NextResponse.json({ error: "Ticker invalide" }, { status: 400 });
  }

  const sb = getAdminClient();
  const { error } = await sb
    .from("portfolio")
    .delete()
    .eq("user_id", userId)
    .eq("ticker", ticker.toUpperCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
