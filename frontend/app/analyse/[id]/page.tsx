"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";

/* ── Client share buttons ─────────────────────────────────────────────── */

function ShareButtons({
  ticker,
  verdict,
  upside,
  id,
}: {
  ticker: string;
  verdict: string;
  upside: number;
  id: string;
}) {
  const [copied, setCopied] = useState(false);

  const verdictLabels: Record<string, string> = {
    BUY: "Sous-évalué",
    SELL: "Surévalué",
    HOLD: "Juste valeur",
  };
  const verdictLabel = verdictLabels[verdict] ?? verdict;

  const tweetText = `J'ai analysé $${ticker} avec @ValuEngine — verdict : ${verdictLabel} avec un upside de ${upside.toFixed(1)}% selon le DCF.\nvaluengine.fr/analyse/${id}`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://valuengine.fr/analyse/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#18181b]/80 border border-[#27272a] hover:border-[#1d9bf0]/60 text-white transition-all hover:-translate-y-0.5"
      >
        <ExternalLink size={14} className="text-[#1d9bf0]" />
        Partager sur X
      </a>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#C9A84C] hover:bg-[#b8943d] text-[#0d1117] transition-all hover:scale-[1.02]"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Lien copié !" : "Copier le lien"}
      </button>
    </div>
  );
}

/* ── Types ─────────────────────────────────────────────────────────────── */

interface AnalysisData {
  id: string;
  ticker: string;
  company_name: string;
  verdict: string;
  price: number;
  intrinsic_value: number;
  upside_pct: number;
  created_at: string;
}

/* ── Verdict badge helper ──────────────────────────────────────────────── */

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    BUY: {
      label: "Sous-évalué",
      color: "#10b981",
      bg: "rgba(16,185,129,0.10)",
      border: "rgba(16,185,129,0.25)",
    },
    SELL: {
      label: "Surévalué",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.25)",
    },
    HOLD: {
      label: "Juste valeur",
      color: "#C9A84C",
      bg: "rgba(201,168,76,0.10)",
      border: "rgba(201,168,76,0.25)",
    },
  };
  const c = config[verdict] ?? config.HOLD;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

/* ── Main page component (client because we need ShareButtons + fetch) ── */

export default function AnalyseSharePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_BASE}/api/analyse/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data: AnalysisData) => setAnalysis(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Analyse introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-pulse text-[#C9A84C] text-sm font-semibold">Chargement de l&apos;analyse...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-center px-4">
        <div>
          <p className="text-red-400 font-bold mb-2">Analyse introuvable</p>
          <p className="text-zinc-500 text-sm mb-6">{error ?? "Cette analyse n'existe pas ou a été supprimée."}</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-[#0d1117] font-bold px-6 py-3 rounded-xl transition-all"
          >
            Faire ta propre analyse
          </Link>
        </div>
      </div>
    );
  }

  const d = analysis;
  const upsideColor = d.upside_pct > 0 ? "#10b981" : d.upside_pct < 0 ? "#ef4444" : "#C9A84C";
  const formattedDate = new Date(d.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-tight">
            <span className="text-[#C9A84C]">Valu</span>Engine
          </Link>
          <Link
            href="/analyze"
            className="text-xs text-zinc-400 hover:text-[#C9A84C] transition-colors font-semibold"
          >
            Analyser un ticker
          </Link>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Card */}
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 sm:p-8 mb-8">
          {/* Top row */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
                {d.company_name}
              </h1>
              <span className="text-[#6b7d91] font-mono text-lg">{d.ticker}</span>
            </div>
            <VerdictBadge verdict={d.verdict} />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-1">Cours actuel</p>
              <p className="text-xl font-bold">${d.price.toFixed(2)}</p>
            </div>
            <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-1">Valeur intrinsèque</p>
              <p className="text-xl font-bold">${d.intrinsic_value.toFixed(2)}</p>
            </div>
            <div className="bg-[#09090b]/60 border border-[#27272a] rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-zinc-500 mb-1">Upside DCF</p>
              <p className="text-xl font-bold" style={{ color: upsideColor }}>
                {d.upside_pct > 0 ? "+" : ""}{d.upside_pct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Date */}
          <p className="text-xs text-zinc-500 mb-6">Analyse effectuée le {formattedDate}</p>

          {/* Share buttons */}
          <ShareButtons
            ticker={d.ticker}
            verdict={d.verdict}
            upside={d.upside_pct}
            id={id}
          />
        </div>

        {/* CTA */}
        <div className="text-center mb-10">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0d1117] font-bold px-6 sm:px-8 py-3.5 rounded-xl text-base hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:scale-[1.02] transition-all w-full sm:w-auto min-h-[44px]"
          >
            Faire ta propre analyse
            <span className="text-lg">&rarr;</span>
          </Link>
        </div>

        {/* AMF Disclaimer */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4 text-xs text-yellow-400/80 leading-relaxed">
          <p className="font-bold mb-1">Avertissement AMF</p>
          <p>
            Les informations présentées sur cette page sont fournies à titre éducatif
            uniquement et ne constituent en aucun cas un conseil en investissement,
            une recommandation d&apos;achat ou de vente, ni une sollicitation à investir.
            Les analyses DCF sont des estimations mathématiques basées sur des hypothèses
            qui peuvent s&apos;avérer inexactes. Toute décision d&apos;investissement doit être
            prise après consultation d&apos;un conseiller financier agréé par l&apos;AMF.
            Les performances passées ne préjugent pas des performances futures.
          </p>
        </div>
      </main>
    </div>
  );
}
