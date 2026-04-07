"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { searchTicker, type SearchResult } from "@/lib/api";
import { gtmEvents } from "@/lib/analytics";

const TYPEWRITER_TICKERS = ["AAPL", "MC.PA", "TSLA", "TTE.PA", "NVDA", "BNP.PA"];

function useTypewriter(words: string[], speed = 120, pause = 1600) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIdx + 1));
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx((c) => c + 1);
        }
      } else {
        setDisplay(word.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setWordIdx((w) => (w + 1) % words.length);
          setCharIdx(0);
        } else {
          setCharIdx((c) => c - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

export default function HeroSearch() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typewriterText = useTypewriter(TYPEWRITER_TICKERS);

  const handleAnalyze = (t: string) => {
    const value = (t || ticker).trim().toUpperCase();
    if (value) router.push(`/analyze?ticker=${value}`);
  };

  const handleTickerChange = useCallback((value: string) => {
    const upper = value.toUpperCase();
    setTicker(upper);
    setSearchResult(null);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!upper || upper.length < 1) { setSearching(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchTicker(upper);
        setSearchResult(result);
        setSearchError(null);
      } catch {
        setSearchResult(null);
        setSearchError("Ticker introuvable");
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const isValid = !!searchResult;
  const hasError = !!searchError && ticker.length > 0;

  return (
    <>
      {/* Smart Search bar */}
      <div className="max-w-md mx-auto mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative">
          <div className="flex-1 relative">
            <input
              type="text" value={ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze("")}
              placeholder={`Essaie ${typewriterText}|`}
              className="w-full rounded-xl px-5 py-3.5 text-base sm:text-sm font-semibold focus:outline-none transition-all"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: `1px solid ${hasError ? "var(--color-danger)" : isValid ? "var(--color-success)" : "var(--border-default)"}`,
              }}
            />
            {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-t-2 rounded-full animate-spin" style={{ borderColor: "var(--accent-primary)" }} />}
          </div>
          <button
            onClick={() => { gtmEvents.ctaClicked('hero_analyze'); handleAnalyze(""); }}
            disabled={!ticker || hasError}
            className="btn-primary font-bold px-5 py-3.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
          >
            Analyser
          </button>
        </div>
        {searchResult && (
          <button
            onClick={() => handleAnalyze(searchResult.ticker)}
            className="mt-2 w-full rounded-xl px-4 py-3 flex items-center justify-between transition-all text-left"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <div>
              <span className="font-bold text-sm mr-2" style={{ color: "var(--accent-primary)" }}>{searchResult.ticker}</span>
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>{searchResult.name}</span>
              <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>&middot; {searchResult.sector}</span>
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>${searchResult.price.toFixed(2)}</span>
          </button>
        )}
        {hasError && <p className="mt-2 text-xs text-center font-medium" style={{ color: "var(--color-danger)" }}>Ticker introuvable. Vérifie le symbole (ex: AAPL, MC.PA).</p>}
        <p className="mt-3 text-xs text-center" style={{ color: "var(--text-tertiary)" }}>Une analyse DCF prend 3h sur Excel. Avec ValuEngine : 60 secondes.</p>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
        <span className="text-xs mr-1" style={{ color: "var(--text-tertiary)" }}>Populaires :</span>
        {["MC.PA", "AAPL", "TTE.PA", "TSLA", "BNP.PA", "NVDA"].map((t) => (
          <button
            key={t}
            onClick={() => handleAnalyze(t)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
            style={{ color: "var(--text-secondary)", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            {t}
          </button>
        ))}
      </div>
    </>
  );
}
