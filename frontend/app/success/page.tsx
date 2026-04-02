"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function SuccessPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Persistance Supabase — marque is_pro: true côté serveur
    fetch("/api/db/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pro: true }),
    }).catch(() => {});

    const timer = setTimeout(() => router.push("/dashboard"), 3000);
    return () => clearTimeout(timer);
  }, [isLoaded, user, router]);

  return (
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-white">
          Bienvenue dans ValuEngine Pro !
        </h1>
        <p className="text-[#a0aec0]">
          Ton abonnement est actif. Analyses illimitées débloquées.
        </p>
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[#C9A84C] text-sm">
          Redirection en cours...
        </p>
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
