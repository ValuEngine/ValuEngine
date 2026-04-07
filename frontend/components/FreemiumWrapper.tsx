"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useUser, useAuth } from "@clerk/nextjs";
import { Lock, ChevronRight } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { gtmEvents } from "@/lib/analytics";

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
  error,
}: {
  used: number;
  onClose: () => void;
  onUpgrade: () => void;
  error?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[slideUp_0.3s_ease-out] border"
        style={{
          background: "linear-gradient(to bottom, var(--bg-surface), var(--bg-base))",
          borderColor: "rgba(99,102,241,0.3)",
        }}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border"
            style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.25)" }}
          >
            <Lock size={28} style={{ color: "var(--accent-primary)" }} />
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>Limite atteinte</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
            Tu as utilisé tes{" "}
            <span className="font-bold" style={{ color: "var(--accent-gold)" }}>{used} analyses gratuites</span>{" "}
            aujourd&apos;hui. Passe Pro pour des analyses illimitées.
          </p>

          {/* Usage dots */}
          <div className="flex items-center gap-2 mb-7">
            {Array.from({ length: DAILY_FREE_LIMIT }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: i < used ? "var(--accent-gold)" : "var(--border-default)" }}
              />
            ))}
            <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>{used}/{DAILY_FREE_LIMIT}</span>
          </div>

          {/* What you're missing */}
          <div
            className="w-full rounded-xl p-4 mb-6 text-left border"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p className="text-[13px] font-medium mb-3" style={{ color: "var(--text-tertiary)" }}>Ce que tu débloques avec Pro</p>
            <div className="space-y-2">
              {["Analyses illimitées", "DCF interactif complet", "IA Bull & Bear", "SWOT & PESTLE", "Matrice de sensibilité"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent-primary)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="btn-pro w-full py-3 px-6 rounded-xl text-lg transition-all duration-200 hover:scale-[1.02] mb-3 flex items-center justify-center gap-2"
          >
            Passer Pro — 12€/mois <ChevronRight size={18} />
          </button>
          {error && <p className="text-xs mb-2" style={{ color: "var(--color-danger)" }}>{error}</p>}
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>✓ Sans engagement · Annulable à tout moment</p>
          <button
            onClick={onClose}
            className="text-sm transition-colors"
            style={{ color: "var(--text-tertiary)" }}
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
  const [checkoutError, setCheckoutError] = useState("");

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
    gtmEvents.upgradeClicked('pro_gate');
    setCheckoutError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
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
        setCheckoutError(data.detail || "Erreur lors de la création du paiement.");
      }
    } catch {
      setCheckoutError("Impossible de contacter le serveur de paiement.");
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
      error={checkoutError}
    />
  ) : null;
}

/* ── Pro Blur Overlay ──────────────────────────────────────────────── */

export function ProBlurOverlay({ children, featureName }: { children: React.ReactNode; featureName: string }) {
  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="card p-6 text-center max-w-xs" style={{ background: "rgba(10,10,15,0.95)", border: "1px solid rgba(240,200,80,0.25)" }}>
          <span className="text-2xl mb-2 block">🔒</span>
          <p className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>{featureName}</p>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Disponible avec ValuEngine Pro</p>
          <a href="/#pricing" className="btn-pro text-xs px-4 py-2 rounded-lg inline-block">
            Débloquer Pro ✦
          </a>
        </div>
      </div>
    </div>
  );
}
