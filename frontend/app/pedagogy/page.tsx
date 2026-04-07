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
  valorisation: "#C9A84C",
  fondamentaux: "#00d4aa",
  risque: "#ff4d6d",
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
      <div className="min-h-screen text-white px-4 sm:px-6 md:px-10 py-4 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={24} className="text-[#C9A84C]" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Mode Pedagogique</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            La finance expliquee simplement. Comme si tu avais 15 ans.
          </p>
        </div>

        {/* AI Explain Box */}
        <div className="bg-[#18181b]/80 backdrop-blur-sm border border-[#C9A84C]/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[#C9A84C]" />
            <h2 className="text-sm font-bold text-[#C9A84C] uppercase tracking-wider">
              Pose ta question
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Tape n&apos;importe quel terme financier et l&apos;IA te l&apos;explique simplement.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={customConcept}
              onChange={(e) => setCustomConcept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && explainCustom()}
              placeholder="Ex: C'est quoi un DCF ? Comment marche un ETF ?"
              className="flex-1 bg-[#09090b]/60 border border-[#27272a] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
            />
            <button
              onClick={explainCustom}
              disabled={loadingAI || !customConcept.trim()}
              className="bg-[#C9A84C] text-black font-bold px-5 py-3 rounded-xl text-sm hover:bg-[#e8c55a] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingAI ? <Loader2 size={14} className="animate-spin" /> : "Expliquer"}
            </button>
          </div>

          {/* AI Result */}
          {aiExplanation && (
            <div className="mt-4 bg-[#09090b]/60 border border-[#27272a] rounded-xl p-5 space-y-3">
              <h3 className="text-base font-bold text-white">{aiExplanation.term}</h3>
              <div>
                <p className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-1">
                  Explication simple
                </p>
                <p className="text-sm text-zinc-300">{aiExplanation.simple}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Version technique
                </p>
                <p className="text-sm text-zinc-400">{aiExplanation.technical}</p>
              </div>
              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-wider mb-1">
                  Exemple concret
                </p>
                <p className="text-sm text-zinc-300">{aiExplanation.example}</p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un terme..."
            className="w-full bg-[#18181b]/80 border border-[#27272a] rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
          />
        </div>

        {/* Glossary by category */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryTerms]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] || "#C9A84C" }}
                />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {CATEGORY_LABELS[category] || category}
                </h3>
              </div>
              <div className="space-y-2">
                {categoryTerms.map((t) => (
                  <div key={t.id}>
                    <button
                      onClick={() => loadTermDetail(t.id)}
                      className={`w-full text-left bg-[#18181b]/80 border rounded-xl px-5 py-4 transition-all ${
                        expandedTerm === t.id
                          ? "border-[#C9A84C]/40 bg-[rgba(201,168,76,0.04)]"
                          : "border-[#27272a] hover:border-[#3f3f46]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{t.term}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{t.simple}</p>
                        </div>
                        {expandedTerm === t.id ? (
                          <ChevronUp size={16} className="text-zinc-500" />
                        ) : (
                          <ChevronDown size={16} className="text-zinc-500" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedTerm === t.id && termDetail && (
                      <div className="mt-2 bg-[#09090b]/60 border border-[#27272a] rounded-xl p-5 space-y-3 ml-4">
                        {loadingDetail ? (
                          <Loader2 size={16} className="animate-spin text-[#C9A84C]" />
                        ) : (
                          <>
                            <div>
                              <p className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-1">
                                Explication simple
                              </p>
                              <p className="text-sm text-zinc-300">{termDetail.simple}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                Version technique
                              </p>
                              <p className="text-sm text-zinc-400">{termDetail.technical}</p>
                            </div>
                            <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                              <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-wider mb-1">
                                Exemple concret
                              </p>
                              <p className="text-sm text-zinc-300">{termDetail.example}</p>
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
            <p className="text-zinc-500 text-sm">Aucun terme trouve pour &quot;{searchQuery}&quot;</p>
            <p className="text-zinc-600 text-xs mt-1">
              Utilise la barre &quot;Pose ta question&quot; pour une explication IA
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
