"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";

export default function SuccessPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"activating" | "ready" | "error">("activating");

  useEffect(() => {
    if (!isLoaded) return;

    async function activate() {
      try {
        const res = await fetch("/api/db/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pro: true }),
        });
        if (res.ok) {
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
  }, [isLoaded, user, router]);

  return (
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
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
            <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-[#C9A84C]" />
            </div>
            <h1 className="text-2xl font-bold text-white">Bienvenue dans ValuEngine Pro</h1>
            <p className="text-[#a1a1aa]">
              Ton abonnement est activé. Tu as maintenant accès aux analyses illimitées.
            </p>
            <p className="text-[#C9A84C] text-sm">Redirection vers le dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-[#C9A84C]" />
            </div>
            <h1 className="text-2xl font-bold text-white">Paiement confirmé</h1>
            <p className="text-[#a1a1aa]">
              Ton paiement a bien été reçu. L'activation peut prendre quelques instants.
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
    </main>
  );
}
