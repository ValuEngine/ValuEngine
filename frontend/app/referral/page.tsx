"use client";
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import AppLayout from "../../components/AppLayout";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function ReferralPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState(0);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? "";
  const referralLink = `https://valuengine.fr?ref=${userId.slice(0, 8)}`;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    authedFetch(`${API_BASE}/api/referral/${userId}`, getToken)
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data) => setReferrals(data.count ?? 0))
      .catch(() => setReferrals(0))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    "J'utilise ValuEngine pour analyser mes actions en 10s avec l'IA. Essaie gratuitement :"
  )}&url=${encodeURIComponent(referralLink)}`;

  const goal = 3;
  const progress = Math.min(referrals / goal, 1) * 100;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
            style={{ background: "rgba(var(--accent-gold-rgb, 201,168,76), 0.1)", borderColor: "var(--accent-gold)" }}
          >
            <Gift size={28} style={{ color: "var(--accent-gold)" }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
            Invite tes amis
          </h1>
          <p className="max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Invite 3 amis et reçois{" "}
            <span className="font-bold" style={{ color: "var(--accent-gold)" }}>1 mois Pro offert</span>.
            Tes amis profitent eux aussi de{" "}
            <span className="font-bold" style={{ color: "var(--accent-gold)" }}>3 analyses gratuites</span>{" "}
            en bonus. Chaque inscription via ton lien compte.
          </p>
        </div>

        {/* Referral link */}
        <div
          className="rounded-2xl p-6 mb-6 border animate-fade-in-up backdrop-blur-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <label className="text-sm block mb-2" style={{ color: "var(--text-secondary)" }}>
            Ton lien de parrainage
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-mono border"
              style={{
                background: "var(--bg-base)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 hover:scale-[1.02]"
              style={{ background: "var(--accent-gold)", color: "#0d1117" }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 animate-fade-in-up">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 border backdrop-blur-sm"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            <Share2 size={18} className="text-[#1d9bf0]" />
            Partager sur X
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 border backdrop-blur-sm"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            <Copy size={18} style={{ color: "var(--accent-gold)" }} />
            Copier le lien
          </button>
        </div>

        {/* Progress card */}
        <div
          className="rounded-2xl p-6 border animate-fade-in-up backdrop-blur-sm mb-6"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Tes parrainages
          </h3>

          {/* Count */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-black" style={{ color: "var(--accent-gold)" }}>
              {loading ? "..." : referrals}
            </span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              ami{referrals !== 1 ? "s" : ""} invité{referrals !== 1 ? "s" : ""} / {goal} pour 1 mois Pro offert
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: "var(--accent-gold)" }}
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {referrals >= goal
              ? "Bravo ! Tu as débloqué 1 mois Pro gratuit."
              : `Plus que ${goal - referrals} invitation${goal - referrals > 1 ? "s" : ""} pour débloquer ta récompense.`}
          </p>
        </div>

        {/* Explanation */}
        <div
          className="rounded-2xl p-6 border animate-fade-in-up backdrop-blur-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <h3 className="font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Comment ça marche ?
          </h3>
          <ol className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            <li className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
                style={{ background: "rgba(var(--accent-gold-rgb, 201,168,76), 0.1)", borderColor: "var(--accent-gold)", color: "var(--accent-gold)" }}
              >
                1
              </span>
              Partage ton lien unique avec tes amis
            </li>
            <li className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
                style={{ background: "rgba(var(--accent-gold-rgb, 201,168,76), 0.1)", borderColor: "var(--accent-gold)", color: "var(--accent-gold)" }}
              >
                2
              </span>
              Tes amis s&apos;inscrivent via ton lien
            </li>
            <li className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
                style={{ background: "rgba(var(--accent-gold-rgb, 201,168,76), 0.1)", borderColor: "var(--accent-gold)", color: "var(--accent-gold)" }}
              >
                3
              </span>
              À 3 inscriptions, tu reçois 1 mois d&apos;accès Pro gratuitement
            </li>
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
