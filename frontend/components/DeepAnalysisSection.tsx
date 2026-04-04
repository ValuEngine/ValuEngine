"use client";

import { useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";
import { useUser } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Argument {
  titre: string;
  detail: string;
  chiffre_cle: string;
}

interface CaseData {
  titre: string;
  score_confiance: number;
  arguments: Argument[];
}

interface DeepAnalysis {
  bull_case: CaseData;
  bear_case: CaseData;
  synthese: string;
  catalyseurs_positifs: string[];
  risques_majeurs: string[];
  error?: string;
}

function ConfidenceBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold" style={{ color }}>{score}%</span>
    </div>
  );
}

function ProGateOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
      <Sparkles size={24} className="text-[#C9A84C] mb-3" />
      <p className="text-white font-bold text-lg mb-2">Analyse Pro requise</p>
      <p className="text-zinc-400 text-sm mb-4 text-center max-w-xs">
        Accède aux analyses approfondies avec données financières 5 ans
      </p>
      <button
        onClick={onUpgrade}
        className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#09090b] font-bold px-6 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
      >
        Passer Pro
      </button>
    </div>
  );
}

export default function DeepAnalysisSection({ ticker }: { ticker: string }) {
  const { user } = useUser();
  const { isPro } = useProStatus(user?.id);
  const [data, setData] = useState<DeepAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!isPro) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze/deep-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: DeepAnalysis = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Not generated yet — show button
  if (!data) {
    return (
      <div className="relative mb-8">
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-8">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">
            Analyse approfondie IA
          </p>
          <p className="text-zinc-400 text-sm mb-5">
            Analyse Bull & Bear avec données financières réelles sur 5 ans, scores de confiance et catalyseurs.
          </p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 size={24} className="animate-spin text-[#C9A84C] mb-3" />
              <p className="text-zinc-400 text-sm">Analyse en cours avec Claude Sonnet...</p>
              <p className="text-zinc-500 text-xs mt-1">Données financières 5 ans en cours de traitement</p>
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={!isPro}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#09090b] font-bold px-6 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-40"
            >
              <Sparkles size={16} />
              Générer l&apos;analyse approfondie
            </button>
          )}
        </div>
        {!isPro && <ProGateOverlay onUpgrade={() => window.location.href = "/dashboard"} />}
      </div>
    );
  }

  // Data loaded — show full analysis
  const bullColor = "#10b981";
  const bearColor = "#ef4444";

  return (
    <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">Analyse approfondie IA</p>
        <button onClick={() => setData(null)} className="text-xs text-zinc-400 hover:text-white transition-colors">
          Régénérer
        </button>
      </div>

      {/* Bull & Bear columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Bull Case */}
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-emerald-400" />
            <p className="text-xs font-bold uppercase tracking-[2px] text-emerald-400">Bull Case</p>
          </div>
          <p className="text-white font-bold text-lg mb-4">{data.bull_case.titre}</p>
          <ConfidenceBar score={data.bull_case.score_confiance} color={bullColor} />

          <div className="mt-5 space-y-4">
            {data.bull_case.arguments.map((arg, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white mb-1">{arg.titre}</p>
                <p className="text-sm text-zinc-400 leading-relaxed mb-2">{arg.detail}</p>
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-[rgba(201,168,76,0.1)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]">
                  {arg.chiffre_cle}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bear Case */}
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-400" />
            <p className="text-xs font-bold uppercase tracking-[2px] text-red-400">Bear Case</p>
          </div>
          <p className="text-white font-bold text-lg mb-4">{data.bear_case.titre}</p>
          <ConfidenceBar score={data.bear_case.score_confiance} color={bearColor} />

          <div className="mt-5 space-y-4">
            {data.bear_case.arguments.map((arg, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-white mb-1">{arg.titre}</p>
                <p className="text-sm text-zinc-400 leading-relaxed mb-2">{arg.detail}</p>
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-[rgba(201,168,76,0.1)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]">
                  {arg.chiffre_cle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synthèse */}
      <div className="bg-gradient-to-r from-[rgba(201,168,76,0.08)] to-[rgba(201,168,76,0.03)] border border-[rgba(201,168,76,0.2)] rounded-2xl p-6 mb-6">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-3">Synthèse</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{data.synthese}</p>
      </div>

      {/* Catalyseurs & Risques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-[2px] text-emerald-400 mb-4">Catalyseurs positifs</p>
          <ul className="space-y-2.5">
            {data.catalyseurs_positifs.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-[2px] text-red-400 mb-4">Risques majeurs</p>
          <ul className="space-y-2.5">
            {data.risques_majeurs.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
