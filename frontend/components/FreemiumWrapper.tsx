"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useUser, useAuth } from "@clerk/nextjs";
import { Lock, ChevronRight } from "lucide-react";
import { authedFetch } from "@/lib/api";

const DAILY_FREE_LIMIT = 3;

/* ── Server-side usage check (single source of truth) ──────────────── */

interface UsageData { used: number; limit: number; is_pro: boolean }

async function fetchUsage(userId: string, getToken: () => Promise<string | null>): Promise<UsageData> {
  try {
    const res = await authedFetch(`/api/usage/${userId}`, getToken, { cache: "no-store" } as RequestInit);
    if (res.ok) return await res.json();
  } catch { /* fallback below */ }
  return { used: 0, limit: DAILY_FREE_LIMIT, is_pro: false };
}

/* ── Paywall modal (rendered via portal) ───────────────────────────── */

function PaywallModal({
  used,
  onClose,
  onUpgrade,
}: {
  used: number;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.3)] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] flex items-center justify-center mb-5">
            <Lock size={28} className="text-[#C9A84C]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Limite atteinte</h2>
          <p className="text-[#7a8fa3] text-sm leading-relaxed mb-6">
            Tu as utilisé tes{" "}
            <span className="text-[#C9A84C] font-bold">{used} analyses gratuites</span>{" "}
            aujourd&apos;hui. Passe Pro pour des analyses illimitées.
          </p>

          {/* Usage dots */}
          <div className="flex items-center gap-2 mb-7">
            {Array.from({ length: DAILY_FREE_LIMIT }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i < used ? "bg-[#C9A84C]" : "bg-zinc-700"}`} />
            ))}
            <span className="text-xs text-[#5d7289] ml-1">{used}/{DAILY_FREE_LIMIT}</span>
          </div>

          {/* What you're missing */}
          <div className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-6 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5d7289] mb-3">Ce que tu débloques avec Pro</p>
            <div className="space-y-2">
              {["Analyses illimitées", "DCF interactif complet", "IA Bull & Bear", "SWOT & PESTLE", "Matrice de sensibilité"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />
                  <span className="text-zinc-300">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full py-3 px-6 bg-[#C9A84C] hover:bg-[#b8943d] text-[#0a1628] font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-[#C9A84C]/20 hover:scale-[1.02] mb-3 flex items-center justify-center gap-2"
          >
            Passer Pro — 12€/mois <ChevronRight size={18} />
          </button>
          <p className="text-zinc-400 text-sm mb-4">✓ Sans engagement · Annulable à tout moment</p>
          <button
            onClick={onClose}
            className="text-[#5d7289] text-sm hover:text-zinc-300 transition-colors"
          >
            Revenir demain
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

/* ── FreemiumGate ────────────────────────────────────────────────────── */

interface GateProps {
  pendingTicker: string | null;
  showPaywall: boolean;
  onApproved: (ticker: string) => void;
  onBlocked: () => void;
  onClosePaywall: () => void;
}

export function FreemiumGate({
  pendingTicker,
  showPaywall,
  onApproved,
  onBlocked,
  onClosePaywall,
}: GateProps) {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  // Fetch usage on mount and when user changes
  const refreshUsage = useCallback(async () => {
    if (user?.id) {
      const data = await fetchUsage(user.id, getToken);
      setUsageData(data);
    }
  }, [user?.id, getToken]);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const handleUpgrade = async () => {
    if (!user) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://peaceful-acceptance-production-2e1d.up.railway.app";
      const res = await fetch(`${apiUrl}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress || "",
          plan: "monthly",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.detail || "Erreur lors de la création du paiement. Réessaie.");
      }
    } catch (err) {
      alert("Impossible de contacter le serveur de paiement. Réessaie dans quelques secondes.");
    }
  };

  useEffect(() => {
    if (!pendingTicker) return;

    // Not signed in — allow (will be caught by auth redirect)
    if (!isSignedIn || !user?.id) {
      onApproved(pendingTicker);
      return;
    }

    // Check server-side usage
    fetchUsage(user.id, getToken).then((data) => {
      setUsageData(data);
      if (data.is_pro) {
        onApproved(pendingTicker);
      } else if (data.used >= data.limit) {
        onBlocked();
      } else {
        onApproved(pendingTicker);
      }
    });
  }, [pendingTicker]);

  return showPaywall ? (
    <PaywallModal
      used={usageData?.used ?? DAILY_FREE_LIMIT}
      onClose={onClosePaywall}
      onUpgrade={handleUpgrade}
    />
  ) : null;
}
