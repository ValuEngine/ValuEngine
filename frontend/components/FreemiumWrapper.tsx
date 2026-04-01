"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Lock } from "lucide-react";

const DAILY_FREE_LIMIT = 3;
const STORAGE_KEY = "ve_usage";

function checkIsPro(userId?: string): boolean {
  if (typeof window === "undefined") return false;
  if (userId && localStorage.getItem(`pro_${userId}`) === "true") return true;
  const globalPro = localStorage.getItem("valuengine_pro");
  const globalTs = localStorage.getItem("valuengine_pro_ts");
  if (globalPro === "true" && globalTs) {
    const age = Date.now() - parseInt(globalTs);
    if (age < 30 * 24 * 60 * 60 * 1000) return true;
  }
  return false;
}

interface UsageRecord { userId: string; date: string; count: number }

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(userId: string): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const rec: UsageRecord = JSON.parse(raw);
      if (rec.userId === userId && rec.date === getTodayStr()) return rec;
    }
  } catch { /* ignore */ }
  return { userId, date: getTodayStr(), count: 0 };
}

function incrementUsage(userId: string): void {
  const rec = getUsage(userId);
  rec.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
}

function hasReachedLimit(userId: string): boolean {
  return getUsage(userId).count >= DAILY_FREE_LIMIT;
}

/* ── Paywall modal ───────────────────────────────────────────────────── */

function PaywallModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#1a2d45] to-[#132032] border border-[rgba(201,168,76,0.3)] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[slideUp_0.3s_ease-out]">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] flex items-center justify-center mb-5">
            <Lock size={28} className="text-[#C9A84C]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Limite atteinte</h2>
          <p className="text-[#7a8fa3] text-sm leading-relaxed mb-6">
            Tu as utilisé tes{" "}
            <span className="text-[#C9A84C] font-bold">3 analyses gratuites</span>{" "}
            aujourd'hui. Reviens demain ou passe au plan Pro pour des analyses illimitées.
          </p>
          <div className="flex items-center gap-2 mb-7">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-[#C9A84C]" />
            ))}
            <span className="text-xs text-[#5d7289] ml-1">3/3 utilisées</span>
          </div>
          <button
            onClick={onUpgrade}
            className="w-full py-3 px-6 bg-[#C9A84C] hover:bg-[#b8943d] text-[#0a1628] font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-[#C9A84C]/20 mb-3"
          >
            Passer Pro — 12€/mois
          </button>
          <button
            onClick={onClose}
            className="w-full border border-[rgba(255,255,255,0.1)] text-[#7a8fa3] font-semibold py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-all text-sm"
          >
            Revenir demain
          </button>
        </div>
      </div>
    </div>
  );
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

  const handleUpgrade = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress || "",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Erreur Stripe:", err);
    }
  };

  useEffect(() => {
    if (!pendingTicker) return;
    const isPro = checkIsPro(user?.id);
    if (isPro) {
      onApproved(pendingTicker);
    } else if (isSignedIn && user?.id && hasReachedLimit(user.id)) {
      onBlocked();
    } else {
      if (isSignedIn && user?.id) incrementUsage(user.id);
      onApproved(pendingTicker);
    }
  }, [pendingTicker]);

  return showPaywall ? (
    <PaywallModal onClose={onClosePaywall} onUpgrade={handleUpgrade} />
  ) : null;
}
