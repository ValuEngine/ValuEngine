"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Pin } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";
import { useUser, useAuth } from "@clerk/nextjs";
import { currencySymbol, authedFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Scenario {
  prix_cible: number;
  upside_pct: number;
  probabilite: number;
  titre: string;
  narratif: string;
  hypotheses: string[];
}

interface DCFScenariosData {
  bull: Scenario;
  base: Scenario;
  bear: Scenario;
  conclusion: string;
  prix_actuel: number;
  error?: string;
}

const SCENARIO_STYLES = {
  bear: { color: "#ef4444", bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.2)", label: "Pessimiste" },
  base: { color: "#C9A84C", bg: "rgba(201,168,76,0.05)", border: "rgba(201,168,76,0.3)", label: "Central" },
  bull: { color: "#10b981", bg: "rgba(16,185,129,0.05)", border: "rgba(16,185,129,0.2)", label: "Optimiste" },
};

function ScenarioCard({
  name,
  scenario,
  ticker,
  isCenter,
}: {
  name: "bull" | "base" | "bear";
  scenario: Scenario;
  ticker: string;
  isCenter?: boolean;
}) {
  const style = SCENARIO_STYLES[name];
  const cs = currencySymbol(ticker);

  return (
    <div
      className={`rounded-2xl p-6 transition-all ${isCenter ? "ring-1 ring-[rgba(201,168,76,0.3)] shadow-[0_0_20px_rgba(201,168,76,0.08)]" : ""}`}
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: style.color }}>
          {style.label}
        </span>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${style.color}20`, color: style.color }}
        >
          {scenario.probabilite}%
        </span>
      </div>

      {/* Prix cible */}
      <p className="text-3xl font-black text-white mb-1">
        {cs}{scenario.prix_cible.toFixed(2)}
      </p>
      <p
        className="text-sm font-bold mb-3"
        style={{ color: scenario.upside_pct >= 0 ? "#10b981" : "#ef4444" }}
      >
        {scenario.upside_pct >= 0 ? "+" : ""}{scenario.upside_pct.toFixed(1)}%
      </p>

      {/* Titre */}
      <p className="text-sm italic text-zinc-300 mb-4">{scenario.titre}</p>

      {/* Narratif */}
      <p className="text-sm text-zinc-400 leading-relaxed mb-5">{scenario.narratif}</p>

      {/* Probabilité bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${scenario.probabilite}%`, background: style.color }}
          />
        </div>
      </div>

      {/* Hypothèses */}
      {scenario.hypotheses.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Hypothèses clés
          </p>
          <ul className="space-y-1.5">
            {scenario.hypotheses.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <Pin size={10} className="mt-0.5 flex-shrink-0 text-[#C9A84C]" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DCFScenariosSection({ ticker, trialPro = false }: { ticker: string; trialPro?: boolean }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isPro } = useProStatus(user?.id);
  const canAccess = isPro || trialPro;
  const [data, setData] = useState<DCFScenariosData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const generate = async () => {
    if (!canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`${API_BASE}/api/analyze/dcf-scenarios`, getToken, {
        method: "POST",
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json: DCFScenariosData = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger for trial Pro users
  useEffect(() => {
    if (trialPro && !data && !loading && !autoTriggered) {
      setAutoTriggered(true);
      generate();
    }
  }, [trialPro, data, loading, autoTriggered]);

  const cs = currencySymbol(ticker);

  if (!data) {
    return (
      <div className="relative mb-8">
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-8">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-2">
            Scénarios DCF
          </p>
          <p className="text-zinc-400 text-sm mb-5">
            3 scénarios de valorisation (optimiste, central, pessimiste) avec narratifs IA et probabilités.
          </p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 size={24} className="animate-spin text-[#C9A84C] mb-3" />
              <p className="text-zinc-400 text-sm">Calcul des 3 scénarios DCF...</p>
              <p className="text-zinc-500 text-xs mt-1">Modélisation + narratif IA en cours</p>
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={!canAccess}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#09090b] font-bold px-6 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-40"
            >
              <Sparkles size={16} />
              Générer les scénarios DCF
            </button>
          )}
        </div>
        {!canAccess && (
          <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
            <Sparkles size={24} className="text-[#C9A84C] mb-3" />
            <p className="text-white font-bold text-lg mb-2">Scénarios DCF Pro</p>
            <p className="text-zinc-400 text-sm mb-4 text-center max-w-xs">
              Bull, Base, Bear — valorisation multi-scénarios avec narratif IA
            </p>
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#09090b] font-bold px-6 py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
            >
              Passer Pro
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">Scénarios DCF</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">vs cours actuel : {cs}{data.prix_actuel.toFixed(2)}</span>
          <button onClick={() => setData(null)} className="text-xs text-zinc-400 hover:text-white transition-colors">
            Régénérer
          </button>
        </div>
      </div>

      {/* 3 columns desktop, stack mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <ScenarioCard name="bear" scenario={data.bear} ticker={ticker} />
        <ScenarioCard name="base" scenario={data.base} ticker={ticker} isCenter />
        <ScenarioCard name="bull" scenario={data.bull} ticker={ticker} />
      </div>

      {/* Conclusion */}
      {data.conclusion && (
        <div className="bg-gradient-to-r from-[rgba(201,168,76,0.08)] to-[rgba(201,168,76,0.03)] border border-[rgba(201,168,76,0.2)] rounded-2xl p-6">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-3">Conclusion</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{data.conclusion}</p>
        </div>
      )}
    </div>
  );
}
