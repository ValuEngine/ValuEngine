"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { BookOpen, Search, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { authedFetch } from "@/lib/api";
import AppLayout from "@/components/AppLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface GlossaryTerm {
  id: string;
  term: string;
  simple: string;
  category: string;
}

interface TermExplanation {
  term: string;
  simple: string;
  technical: string;
  example: string;
  category: string;
  source?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  valorisation: "Valorisation",
  fondamentaux: "Fondamentaux",
  risque: "Risque",
  rendement: "Rendement",
  strategies: "Strategies",
  fiscalite: "Fiscalite",
  instruments: "Instruments",
  analyse_technique: "Analyse technique",
};

const CATEGORY_COLORS: Record<string, string> = {
  valorisation: "var(--accent-primary)",
  fondamentaux: "var(--color-success)",
  risque: "var(--color-danger)",
  rendement: "#818cf8",
  strategies: "#fb923c",
  fiscalite: "#22d3ee",
  instruments: "#a78bfa",
  analyse_technique: "#f472b6",
};

export default function PedagogyPage() {
  const { getToken } = useAuth();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customConcept, setCustomConcept] = useState("");
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [termDetail, setTermDetail] = useState<TermExplanation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<TermExplanation | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/pedagogy/glossary`)
      .then((r) => r.json())
      .then((data) => setTerms(data.terms || []))
      .catch(() => {});
  }, []);

  const loadTermDetail = async (termId: string) => {
    if (expandedTerm === termId) {
      setExpandedTerm(null);
      setTermDetail(null);
      return;
    }
    setExpandedTerm(termId);
    setLoadingDetail(true);
    try {
      const resp = await fetch(`${API_BASE}/api/pedagogy/term/${termId}`);
      if (resp.ok) {
        const data: TermExplanation = await resp.json();
        setTermDetail(data);
      }
    } catch { /* ignore */ }
    setLoadingDetail(false);
  };

  const explainCustom = async () => {
    if (!customConcept.trim()) return;
    setLoadingAI(true);
    setAiExplanation(null);
    try {
      const resp = await authedFetch(`${API_BASE}/api/pedagogy/explain`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: customConcept.trim() }),
      });
      if (resp.ok) {
        const data: TermExplanation = await resp.json();
        setAiExplanation(data);
      }
    } catch { /* ignore */ }
    setLoadingAI(false);
  };

  const filteredTerms = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = filteredTerms.reduce<Record<string, GlossaryTerm[]>>((acc, t) => {
    const cat = t.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="min-h-screen px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl" style={{ color: "var(--text-primary)" }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={24} style={{ color: "var(--accent-primary)" }} />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Mode Pedagogique</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            La finance expliquee simplement. Comme si tu avais 15 ans.
          </p>
        </div>

        {/* AI Explain Box */}
        <div
          className="backdrop-blur-sm rounded-2xl p-6 mb-8 border"
          style={{ background: "var(--bg-surface)", borderColor: "rgba(var(--accent-primary-rgb, 99,102,241), 0.2)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: "var(--accent-primary)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--accent-primary)" }}>
              Pose ta question
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            Tape n&apos;importe quel terme financier et l&apos;IA te l&apos;explique simplement.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={customConcept}
              onChange={(e) => setCustomConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && explainCustom()}
              placeholder="Ex: C'est quoi un DCF ? Comment marche un ETF ?"
              className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={explainCustom}
              disabled={loadingAI || !customConcept.trim()}
              className="font-bold px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ background: "var(--accent-primary)", color: "#fff" }}
            >
              {loadingAI ? <Loader2 size={14} className="animate-spin" /> : "Expliquer"}
            </button>
          </div>

          {/* AI Result */}
          {aiExplanation && (
            <div
              className="mt-4 rounded-xl p-5 space-y-3 border"
              style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
            >
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{aiExplanation.term}</h3>
              <div>
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--accent-primary)" }}>
                  Explication simple
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{aiExplanation.simple}</p>
              </div>
              <div>
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                  Version technique
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{aiExplanation.technical}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
                <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-success)" }}>
                  Exemple concret
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{aiExplanation.example}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un terme..."
            className="w-full backdrop-blur-sm rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Glossary by category */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryTerms]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] || "var(--accent-primary)" }}
                />
                <h3 className="text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                  {CATEGORY_LABELS[category] || category}
                </h3>
              </div>
              <div className="space-y-2">
                {categoryTerms.map((t) => (
                  <div key={t.id}>
                    <button
                      onClick={() => loadTermDetail(t.id)}
                      className={`w-full text-left backdrop-blur-sm rounded-xl px-5 py-4 transition-all border`}
                      style={{
                        background: "var(--bg-surface)",
                        borderColor: expandedTerm === t.id ? "rgba(99,102,241,0.4)" : "var(--border-default)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t.term}</p>
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-tertiary)" }}>{t.simple}</p>
                        </div>
                        {expandedTerm === t.id ? (
                          <ChevronUp size={16} style={{ color: "var(--text-tertiary)" }} />
                        ) : (
                          <ChevronDown size={16} style={{ color: "var(--text-tertiary)" }} />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedTerm === t.id && termDetail && (
                      <div
                        className="mt-2 rounded-xl p-5 space-y-3 ml-4 border"
                        style={{ background: "var(--bg-base)", borderColor: "var(--border-default)" }}
                      >
                        {loadingDetail ? (
                          <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
                        ) : (
                          <>
                            <div>
                              <p className="text-[13px] font-medium mb-1" style={{ color: "var(--accent-primary)" }}>
                                Explication simple
                              </p>
                              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{termDetail.simple}</p>
                            </div>
                            <div>
                              <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                                Version technique
                              </p>
                              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{termDetail.technical}</p>
                            </div>
                            <div className="rounded-lg p-3 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
                              <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-success)" }}>
                                Exemple concret
                              </p>
                              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{termDetail.example}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTerms.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Aucun terme trouve pour &quot;{searchQuery}&quot;</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Utilise la barre &quot;Pose ta question&quot; pour une explication IA
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
