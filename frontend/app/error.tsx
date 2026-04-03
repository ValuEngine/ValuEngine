"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log to error reporting service
  }, [error]);

  return (
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mx-auto">
          <span className="text-2xl">&#9888;&#65039;</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Une erreur est survenue</h1>
        <p className="text-[#71717a] text-sm">
          Quelque chose s&apos;est mal pass&eacute;. R&eacute;essaie ou reviens plus tard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
          >
            R&eacute;essayer
          </button>
          <a
            href="/dashboard"
            className="border border-[rgba(255,255,255,0.1)] text-[#a1a1aa] font-semibold px-6 py-3 rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-all"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
