"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";
import { activateProNow } from "@/hooks/useProStatus";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"activating" | "ready" | "error">("activating");
  const [debug, setDebug] = useState("");

  useEffect(() => {
    if (!isLoaded || !user) return;

    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      setDebug("session_id absent de l'URL");
      return;
    }

    async function activate() {
      const logs: string[] = [];

      // ── Step 1: Verify Stripe session via backend ────────────────
      try {
        logs.push("1. Appel verify-session...");
        const res = await fetch(
          `${API_BASE}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId!)}`
        );
        const text = await res.text();
        logs.push(`   → ${res.status} ${text.slice(0, 200)}`);
      } catch (e) {
        logs.push(`   → ERREUR: ${e}`);
      }

      // ── Step 2: PATCH via Next.js route (Supabase SDK direct) ────
      let patchOk = false;
      try {
        logs.push("2. PATCH /api/db/user {is_pro: true}...");
        const res = await fetch("/api/db/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pro: true }),
        });
        const data = await res.json();
        patchOk = res.ok;
        logs.push(`   → ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
      } catch (e) {
        logs.push(`   → ERREUR: ${e}`);
      }

      // ── Step 3: Verify the update worked ─────────────────────────
      try {
        logs.push("3. GET /api/db/user (vérification)...");
        const res = await fetch("/api/db/user");
        const data = await res.json();
        logs.push(`   → is_pro=${data?.is_pro}, id=${data?.id?.slice(0, 10)}...`);
        if (data?.is_pro === true) {
          logs.push("   ✓ CONFIRMÉ: is_pro=true en base");
        } else {
          logs.push("   ✗ PROBLÈME: is_pro n'est PAS true en base");
        }
      } catch (e) {
        logs.push(`   → ERREUR: ${e}`);
      }

      // ── Step 4: Set optimistic flag ──────────────────────────────
      activateProNow();
      logs.push("4. activateProNow() appelé");

      setDebug(logs.join("\n"));
      setStatus("ready");
      setTimeout(() => router.push("/dashboard"), 3500);
    }

    activate();
  }, [isLoaded, user, router, searchParams]);

  return (
    <div className="text-center space-y-6 max-w-md px-4">
      {status === "activating" && (
        <>
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-white">Activation en cours...</h1>
          <p className="text-[#71717a] text-sm">Paiement re&ccedil;u, configuration de ton compte Pro.</p>
        </>
      )}

      {status === "ready" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.15)] border-2 border-[#C9A84C] flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenue dans ValuEngine Pro &#10022;
          </h1>
          <p className="text-[#a1a1aa]">
            Ton abonnement est actif. Tu as maintenant acc&egrave;s aux analyses illimit&eacute;es.
          </p>
          <p className="text-[#C9A84C] text-sm font-medium animate-pulse">
            Redirection vers le dashboard...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Paiement confirm&eacute;</h1>
          <p className="text-[#a1a1aa]">
            Contacte-nous &agrave; <a href="mailto:support@valuengine.fr" className="text-[#C9A84C] underline">support@valuengine.fr</a>.
          </p>
        </>
      )}

      {/* Debug log — visible temporairement pour diagnostic */}
      {debug && (
        <pre className="mt-6 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-400 text-left overflow-auto max-h-48 whitespace-pre-wrap">
          {debug}
        </pre>
      )}

      <button
        onClick={() => router.push("/dashboard")}
        className="text-sm text-[#C9A84C] hover:underline mt-2"
      >
        Aller au dashboard &rarr;
      </button>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-center space-y-6 max-w-md px-4">
            <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-white">Chargement...</h1>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </main>
  );
}
