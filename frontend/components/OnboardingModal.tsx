"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { analyzeStock, type AnalyzeResponse } from "@/lib/api";
import { gtmEvents, track } from "@/lib/analytics";

const POPULAR = ["AAPL", "MSFT", "MC.PA", "NVDA", "TSLA", "TTE.PA"];

const LOADING_MSGS = [
  "Récupération des données financières 5 ans...",
  "Calcul du DCF et de la valeur intrinsèque...",
  "Génération de l'analyse Bull/Bear IA...",
  "Détection des anomalies sectorielles...",
];

interface Props {
  show: boolean;
  onComplete: (ticker: string) => void;
  onSkip: () => void;
}

export default function OnboardingModal({ show, onComplete, onSkip }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [ticker, setTicker] = useState("");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(0);

  // Rotate loading messages
  useEffect(() => {
    if (step !== 3) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MSGS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  // Track onboarding started
  useEffect(() => {
    if (show && step === 1) {
      track("onboarding_started");
      startTimeRef.current = Date.now();
    }
  }, [show, step]);

  const handleSelectTicker = (t: string) => {
    setTicker(t);
  };

  const handleAnalyze = async () => {
    if (!ticker) return;
    const t = ticker.trim().toUpperCase();
    setStep(3);
    setLoadingMsgIdx(0);
    setError(null);
    track("onboarding_ticker_selected", { ticker: t });
    try {
      const res = await analyzeStock({
        ticker: t,
        growth_rate: 0.08,
        wacc: 0.09,
        terminal_growth: 0.03,
        horizon: 5,
      });
      setResult(res);
      gtmEvents.firstAnalysisStarted(t);
      gtmEvents.firstAnalysisCompleted(t, res.verdict);
      setStep(4);
    } catch {
      setError("Ticker introuvable. Réessaie avec un autre symbole.");
      setStep(2);
    }
  };

  const handleComplete = () => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    track("onboarding_completed", { ticker, time_seconds: elapsed });
    onComplete(ticker);
  };

  const handleSkip = () => {
    track("onboarding_skipped", { step });
    onSkip();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-md px-4" style={{ background: "rgba(var(--bg-base-rgb, 9,9,11),0.9)" }}>
      <div className="border rounded-2xl p-8 max-w-lg w-full mx-4 relative shadow-2xl" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 transition-colors text-xs flex items-center gap-1"
        >
          Passer <X size={14} />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "w-8" : "bg-zinc-700 w-4"
              }`}
              style={s <= step ? { background: "var(--accent-primary)" } : undefined}
            />
          ))}
        </div>

        {/* STEP 1 — Welcome */}
        {step === 1 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.25)" }}>
              <span className="text-3xl font-black" style={{ color: "var(--accent-primary)" }}>V</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Bienvenue sur ValuEngine
            </h2>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--accent-primary)" }}>
              L&apos;analyse boursière institutionnelle en 60 secondes.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed mb-8">
              Tu rejoins les investisseurs particuliers qui analysent leurs actions
              comme des professionnels. Voici comment tirer le meilleur de l&apos;outil.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
              style={{ background: "var(--accent-primary)" }}
            >
              Commencer <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2 — Ticker selection */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Commence par analyser une action
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Tape un ticker ou choisis parmi les plus populaires
            </p>

            <input
              autoFocus
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && ticker && handleAnalyze()}
              placeholder="Ex: AAPL, MC.PA, TSLA..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 text-white placeholder-zinc-600 text-base font-semibold focus:outline-none transition-all mb-4"
              style={{ ["--tw-ring-color" as string]: "rgba(108,92,231,0.5)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(108,92,231,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
            />

            <div className="flex flex-wrap gap-2 mb-6">
              {POPULAR.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSelectTicker(t)}
                  className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
                    ticker === t
                      ? ""
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  }`}
                  style={ticker === t ? {
                    background: "rgba(108,92,231,0.12)",
                    borderColor: "var(--accent-primary)",
                    color: "var(--accent-primary)",
                  } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-4">{error}</p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!ticker}
              className="w-full text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent-primary)" }}
            >
              Analyser {ticker || "ce titre"} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3 — Loading */}
        {step === 3 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-6" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
            <h2 className="text-xl font-bold text-white mb-2">
              Analyse en cours...
            </h2>
            <p className="text-sm text-zinc-400 h-5 transition-opacity duration-300">
              {LOADING_MSGS[loadingMsgIdx]}
            </p>
          </div>
        )}

        {/* STEP 4 — Result */}
        {step === 4 && result && (
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(var(--color-success-rgb,63,185,80),0.1)", border: "1px solid rgba(var(--color-success-rgb,63,185,80),0.25)" }}>
                <span className="text-lg" style={{ color: "var(--color-success)" }}>&#10003;</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-1">
              Ton analyse est prête !
            </h2>
            <p className="text-sm text-zinc-400 text-center mb-6">
              Voici ce que tu peux faire avec
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center">
                <span className="text-lg mb-2 block">&#128202;</span>
                <p className="text-xs font-bold text-white mb-1">Verdict &amp; DCF</p>
                <p className="text-[13px] font-medium text-zinc-500 leading-relaxed">La valeur intrinsèque et l&apos;upside potentiel</p>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center">
                <span className="text-lg mb-2 block">&#129302;</span>
                <p className="text-xs font-bold text-white mb-1">Analyse IA</p>
                <p className="text-[13px] font-medium text-zinc-500 leading-relaxed">Bull case, Bear case, SWOT avec vrais chiffres</p>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-center">
                <span className="text-lg mb-2 block">&#127919;</span>
                <p className="text-xs font-bold text-white mb-1">Scénarios</p>
                <p className="text-[13px] font-medium text-zinc-500 leading-relaxed">3 projections pessimiste/base/optimiste</p>
              </div>
            </div>

            <div className="rounded-xl px-4 py-3 mb-6" style={{ background: "rgba(108,92,231,0.05)", border: "1px solid rgba(108,92,231,0.15)" }}>
              <p className="text-xs text-zinc-400">
                Les analyses approfondies (Deep Analysis, PDF export, Screener) sont disponibles en{" "}
                <span className="font-semibold" style={{ color: "var(--accent-gold, var(--accent-primary))" }}>Pro &#10022;</span>
              </p>
            </div>

            <button
              onClick={handleComplete}
              className="w-full text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mb-3"
              style={{ background: "var(--accent-primary)" }}
            >
              Voir mon analyse <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                handleComplete();
                setTimeout(() => router.push("/#pricing"), 100);
              }}
              className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
            >
              Voir les fonctionnalités Pro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
