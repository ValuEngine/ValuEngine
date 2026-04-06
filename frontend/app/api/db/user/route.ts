import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

// GET — récupère le profil user (is_pro inclus)
// Si l'utilisateur n'existe pas encore, le crée via upsert.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getAdminClient();
  let { data, error } = await sb
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  // Si l'utilisateur n'existe pas (PGRST116 = no rows), le créer
  if (error && error.code === "PGRST116") {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    const upsertResult = await sb
      .from("users")
      .upsert(
        { id: userId, email, updated_at: new Date().toISOString() },
        { onConflict: "id", ignoreDuplicates: false }
      )
      .select()
      .single();
    data = upsertResult.data;
    error = upsertResult.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST — upsert user (appelé à la connexion)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";

  // Parse optional referral code from body
  let referredBy: string | undefined;
  try {
    const body = await req.json();
    if (body?.referred_by && typeof body.referred_by === "string" && /^[a-zA-Z0-9_]{3,32}$/.test(body.referred_by)) {
      referredBy = body.referred_by;
    }
  } catch {
    // No body or invalid JSON — that's fine
  }

  const sb = getAdminClient();

  // Check if user already exists (don't overwrite referred_by on subsequent logins)
  const { data: existing } = await sb.from("users").select("id,referred_by").eq("id", userId).single();

  const upsertData: Record<string, unknown> = { id: userId, email, updated_at: new Date().toISOString() };
  // Only set referred_by if user is new (no existing row) or has no referred_by yet
  if (referredBy && (!existing || !existing.referred_by)) {
    upsertData.referred_by = referredBy;
  }

  const { data, error } = await sb
    .from("users")
    .upsert(upsertData, { onConflict: "id", ignoreDuplicates: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — met à jour des champs (is_pro, stripe_customer_id, etc.)
// Si l'utilisateur n'existe pas, le crée d'abord via upsert.
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sb = getAdminClient();
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";

  // Upsert d'abord pour garantir que la ligne existe
  await sb
    .from("users")
    .upsert(
      { id: userId, email, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: false }
    );

  // Puis update les champs demandés
  const { data, error } = await sb
    .from("users")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
