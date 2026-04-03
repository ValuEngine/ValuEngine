"use client";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import AnimatedBackground from "./AnimatedBackground";
import { useProStatus } from "@/hooks/useProStatus";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/analyze":      "Analyser",
  "/compare":      "Comparer",
  "/screener":     "Screener",
  "/portfolio":    "Portefeuille",
  "/track-record": "Track Record",
  "/blog":         "Blog",
  "/referral":     "Inviter des amis",
  "/legal":        "Mentions légales",
  "/about":        "Qui sommes-nous",
  "/methodology":  "Méthodologie",
};

function TopHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isPro } = useProStatus(user?.id);

  const pageLabel = BREADCRUMBS[pathname] ?? BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => pathname.startsWith(k)) ?? ""] ?? "App";

  return (
    <header className="h-12 flex items-center justify-between px-3 md:px-5 border-b border-[#27272a] bg-[#09090b]/75 backdrop-blur-md flex-shrink-0 relative z-20 sticky top-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs ml-10 md:ml-0">
        <span className="text-zinc-500 hidden sm:inline">ValuEngine</span>
        <span className="text-zinc-600 hidden sm:inline">/</span>
        <span className="text-zinc-200 font-medium truncate">{pageLabel}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Usage badge */}
        {isPro ? (
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-[rgba(201,168,76,0.2)] to-[rgba(201,168,76,0.08)] text-[#C9A84C] border border-[rgba(201,168,76,0.35)] shadow-[0_0_12px_rgba(201,168,76,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
            PRO
          </span>
        ) : (
          <span className="hidden md:flex text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">
            3 analyses / jour
          </span>
        )}

        {/* Bell */}
        <button className="relative text-zinc-400 hover:text-zinc-200 transition-colors p-1">
          <Bell size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-zinc-800 hidden sm:block" />
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "transparent" }}>
      <AnimatedBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto relative z-[2] min-w-0">
        <TopHeader />
        <main className="flex-1">
          {children}
        </main>
        <footer className="mt-auto px-3 py-2 md:px-6 md:py-3 text-[10px] md:text-xs text-center text-[#71717a] border-t border-[#27272a] bg-[#09090b]/60 backdrop-blur-sm">
          © 2026 ValuEngine — Outil d&apos;analyse éducatif.{" "}
          Les données et analyses présentées ne constituent pas des conseils en investissement au sens de la directive MIF II.{" "}
          Performances passées ne présagent pas des performances futures.{" "}
          <a href="/legal" className="underline hover:text-[#C9A84C] transition-colors">Mentions légales & CGU</a>
        </footer>
      </div>
    </div>
  );
}
