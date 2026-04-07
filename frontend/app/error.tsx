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
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="text-center space-y-6 max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{
            background: "rgba(108,92,231,0.08)",
            border: "1px solid rgba(108,92,231,0.18)",
          }}
        >
          <span className="text-2xl">&#9888;&#65039;</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Une erreur est survenue</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Quelque chose s&apos;est mal pass&eacute;. R&eacute;essaie ou reviens plus tard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-pro font-bold px-6 py-3 rounded-xl transition-all"
          >
            R&eacute;essayer
          </button>
          <a
            href="/dashboard"
            className="font-semibold px-6 py-3 rounded-xl transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-secondary)",
            }}
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
