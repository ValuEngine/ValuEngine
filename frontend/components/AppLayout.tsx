"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import AnimatedBackground from "./AnimatedBackground";
import { useProStatus } from "@/hooks/useProStatus";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { isPro } = useProStatus(user?.id);

  // Sync user to Supabase on first visit
  useEffect(() => {
    if (user?.id) {
      const ref = typeof window !== "undefined" ? localStorage.getItem("valuengine_ref") : null;
      fetch("/api/db/user", {
        method: "POST",
        headers: ref ? { "Content-Type": "application/json" } : {},
        body: ref ? JSON.stringify({ referred_by: ref }) : undefined,
      }).then(() => {
        if (ref) localStorage.removeItem("valuengine_ref");
      }).catch(() => {});
    }
  }, [user?.id]);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <AnimatedBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto relative z-[2] min-w-0">
        {/* Top bar — compact */}
        <header
          className="h-12 flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-20"
          style={{
            background: "rgba(10,10,15,0.75)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div />
          <div className="flex items-center gap-3">
            {isPro ? (
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "var(--accent-gold-muted)",
                  color: "var(--accent-gold)",
                  border: "1px solid rgba(240,200,80,0.25)",
                }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-gold)" }} />
                PRO
              </span>
            ) : null}
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        <footer
          className="mt-auto px-3 py-2 md:px-6 md:py-3 text-[11px] text-center hidden md:block"
          style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)" }}
        >
          © 2026 ValuEngine — Outil d&apos;analyse éducatif.{" "}
          Les données ne constituent pas des conseils en investissement (MIF II).{" "}
          <a href="/methodology" className="underline transition-colors" style={{ color: "var(--text-tertiary)" }}>
            Méthodologie
          </a>
          {" · "}
          <a href="/pedagogy#glossaire" className="underline transition-colors" style={{ color: "var(--text-tertiary)" }}>
            Glossaire
          </a>
          {" · "}
          <a href="/legal" className="underline transition-colors" style={{ color: "var(--text-tertiary)" }}>
            Mentions légales
          </a>
        </footer>
      </div>

      <BottomNav />
    </div>
  );
}
