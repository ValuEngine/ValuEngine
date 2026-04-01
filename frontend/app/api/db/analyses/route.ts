import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getAdminClient();
  const { data, error } = await sb
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticker, company_name, ticker_name, verdict, price, price_at_analysis, intrinsic_value, upside_pct } = await req.json();
  const sb = getAdminClient();
  const { data, error } = await sb
    .from("analyses")
    .insert({
      user_id: userId,
      ticker,
      company_name,
      ticker_name: ticker_name ?? company_name,
      verdict,
      price,
      price_at_analysis: price_at_analysis ?? price,
      intrinsic_value,
      upside_pct,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
