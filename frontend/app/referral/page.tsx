"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import AppLayout from "../../components/AppLayout";
import { Gift, Copy, Check, Share2 } from "lucide-react";

export default function ReferralPage() {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://frontend-nine-gamma-21.vercel.app?ref=${user?.id?.slice(0, 8) ?? ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent("J'utilise ValuEngine pour analyser mes actions en 10s avec l'IA. Essaie gratuitement :")}&url=${encodeURIComponent(referralLink)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;

  const referrals = typeof window !== "undefined"
    ? parseInt(localStorage.getItem(`ve_referrals_${user?.id}`) || "0")
    : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-4">
            <Gift size={28} className="text-[#C9A84C]" />
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>Invitez vos amis</h1>
          <p className="max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Pour chaque ami qui s&apos;inscrit avec votre lien, vous gagnez{" "}
            <span className="text-[#C9A84C] font-bold">7 jours d&apos;analyses illimitées</span>.
          </p>
        </div>

        <div className="rounded-2xl p-6 mb-6 border animate-fade-in-up" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <label className="text-sm block mb-2" style={{ color: "var(--text-secondary)" }}>Votre lien de parrainage</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono"
              style={{ color: "var(--text-primary)" }}
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-[#C9A84C] hover:bg-[#b8943d] text-[#0d1117] font-bold rounded-lg transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 border hover:border-[#1d9bf0]/60"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <Share2 size={18} className="text-[#1d9bf0]" />
            Partager sur X
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 border hover:border-[#0077b5]/60"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <span className="text-[#0077b5] font-bold text-sm">in</span>
            Partager sur LinkedIn
          </a>
        </div>

        <div className="rounded-2xl p-6 border animate-fade-in-up" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h3 className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>Vos parrainages</h3>
          <div className="text-4xl font-black text-[#C9A84C]">{referrals}</div>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            ami{referrals !== 1 ? "s" : ""} inscrit{referrals !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
