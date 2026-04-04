"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";
import { useUser } from "@clerk/nextjs";

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

export default function AnomaliesSection({ ticker }: { ticker: string }) {
  const { user } = useUser();
  const { isPro } = useProStatus(user?.id);
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
        const res = await fetch(`${API_BASE}/api/analyze/anomalies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Signaux & Anomalies</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-[#18181b]/80 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Signaux & Anomalies</p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const anomalies = data.anomalies;

  return (
    <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">
          Signaux détectés : {anomalies.length}
        </p>
        <span className="text-xs text-zinc-500">
          vs {data.peer_count} pairs · {data.sector}
        </span>
      </div>

      {anomalies.length === 0 ? (
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 text-center">
          <p className="text-zinc-400 text-sm">
            Aucune anomalie détectée — profil financier dans les normes sectorielles
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isPro ? "blur-sm" : ""}`}>
            {anomalies.map((a, i) => {
              const style = SIGNAL_STYLES[a.signal] || SIGNAL_STYLES.ATTENTION;
              return (
                <div
                  key={i}
                  className={`${style.bg} border ${style.border} rounded-2xl p-5 transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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
                  <p className="text-white font-semibold text-sm mb-1.5">{a.titre}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{a.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Pro gate overlay */}
          {!isPro && (
            <div className="absolute inset-0 bg-[#09090b]/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
              <Sparkles size={20} className="text-[#C9A84C] mb-2" />
              <p className="text-white font-bold mb-1">Signaux Pro</p>
              <p className="text-zinc-400 text-xs mb-3">Détection d&apos;anomalies vs benchmarks sectoriels</p>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#09090b] font-bold px-5 py-2 rounded-xl text-sm hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
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
