"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { gtmEvents } from "@/lib/analytics";

export default function PricingSection() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [annual, setAnnual] = useState(true);
  const [checkoutErr, setCheckoutErr] = useState("");

  return (
    <>
      {/* Toggle */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center rounded-full p-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setAnnual(false)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: !annual ? "var(--accent-primary)" : "transparent", color: !annual ? "#fff" : "var(--text-secondary)" }}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnual(true)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: annual ? "var(--accent-primary)" : "transparent", color: annual ? "#fff" : "var(--text-secondary)" }}
          >
            Annuel <span className="text-xs font-bold ml-1" style={{ color: "var(--color-success)" }}>-17%</span>
          </button>
        </div>
      </div>

      {/* Urgency banner */}
      <div className="flex items-center justify-center gap-3 mb-8 px-4 py-3 rounded-xl mx-auto max-w-lg" style={{ background: "rgba(255,184,77,0.08)", border: "1px solid rgba(255,184,77,0.2)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--accent-gold)" }}>Offre de lancement &mdash; 99&euro;/an au lieu de 149&euro;</span>
        <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "var(--accent-gold)", color: "var(--bg-base)" }}>&Eacute;conomise 50&euro;</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Free */}
        <div className="card p-6 sm:p-8">
          <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "var(--text-tertiary)" }}>Gratuit</p>
          <p className="text-4xl sm:text-5xl font-black mb-1" style={{ color: "var(--text-primary)" }}>0&euro;</p>
          <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>Pour toujours</p>
          <ul className="space-y-3 text-sm mb-8">
            {["3 analyses par jour", "Verdict DCF (sous-évalué / surévalué)", "Estimation de valeur intrinsèque"].map((item) => (
              <li key={item} className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--text-tertiary)" }} />{item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => router.push(isSignedIn ? "/dashboard" : "/sign-up")}
            className="btn-secondary w-full font-semibold py-3 rounded-lg transition-all"
          >
            {isSignedIn ? "Aller au Dashboard" : "Créer un compte gratuit"}
          </button>
          <p className="text-xs text-center mt-3" style={{ color: "var(--text-tertiary)" }}>&#10003; Gratuit &middot; &#10003; Sans carte bancaire &middot; &#10003; Résultats en 60 secondes</p>
        </div>

        {/* Pro */}
        <div className="card-pro p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-wider" style={{ background: "var(--accent-gold)", color: "var(--bg-base)" }}>
            {annual ? "2 MOIS OFFERTS" : "POPULAIRE"}
          </div>
          <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: "var(--accent-gold)" }}>Pro</p>
          {annual ? (
            <>
              <p className="text-4xl sm:text-5xl font-black mb-1" style={{ color: "var(--text-primary)" }}>99&euro;</p>
              <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>par an &middot; soit 8,25&euro;/mois</p>
            </>
          ) : (
            <>
              <p className="text-4xl sm:text-5xl font-black mb-1" style={{ color: "var(--text-primary)" }}>12&euro;</p>
              <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>par mois</p>
            </>
          )}
          <ul className="space-y-3 text-sm mb-8">
            {["Analyses illimitées", "DCF interactif complet", "Analyse IA Bull & Bear", "SWOT & PESTLE", "Trading Comps sectoriels", "Matrice de sensibilité", "Watchlist (50 tickers)"].map((item) => (
              <li key={item} className="flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-gold)" }} />{item}
              </li>
            ))}
          </ul>
          <button
            onClick={async () => {
              if (!isSignedIn) { router.push("/sign-up"); return; }
              setCheckoutErr("");
              gtmEvents.checkoutStarted(annual ? "yearly" : "monthly");
              try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                const res = await fetch(`${apiUrl}/api/stripe/create-checkout`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: user?.id,
                    userEmail: user?.emailAddresses?.[0]?.emailAddress,
                    plan: annual ? "yearly" : "monthly",
                  }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else setCheckoutErr(data.detail || "Erreur lors de la création du paiement.");
              } catch { setCheckoutErr("Impossible de contacter le serveur de paiement."); }
            }}
            className="btn-pro w-full font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            Passer Pro <ChevronRight size={16} />
          </button>
          {checkoutErr && <p className="text-xs text-center mt-2" style={{ color: "var(--color-danger)" }}>{checkoutErr}</p>}
          <p className="text-xs text-center mt-3" style={{ color: "var(--text-tertiary)" }}>Annulable &agrave; tout moment &middot; Remboursement 30 jours</p>
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
            <span>Paiement sécurisé par Stripe</span>
            <span style={{ color: "var(--border-subtle)" }}>&middot;</span>
            <span>Annulable à tout moment</span>
            <span style={{ color: "var(--border-subtle)" }}>&middot;</span>
            <span>Données hébergées en UE</span>
          </div>
        </div>
      </div>
    </>
  );
}
