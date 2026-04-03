"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Infinity,
  LineChart,
  Brain,
  BarChart3,
  Bell,
  Briefcase,
  Filter,
  Share2,
  ChevronRight,
  X,
} from "lucide-react";

const WELCOME_SEEN_KEY = "ve_pro_welcome_seen";

const PRO_FEATURES = [
  {
    icon: Infinity,
    title: "Analyses illimitees",
    desc: "Plus de limite de 3/jour. Analyse autant d'actions que tu veux.",
    highlight: true,
  },
  {
    icon: LineChart,
    title: "DCF interactif complet",
    desc: "Modifie chaque parametre et vois l'impact en temps reel.",
  },
  {
    icon: Brain,
    title: "IA Bull & Bear",
    desc: "Analyse argumentee par Claude AI avec scenarios haussier et baissier.",
  },
  {
    icon: BarChart3,
    title: "SWOT & PESTLE",
    desc: "Analyse strategique complete generee par IA pour chaque entreprise.",
  },
  {
    icon: Filter,
    title: "Screener 20+ actions",
    desc: "Scan automatique des meilleures opportunites FR + US.",
  },
  {
    icon: Bell,
    title: "Alertes de prix",
    desc: "Notification par email quand un titre atteint ton prix cible.",
  },
  {
    icon: Briefcase,
    title: "Portfolio tracker",
    desc: "Suis tes positions et ton P&L en temps reel.",
  },
  {
    icon: Share2,
    title: "Partage & export",
    desc: "Partage tes analyses avec un lien unique.",
  },
];

interface ProWelcomeModalProps {
  show: boolean;
  onClose: () => void;
}

function ModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = celebration, 1 = features

  const handleExplore = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
    onClose();
    router.push("/analyze");
  };

  const handleClose = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-gradient-to-b from-[#1a2d45] to-[#0f1a2b] border border-[rgba(201,168,76,0.35)] rounded-2xl max-w-lg w-full shadow-2xl shadow-[rgba(201,168,76,0.15)] overflow-hidden">

        {step === 0 && (
          <div className="p-8 text-center">
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            {/* Animated icon */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-[rgba(201,168,76,0.15)] animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center shadow-lg shadow-[rgba(201,168,76,0.4)]">
                <Sparkles size={36} className="text-[#0a1628]" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Bienvenue dans Pro
            </h1>
            <p className="text-[#C9A84C] font-bold text-lg mb-4">
              Tu fais partie des investisseurs qui prennent les meilleures decisions.
            </p>
            <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto">
              Ton compte est maintenant illimite. Decouvre tout ce que tu as debloque.
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] rounded-xl p-3">
                <p className="text-2xl font-black text-[#C9A84C]">&infin;</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Analyses</p>
              </div>
              <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] rounded-xl p-3">
                <p className="text-2xl font-black text-[#C9A84C]">8</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Outils Pro</p>
              </div>
              <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] rounded-xl p-3">
                <p className="text-2xl font-black text-[#C9A84C]">0</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Limites</p>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3.5 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold rounded-xl text-base hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] transition-all flex items-center justify-center gap-2"
            >
              Voir ce que tu as debloque <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white">Tes avantages Pro</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Tout ce qui est maintenant debloque</p>
              </div>
              <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 max-h-[50vh] overflow-y-auto pr-1">
              {PRO_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    f.highlight
                      ? "bg-[rgba(201,168,76,0.1)] border-[rgba(201,168,76,0.3)]"
                      : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(201,168,76,0.2)]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    f.highlight
                      ? "bg-gradient-to-br from-[#C9A84C] to-[#e8c55a]"
                      : "bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)]"
                  }`}>
                    <f.icon size={16} className={f.highlight ? "text-[#0a1628]" : "text-[#C9A84C]"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">{f.title}</p>
                    <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleExplore}
              className="w-full py-3.5 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold rounded-xl text-base hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] transition-all flex items-center justify-center gap-2"
            >
              Lancer ma premiere analyse Pro <ChevronRight size={18} />
            </button>
            <button
              onClick={handleClose}
              className="w-full text-zinc-500 text-sm py-2 mt-2 hover:text-zinc-300 transition-colors"
            >
              Explorer le dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProWelcomeModal({ show, onClose }: ProWelcomeModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !show) return null;
  return createPortal(<ModalContent onClose={onClose} />, document.body);
}

/** Check if the Pro welcome modal should be shown. */
export function shouldShowProWelcome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    if (seen) return false;
    // Check if pro was just activated
    const activated = localStorage.getItem("ve_pro_activated");
    if (activated) {
      const ts = parseInt(activated);
      return Date.now() - ts < 60 * 60 * 1000; // within last hour
    }
  } catch {}
  return false;
}
