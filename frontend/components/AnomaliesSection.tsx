"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";
import { useUser, useAuth } from "@clerk/nextjs";
import { authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Anomaly {
  type: string;
  signal: "POSITIF" | "ATTENTION" | "RISQUE" | "OPPORTUNITE";
  titre: string;
  detail: string;
  impact: "haussier" | "baissier";
}

interface AnomaliesData {
  anomalies: Anomaly[];
  sector: string;
  peer_count: number;
}

const SIGNAL_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  POSITIF:    { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  ATTENTION:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  text: "text-yellow-400" },
  RISQUE:     { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400" },
  OPPORTUNITE:{ bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400" },
};

export default function AnomaliesSection({ ticker, trialPro = false }: { ticker: string; trialPro?: boolean }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isPro } = useProStatus(user?.id);
  const canAccess = isPro || trialPro;
  const [data, setData] = useState<AnomaliesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load when ticker changes
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await authedFetch(`${API_BASE}/api/analyze/anomalies`, getToken, {
          method: "POST",
          body: JSON.stringify({ ticker }),
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const json: AnomaliesData = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ticker]);

  if (loading) {
    return (
      <div className="mb-8">
        <p className="text-[13px] font-medium mb-4" style={{ color: "var(--accent-primary)" }}>Signaux & Anomalies</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: "var(--bg-surface)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <p className="text-[13px] font-medium mb-4" style={{ color: "var(--accent-primary)" }}>Signaux & Anomalies</p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const anomalies = data.anomalies;

  return (
    <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-medium" style={{ color: "var(--accent-primary)" }}>
          Signaux détectés : {anomalies.length}
        </p>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          vs {data.peer_count} pairs · {data.sector}
        </span>
      </div>

      {anomalies.length === 0 ? (
        <div
          className="backdrop-blur-sm rounded-2xl p-6 text-center border"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Aucune anomalie détectée — profil financier dans les normes sectorielles
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!canAccess ? "blur-sm" : ""}`}>
            {anomalies.map((a, i) => {
              const style = SIGNAL_STYLES[a.signal] || SIGNAL_STYLES.ATTENTION;
              return (
                <div
                  key={i}
                  className={`${style.bg} border ${style.border} rounded-2xl p-5 transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                      {a.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                        {a.signal}
                      </span>
                      <span className={`text-sm font-bold ${a.impact === "haussier" ? "text-emerald-400" : "text-red-400"}`}>
                        {a.impact === "haussier" ? "↑" : "↓"}
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-sm mb-1.5" style={{ color: "var(--text-primary)" }}>{a.titre}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{a.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Pro gate overlay */}
          {!canAccess && (
            <div
              className="absolute inset-0 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10"
              style={{ background: "rgba(var(--bg-base-rgb, 9,9,11), 0.6)" }}
            >
              <Sparkles size={20} className="mb-2" style={{ color: "var(--accent-primary)" }} />
              <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>Signaux Pro</p>
              <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Détection d&apos;anomalies vs benchmarks sectoriels</p>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="btn-pro px-5 py-2 rounded-xl text-sm transition-all"
              >
                Passer Pro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
