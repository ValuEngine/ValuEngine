"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function SuccessPage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      localStorage.setItem(`pro_${user.id}`, "true");
      setTimeout(() => router.push("/"), 3000);
    }
  }, [user, router]);

  return (
    <main className="min-h-screen bg-[#0a1628] flex items-center justify-center">
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
      </div>
    </main>
  );
}
