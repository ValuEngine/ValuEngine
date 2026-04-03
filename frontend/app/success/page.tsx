"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";
import { invalidateProCache } from "@/hooks/useProStatus";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"activating" | "ready" | "error">("activating");

  useEffect(() => {
    if (!isLoaded) return;

    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setStatus("error");
      return;
    }

    async function activate() {
      try {
        const res = await fetch(`${API_BASE}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId!)}`);
        if (res.ok) {
          invalidateProCache();
          setStatus("ready");
          setTimeout(() => router.push("/dashboard"), 2500);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    activate();
  }, [isLoaded, user, router, searchParams]);

  return (
    <div className="text-center space-y-6 max-w-md px-4">
      {status === "activating" && (
        <>
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-white">Activation en cours...</h1>
          <p className="text-[#71717a] text-sm">Paiement recu, configuration de ton compte Pro.</p>
        </>
      )}

      {status === "ready" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenue dans ValuEngine Pro</h1>
          <p className="text-[#a1a1aa]">
            Ton abonnement est activ&eacute;. Tu as maintenant acc&egrave;s aux analyses illimit&eacute;es.
          </p>
          <p className="text-[#C9A84C] text-sm">Redirection vers le dashboard...</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Paiement confirm&eacute;</h1>
          <p className="text-[#a1a1aa]">
            Ton paiement a bien &eacute;t&eacute; re&ccedil;u. L&apos;activation peut prendre quelques instants.
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
      <Suspense fallback={
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-white">Chargement...</h1>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
