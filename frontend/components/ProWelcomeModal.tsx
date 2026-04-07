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
      <div
        className="rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #1a2d45, #0f1a2b)",
          border: "1px solid rgba(108,92,231,0.35)",
          boxShadow: "0 25px 50px -12px rgba(108,92,231,0.15)",
        }}
      >

        {step === 0 && (
          <div className="p-8 text-center">
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            {/* Animated icon */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(108,92,231,0.15)", animationDuration: "2s" }} />
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: "linear-gradient(to bottom right, var(--accent-primary), #8b7cf8)",
                  boxShadow: "0 10px 25px rgba(108,92,231,0.4)",
                }}
              >
                <Sparkles size={36} className="text-[#0a1628]" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Bienvenue dans Pro
            </h1>
            <p className="font-bold text-lg mb-4" style={{ color: "var(--accent-primary)" }}>
              Tu fais partie des investisseurs qui prennent les meilleures decisions.
            </p>
            <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto">
              Ton compte est maintenant illimite. Decouvre tout ce que tu as debloque.
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="rounded-xl p-3" style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)" }}>
                <p className="text-2xl font-black" style={{ color: "var(--accent-primary)" }}>&infin;</p>
                <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-wider mt-1">Analyses</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)" }}>
                <p className="text-2xl font-black" style={{ color: "var(--accent-primary)" }}>8</p>
                <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-wider mt-1">Outils Pro</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)" }}>
                <p className="text-2xl font-black" style={{ color: "var(--accent-primary)" }}>0</p>
                <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-wider mt-1">Limites</p>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3.5 text-[#0a1628] font-bold rounded-xl text-base transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(to right, var(--accent-primary), #8b7cf8)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(108,92,231,0.4)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
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
                  className="flex items-start gap-3 p-3 rounded-xl border transition-colors"
                  style={f.highlight ? {
                    background: "rgba(108,92,231,0.1)",
                    borderColor: "rgba(108,92,231,0.3)",
                  } : {
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={!f.highlight ? (e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(108,92,231,0.2)"; } : undefined}
                  onMouseLeave={!f.highlight ? (e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)"; } : undefined}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={f.highlight ? {
                      background: "linear-gradient(to bottom right, var(--accent-primary), #8b7cf8)",
                    } : {
                      background: "rgba(108,92,231,0.1)",
                      border: "1px solid rgba(108,92,231,0.2)",
                    }}
                  >
                    <f.icon size={16} style={{ color: f.highlight ? "#0a1628" : "var(--accent-primary)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">{f.title}</p>
                    <p className="text-xs text-zinc-500 leading-snug mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleExplore}
              className="w-full py-3.5 text-[#0a1628] font-bold rounded-xl text-base transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(to right, var(--accent-primary), #8b7cf8)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(108,92,231,0.4)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
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
