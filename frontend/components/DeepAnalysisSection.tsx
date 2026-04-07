"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";
import { useUser, useAuth } from "@clerk/nextjs";
import { authedFetch } from "@/lib/api";

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
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
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
    <div
      className="absolute inset-0 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10"
      style={{ background: "rgba(var(--bg-base-rgb, 9,9,11), 0.8)" }}
    >
      <Sparkles size={24} className="mb-3" style={{ color: "var(--accent-primary)" }} />
      <p className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>Analyse Pro requise</p>
      <p className="text-sm mb-4 text-center max-w-xs" style={{ color: "var(--text-secondary)" }}>
        Accède aux analyses approfondies avec données financières 5 ans
      </p>
      <button
        onClick={onUpgrade}
        className="btn-pro px-6 py-2.5 rounded-xl transition-all"
      >
        Passer Pro
      </button>
    </div>
  );
}

export default function DeepAnalysisSection({ ticker, trialPro = false }: { ticker: string; trialPro?: boolean }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isPro } = useProStatus(user?.id);
  const canAccess = isPro || trialPro;
  const [data, setData] = useState<DeepAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const generate = async () => {
    if (!canAccess) return;
    setLoading(true);
    setError(null);
    setStreamingText("");

    try {
      // Try SSE streaming first
      const res = await authedFetch(`${API_BASE}/api/analyze/deep-analysis/stream`, getToken, {
        method: "POST",
        body: JSON.stringify({ ticker }),
      });

      if (!res.ok || !res.body) {
        // Fallback to non-streaming
        const fallback = await authedFetch(`${API_BASE}/api/analyze/deep-analysis`, getToken, {
          method: "POST",
          body: JSON.stringify({ ticker }),
        });
        if (!fallback.ok) throw new Error(`Erreur ${fallback.status}`);
        const json: DeepAnalysis = await fallback.json();
        if (json.error) throw new Error(json.error);
        setData(json);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const evt = JSON.parse(payload);
            if (evt.token) {
              setStreamingText(prev => prev + evt.token);
            } else if (evt.done && evt.parsed) {
              setData(evt.parsed as DeepAnalysis);
            } else if (evt.error) {
              throw new Error(evt.error);
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  };

  // Auto-trigger for trial Pro users
  useEffect(() => {
    if (trialPro && !data && !loading && !autoTriggered) {
      setAutoTriggered(true);
      generate();
    }
  }, [trialPro, data, loading, autoTriggered]);

  // Not generated yet — show button
  if (!data) {
    return (
      <div className="relative mb-8">
        <div
          className="backdrop-blur-sm rounded-2xl p-8 border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--accent-primary)" }}>
            Analyse approfondie IA
          </p>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            Analyse Bull & Bear avec données financières réelles sur 5 ans, scores de confiance et catalyseurs.
          </p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={24} className="animate-spin mb-3" style={{ color: "var(--accent-primary)" }} />
              <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Analyse en cours avec Claude...</p>
              {streamingText ? (
                <div
                  className="w-full mt-4 rounded-xl p-4 max-h-48 overflow-y-auto border"
                  style={{ background: "rgba(39,39,42,0.5)", borderColor: "var(--border-default)" }}
                >
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: "var(--text-secondary)" }}>{streamingText.slice(-500)}</pre>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Données financières 5 ans en cours de traitement</p>
              )}
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={!canAccess}
              className="btn-pro flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all disabled:opacity-40"
            >
              <Sparkles size={16} />
              Générer l&apos;analyse approfondie
            </button>
          )}
        </div>
        {!canAccess && <ProGateOverlay onUpgrade={() => window.location.href = "/dashboard"} />}
      </div>
    );
  }

  // Data loaded — show full analysis
  const bullColor = "var(--color-success)";
  const bearColor = "var(--color-danger)";

  return (
    <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] font-medium" style={{ color: "var(--accent-primary)" }}>Analyse approfondie IA</p>
        <button
          onClick={() => setData(null)}
          className="text-xs transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          Régénérer
        </button>
      </div>

      {/* Bull & Bear columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Bull Case */}
        <div
          className="backdrop-blur-sm rounded-2xl p-6 border"
          style={{ background: "var(--bg-surface)", borderColor: "rgba(63,185,80,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} style={{ color: "var(--color-success)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--color-success)" }}>Bull Case</p>
          </div>
          <p className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>{data.bull_case.titre}</p>
          <ConfidenceBar score={data.bull_case.score_confiance} color={bullColor} />

          <div className="mt-5 space-y-4">
            {data.bull_case.arguments.map((arg, i) => (
              <div key={i}>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{arg.titre}</p>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>{arg.detail}</p>
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full border"
                  style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)", borderColor: "rgba(99,102,241,0.25)" }}
                >
                  {arg.chiffre_cle}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bear Case */}
        <div
          className="backdrop-blur-sm rounded-2xl p-6 border"
          style={{ background: "var(--bg-surface)", borderColor: "rgba(248,81,73,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} style={{ color: "var(--color-danger)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--color-danger)" }}>Bear Case</p>
          </div>
          <p className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>{data.bear_case.titre}</p>
          <ConfidenceBar score={data.bear_case.score_confiance} color={bearColor} />

          <div className="mt-5 space-y-4">
            {data.bear_case.arguments.map((arg, i) => (
              <div key={i}>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{arg.titre}</p>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>{arg.detail}</p>
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full border"
                  style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)", borderColor: "rgba(99,102,241,0.25)" }}
                >
                  {arg.chiffre_cle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synthèse */}
      <div
        className="rounded-2xl p-6 mb-6 border"
        style={{
          background: "linear-gradient(to right, rgba(99,102,241,0.08), rgba(99,102,241,0.03))",
          borderColor: "rgba(99,102,241,0.2)",
        }}
      >
        <p className="text-[13px] font-medium mb-3" style={{ color: "var(--accent-primary)" }}>Synthèse</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{data.synthese}</p>
      </div>

      {/* Catalyseurs & Risques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          className="backdrop-blur-sm rounded-2xl p-5 border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <p className="text-[13px] font-medium mb-4" style={{ color: "var(--color-success)" }}>Catalyseurs positifs</p>
          <ul className="space-y-2.5">
            {data.catalyseurs_positifs.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-success)" }}>+</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div
          className="backdrop-blur-sm rounded-2xl p-5 border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <p className="text-[13px] font-medium mb-4" style={{ color: "var(--color-danger)" }}>Risques majeurs</p>
          <ul className="space-y-2.5">
            {data.risques_majeurs.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-danger)" }}>!</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
