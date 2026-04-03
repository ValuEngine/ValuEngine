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

  useEffect(() => {
    if (!isLoaded || !user) return;

    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setStatus("error");
      return;
    }

    async function activate() {
      let backendOk = false;

      // Step 1: Verify session via backend (tries to update Supabase directly)
      try {
        const res = await fetch(
          `${API_BASE}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId!)}`
        );
        if (res.ok) {
          const data = await res.json();
          backendOk = data.db_updated === true;
        }
      } catch {
        // Backend might be down — continue to fallback
      }

      // Step 2: Fallback — also PATCH via Next.js API route (auth-protected, uses Supabase SDK)
      // This ensures Pro is activated even if backend column name mismatched
      try {
        await fetch("/api/db/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pro: true }),
        });
      } catch {
        // If this also fails, at least the backend might have worked
      }

      // Set optimistic Pro flag — badge appears instantly everywhere
      activateProNow();
      setStatus("ready");
      setTimeout(() => router.push("/dashboard"), 3000);
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
            Ton abonnement est actif. Tu as maintenant acc&egrave;s aux analyses illimit&eacute;es,
            au screener, aux alertes et &agrave; toutes les fonctionnalit&eacute;s Pro.
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
            Ton paiement a bien &eacute;t&eacute; re&ccedil;u mais l&apos;activation automatique a &eacute;chou&eacute;.
            Contacte-nous &agrave; <a href="mailto:support@valuengine.fr" className="text-[#C9A84C] underline">support@valuengine.fr</a> et on active ton compte en quelques minutes.
          </p>
        </>
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
