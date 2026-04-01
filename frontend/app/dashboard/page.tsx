"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface RecentEntry {
  ticker: string;
  name: string;
  verdict: string;
  date: string;
}

const MARKET_DATA = [
  { label: "S&P 500",  value: "5,243.18", change: "+1.2%",  up: true },
  { label: "NASDAQ",   value: "16,432.73", change: "+0.8%", up: true },
  { label: "CAC 40",   value: "8,021.45",  change: "-0.3%", up: false },
  { label: "DAX",      value: "18,384.62", change: "+0.5%", up: true },
];

const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN"];

function verdictColor(verdict: string) {
  if (verdict === "BUY")  return "bg-[rgba(0,212,170,0.12)] text-[#00d4aa] border border-[rgba(0,212,170,0.25)]";
  if (verdict === "SELL") return "bg-[rgba(255,77,109,0.12)] text-[#ff4d6d] border border-[rgba(255,77,109,0.25)]";
  return "bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]";
}

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ve_recent");
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const handleSearch = () => {
    const sym = searchQuery.trim().toUpperCase();
    if (sym) router.push(`/analyze?ticker=${sym}`);
  };

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const firstName = user?.firstName || "Investisseur";

  if (!isLoaded || !isSignedIn) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
          <div className="w-8 h-8 border-t-2 border-[#C9A84C] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#0a1628] text-white px-6 py-8 md:px-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">
            Bonjour {firstName} 👋
          </h1>
          <p className="text-[#6b7d91] text-sm mt-1 capitalize">{today}</p>
        </div>

        {/* Quick search */}
        <div className="bg-[#132032] border border-[rgba(201,168,76,0.14)] rounded-2xl p-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyser un titre</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ex: AAPL, TSLA, MSFT..."
              className="flex-1 bg-[rgba(27,45,69,0.9)] border border-[rgba(201,168,76,0.25)] rounded-xl px-5 py-3 text-white placeholder-[#304560] text-sm font-semibold focus:outline-none focus:border-[#C9A84C] transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Analyser <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent analyses */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Analyses récentes</p>
          {recent.length === 0 ? (
            <div className="bg-[#132032] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 text-center">
              <p className="text-[#4a6070] text-sm">Aucune analyse récente</p>
              <p className="text-[#2a3a4a] text-xs mt-1">Lancez votre première analyse ci-dessus</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((entry) => (
                <button
                  key={entry.ticker}
                  onClick={() => router.push(`/analyze?ticker=${entry.ticker}`)}
                  className="bg-[#132032] border border-[rgba(201,168,76,0.1)] rounded-2xl p-5 text-left hover:border-[rgba(201,168,76,0.3)] hover:translate-y-[-2px] transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[#C9A84C] font-black text-lg">{entry.ticker}</p>
                      <p className="text-white text-sm font-medium truncate max-w-[140px]">{entry.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${verdictColor(entry.verdict)}`}>
                      {entry.verdict}
                    </span>
                  </div>
                  <p className="text-[#4a6070] text-xs">{entry.date}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market overview */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C]">Marchés aujourd&apos;hui</p>
            <span className="text-[10px] text-[#4a6070] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-full">
              Données indicatives
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {MARKET_DATA.map((m) => (
              <div
                key={m.label}
                className="bg-[#132032] border border-[rgba(201,168,76,0.1)] rounded-2xl p-5"
              >
                <p className="text-[#6b7d91] text-xs font-semibold mb-2">{m.label}</p>
                <p className="text-white font-black text-lg">{m.value}</p>
                <p className={`text-sm font-bold mt-1 ${m.up ? "text-[#00d4aa]" : "text-[#ff4d6d]"}`}>
                  {m.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular tickers */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#C9A84C] mb-4">Tickers populaires</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => router.push(`/analyze?ticker=${t}`)}
                className="text-sm font-bold text-[#C9A84C] bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] px-4 py-2 rounded-xl hover:bg-[rgba(201,168,76,0.15)] hover:border-[rgba(201,168,76,0.4)] transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
