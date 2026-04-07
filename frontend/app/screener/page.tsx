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
            <Sparkles size={20} style={{ color: "var(--accent-primary)" }} />
            <span
              className="text-[13px] font-medium px-2.5 py-0.5 rounded-full"
              style={{
                color: "var(--accent-gold)",
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.25)",
              }}
            >
              Pro
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Decrivez en langage naturel l&apos;investissement que vous cherchez
          </p>
        </div>

        {/* ── SEARCH ZONE ──────────────────────────────────────────── */}
        <div
          className="backdrop-blur-sm rounded-2xl p-6 mb-6"
          style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
        >
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
            className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors resize-none"
            style={{
              background: "rgba(9,9,11,0.6)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s)}
                  className="text-xs rounded-lg px-3 py-1.5 transition-all"
                  style={{
                    color: "var(--text-secondary)",
                    background: "rgba(39,39,42,0.6)",
                    border: "1px solid var(--border-default)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,92,231,0.1)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-primary)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(108,92,231,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(39,39,42,0.6)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm mt-3" style={{ color: "var(--color-danger)" }}>{error}</p>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="btn-pro mt-4 flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
                <div
                  key={i}
                  className="rounded-2xl p-6 mb-4"
                  style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
                >
                  <div className="h-5 rounded w-1/3 mb-3" style={{ background: "var(--bg-elevated)" }} />
                  <div className="h-3 rounded w-full mb-2" style={{ background: "var(--bg-elevated)" }} />
                  <div className="h-3 rounded w-2/3" style={{ background: "var(--bg-elevated)" }} />
                </div>
              ))}
            </div>
            {/* CTA overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="backdrop-blur-md rounded-2xl p-8 text-center max-w-md"
                style={{
                  background: "rgba(24,24,27,0.95)",
                  border: "1px solid rgba(108,92,231,0.3)",
                  boxShadow: "0 0 40px rgba(108,92,231,0.15)",
                }}
              >
                <Sparkles size={32} className="mx-auto mb-4" style={{ color: "var(--accent-primary)" }} />
                <h3 className="text-lg font-bold text-white mb-2">
                  Fonctionnalite reservee aux membres Pro
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                  Le Screener IA analyse des centaines d&apos;actions pour trouver celles qui correspondent a vos criteres.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn-pro font-bold px-6 py-3 rounded-xl transition-all"
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
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="text-white font-bold">{results.resultats.length}</span> actions selectionnees parmi{" "}
                <span className="text-white">{results.nb_actions_analysees}</span> analysees
              </p>
            </div>

            {/* Interpretation */}
            {results.interpretation_requete && (
              <p
                className="text-sm italic mb-6 pl-3"
                style={{ color: "var(--text-tertiary)", borderLeft: "2px solid rgba(108,92,231,0.4)" }}
              >
                {results.interpretation_requete}
              </p>
            )}

            {/* Result cards */}
            <div className="space-y-4">
              {results.resultats.map((r, idx) => (
                <div
                  key={r.ticker || idx}
                  className="backdrop-blur-sm rounded-2xl p-6 transition-all"
                  style={{ background: "rgba(24,24,27,0.8)", border: "1px solid var(--border-default)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(108,92,231,0.2)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(108,92,231,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-default)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* Top row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white text-lg">{r.ticker}</span>
                      <span className="ml-2 text-sm" style={{ color: "var(--text-secondary)" }}>{r.nom}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color: "var(--accent-primary)" }}>
                        {r.score_match}<span className="text-sm" style={{ color: "var(--text-tertiary)" }}>/100</span>
                      </div>
                      <div className="w-20 rounded-full h-1.5 mt-1" style={{ background: "var(--bg-elevated)" }}>
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${r.score_match}%`, background: "var(--accent-primary)" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Raison */}
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.raison}</p>

                  {/* Points forts */}
                  {r.points_forts && r.points_forts.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {r.points_forts.map((p, i) => (
                        <span key={i} className="text-xs flex items-center gap-1" style={{ color: "var(--color-success)" }}>
                          <span>&#10003;</span> {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Vigilance */}
                  {r.point_vigilance && (
                    <div className="text-xs mt-2" style={{ color: "#eab308" }}>
                      &#9888;&#65039; {r.point_vigilance}
                    </div>
                  )}

                  {/* Bottom row */}
                  <div
                    className="flex justify-between items-center mt-4 pt-3"
                    style={{ borderTop: "1px solid var(--border-default)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {r.secteur} &middot; {r.capitalisation}
                    </span>
                    <button
                      onClick={() => router.push(`/analyze?ticker=${r.ticker}`)}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "var(--accent-primary)" }}
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
            <Search size={40} className="mb-4" style={{ color: "var(--text-tertiary)" }} />
            <h3 className="text-lg font-bold text-white mb-2">Aucun resultat</h3>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Essayez de reformuler votre recherche avec des criteres differents.
            </p>
          </div>
        )}

        {/* Initial empty state */}
        {!results && !loading && isPro && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: "rgba(108,92,231,0.08)",
                border: "1px solid rgba(108,92,231,0.18)",
              }}
            >
              <Search size={28} style={{ color: "var(--accent-primary)" }} />
            </div>
            <h2 className="text-xl font-bold mb-2">Pret a chercher</h2>
            <p className="text-sm max-w-md" style={{ color: "var(--text-tertiary)" }}>
              Decrivez le type d&apos;investissement que vous recherchez et l&apos;IA analysera des centaines d&apos;actions pour vous.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
