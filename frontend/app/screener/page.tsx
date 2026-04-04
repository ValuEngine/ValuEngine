"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { Loader2, Search, Sparkles } from "lucide-react";
import { useProStatus } from "@/hooks/useProStatus";
import { authedFetch } from "@/lib/api";
import { gtmEvents } from "@/lib/analytics";
import AppLayout from "@/components/AppLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ScreenerResult {
  ticker: string;
  nom: string;
  score_match: number;
  raison: string;
  points_forts: string[];
  point_vigilance: string;
  secteur: string;
  capitalisation: string;
}

interface ScreenerResponse {
  resultats: ScreenerResult[];
  interpretation_requete: string;
  nb_actions_analysees: number;
  error?: string;
}

export default function ScreenerPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { isPro } = useProStatus(user?.id);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/screener/suggestions`)
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions || []))
      .catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 10) {
      setError("Decrivez votre recherche en au moins 10 caracteres.");
      return;
    }

    if (!isPro) {
      gtmEvents.proGateSeen('screener');
      setError("Fonctionnalite reservee aux membres Pro. Passez Pro pour acceder au Screener IA.");
      return;
    }

    gtmEvents.screenerUsed(query.trim().length);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const resp = await authedFetch(`${API_BASE}/api/screener/search`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur lors de la recherche");
      }

      const data: ScreenerResponse = await resp.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-5xl mx-auto">

        {/* ── HEADER ───────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Screener IA
            </h1>
            <Sparkles size={20} className="text-[#C9A84C]" />
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#C9A84C] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] px-2.5 py-0.5 rounded-full">
              Pro
            </span>
          </div>
          <p className="text-[#6b7d91] text-sm">
            Decrivez en langage naturel l&apos;investissement que vous cherchez
          </p>
        </div>

        {/* ── SEARCH ZONE ──────────────────────────────────────────── */}
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 mb-6">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Ex: Je cherche des societes tech americaines sous-evaluees avec une forte croissance du FCF et peu d'endettement..."
            rows={3}
            className="w-full bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors resize-none"
          />

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s)}
                  className="text-xs text-zinc-400 bg-[#27272a]/60 hover:bg-[#C9A84C]/10 hover:text-[#C9A84C] border border-[#27272a] hover:border-[#C9A84C]/30 rounded-lg px-3 py-1.5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-3">{error}</p>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-8 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Analyse en cours...</>
            ) : (
              <><Search size={16} /> Rechercher</>
            )}
          </button>
        </div>

        {/* ── PRO GATE ─────────────────────────────────────────────── */}
        {!isPro && (
          <div className="relative">
            {/* Blurred fake results */}
            <div className="blur-sm pointer-events-none opacity-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#18181b]/80 border border-[#27272a] rounded-2xl p-6 mb-4">
                  <div className="h-5 bg-zinc-800 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-zinc-800 rounded w-full mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-2/3" />
                </div>
              ))}
            </div>
            {/* CTA overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#18181b]/95 backdrop-blur-md border border-[#C9A84C]/30 rounded-2xl p-8 text-center max-w-md shadow-[0_0_40px_rgba(201,168,76,0.15)]">
                <Sparkles size={32} className="text-[#C9A84C] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  Fonctionnalite reservee aux membres Pro
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Le Screener IA analyse des centaines d&apos;actions pour trouver celles qui correspondent a vos criteres.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
                >
                  Passer Pro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ──────────────────────────────────────────────── */}
        {results && results.resultats && results.resultats.length > 0 && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">
                <span className="text-white font-bold">{results.resultats.length}</span> actions selectionnees parmi{" "}
                <span className="text-white">{results.nb_actions_analysees}</span> analysees
              </p>
            </div>

            {/* Interpretation */}
            {results.interpretation_requete && (
              <p className="text-sm text-zinc-500 italic mb-6 border-l-2 border-[#C9A84C]/40 pl-3">
                {results.interpretation_requete}
              </p>
            )}

            {/* Result cards */}
            <div className="space-y-4">
              {results.resultats.map((r, idx) => (
                <div
                  key={r.ticker || idx}
                  className="bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-2xl p-6 hover:shadow-[0_0_20px_rgba(201,168,76,0.15)] hover:border-[#C9A84C]/20 transition-all"
                >
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white text-lg">{r.ticker}</span>
                      <span className="text-gray-400 ml-2 text-sm">{r.nom}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[#C9A84C] font-bold text-lg">{r.score_match}<span className="text-sm text-zinc-500">/100</span></div>
                      <div className="w-20 bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-[#C9A84C] h-1.5 rounded-full transition-all"
                          style={{ width: `${r.score_match}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Raison */}
                  <p className="text-gray-300 mt-3 text-sm leading-relaxed">{r.raison}</p>

                  {/* Points forts */}
                  {r.points_forts && r.points_forts.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {r.points_forts.map((p, i) => (
                        <span key={i} className="text-green-400 text-xs flex items-center gap-1">
                          <span className="text-green-400">&#10003;</span> {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Vigilance */}
                  {r.point_vigilance && (
                    <div className="text-yellow-400 text-xs mt-2">
                      &#9888;&#65039; {r.point_vigilance}
                    </div>
                  )}

                  {/* Bottom row */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#27272a]">
                    <span className="text-gray-500 text-xs">
                      {r.secteur} &middot; {r.capitalisation}
                    </span>
                    <button
                      onClick={() => router.push(`/analyze?ticker=${r.ticker}`)}
                      className="text-[#C9A84C] text-sm hover:underline font-medium"
                    >
                      Analyser &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state after search with no results */}
        {results && results.resultats && results.resultats.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={40} className="text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Aucun resultat</h3>
            <p className="text-zinc-500 text-sm">
              Essayez de reformuler votre recherche avec des criteres differents.
            </p>
          </div>
        )}

        {/* Initial empty state */}
        {!results && !loading && isPro && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mb-6">
              <Search size={28} className="text-[#C9A84C]" />
            </div>
            <h2 className="text-xl font-bold mb-2">Pret a chercher</h2>
            <p className="text-[#4a6070] text-sm max-w-md">
              Decrivez le type d&apos;investissement que vous recherchez et l&apos;IA analysera des centaines d&apos;actions pour vous.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
