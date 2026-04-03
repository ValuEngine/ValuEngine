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
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";

  const sb = getAdminClient();
  const { data, error } = await sb
    .from("users")
    .upsert(
      { id: userId, email, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: false }
    )
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
