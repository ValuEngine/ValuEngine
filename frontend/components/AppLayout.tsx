"use client";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import AnimatedBackground from "./AnimatedBackground";

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

  const isPro =
    typeof window !== "undefined" && user
      ? localStorage.getItem(`pro_${user.id}`) === "true" ||
        localStorage.getItem("valuengine_pro") === "true"
      : false;

  const pageLabel = BREADCRUMBS[pathname] ?? BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => pathname.startsWith(k)) ?? ""] ?? "App";

  return (
    <header className="h-12 flex items-center justify-between px-5 border-b border-[#27272a] bg-[#09090b]/75 backdrop-blur-md flex-shrink-0 relative z-20 sticky top-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-zinc-500">ValuEngine</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200 font-medium">{pageLabel}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Usage badge */}
        {isPro ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]">
            PRO ∞
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">
            3 analyses / jour
          </span>
        )}

        {/* Bell */}
        <button className="relative text-zinc-400 hover:text-zinc-200 transition-colors p-1">
          <Bell size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-zinc-800" />

        {/* User avatar handled by Sidebar UserButton — just a placeholder here */}
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
        <footer className="mt-auto px-6 py-3 text-xs text-center text-[#71717a] border-t border-[#27272a] bg-[#09090b]/60 backdrop-blur-sm">
          © 2026 ValuEngine — Outil d&apos;analyse éducatif.{" "}
          Les données et analyses présentées ne constituent pas des conseils en investissement au sens de la directive MIF II.{" "}
          Performances passées ne présagent pas des performances futures.{" "}
          <a href="/legal" className="underline hover:text-[#C9A84C] transition-colors">Mentions légales & CGU</a>
        </footer>
      </div>
    </div>
  );
}
