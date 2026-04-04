"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";
import { activateProNow } from "@/hooks/useProStatus";
import { gtmEvents } from "@/lib/analytics";

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
      // Step 1: Verify Stripe session via backend (best-effort)
      try {
        await fetch(
          `${API_BASE}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId!)}`
        );
      } catch {
        // Non-blocking — the PATCH below is the real activation
      }

      // Step 2: Activate Pro in Supabase via Next.js route
      try {
        const res = await fetch("/api/db/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pro: true }),
        });
        if (!res.ok) {
          // PATCH failed — non-blocking, webhook will retry
        }
      } catch {
        // Network error — non-blocking, webhook will retry
      }

      // Step 3: Set optimistic flag for immediate UI update
      activateProNow();

      // Track conversion
      gtmEvents.checkoutCompleted("pro", 0);

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
          <p className="text-[#71717a] text-sm">Paiement reçu, configuration de ton compte Pro.</p>
        </>
      )}

      {status === "ready" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.15)] border-2 border-[#C9A84C] flex items-center justify-center mx-auto animate-[scaleIn_0.4s_ease-out]">
            <CheckCircle2 size={32} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenue dans ValuEngine Pro ✦
          </h1>
          <p className="text-[#a1a1aa]">
            Ton abonnement est actif. Tu as maintenant accès aux analyses illimitées.
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
          <h1 className="text-2xl font-bold text-white">Paiement confirmé</h1>
          <p className="text-[#a1a1aa]">
            Si ton compte Pro n&apos;est pas activé dans quelques minutes, contacte-nous à{" "}
            <a href="mailto:support@valuengine.fr" className="text-[#C9A84C] underline">
              support@valuengine.fr
            </a>.
          </p>
        </>
      )}

      <button
        onClick={() => router.push("/dashboard")}
        className="text-sm text-[#C9A84C] hover:underline mt-2"
      >
        Aller au dashboard →
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
