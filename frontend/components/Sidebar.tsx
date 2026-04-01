"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Search,
  Scale,
  BarChart2,
  Briefcase,
  BookOpen,
  Gift,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",      href: "/dashboard",  icon: LayoutDashboard },
  { label: "Analyser",       href: "/analyze",    icon: Search },
  { label: "Comparer",       href: "/compare",    icon: Scale },
  { label: "Screener",       href: "/screener",   icon: BarChart2 },
  { label: "Portefeuille",   href: "/portfolio",  icon: Briefcase },
  { label: "Blog",           href: "/blog",       icon: BookOpen },
  { label: "Inviter des amis", href: "/referral", icon: Gift },
];

const userButtonAppearance = {
  elements: {
    avatarBox: "w-8 h-8 ring-2 ring-[#C9A84C] ring-offset-1 ring-offset-[#161b22]",
    userButtonPopoverCard: "bg-[#1c2128] border border-[#30363d] shadow-xl",
    userButtonPopoverActionButton: "hover:bg-[rgba(201,168,76,0.1)]",
    userButtonPopoverActionButtonText: "!text-[#e6edf3]",
    userButtonPopoverActionButtonIcon: "!text-[#C9A84C]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "!text-[#e6edf3] font-bold",
    userPreviewSecondaryIdentifier: "!text-[#8b949e]",
  },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPro =
    typeof window !== "undefined" && user
      ? localStorage.getItem(`pro_${user.id}`) === "true"
      : false;

  const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Utilisateur";

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-secondary)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center flex-shrink-0 hover:animate-pulse-gold cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <span className="text-[#0d1117] font-black text-lg">V</span>
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>ValuEngine</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 relative group ${
                isActive
                  ? "bg-[rgba(201,168,76,0.15)] border-l-2 border-[#C9A84C] text-[#C9A84C] pl-[14px]"
                  : "text-[#8b949e] hover:bg-[rgba(201,168,76,0.1)] hover:border-l-2 hover:border-[#C9A84C] hover:text-[#e6edf3] hover:pl-[14px]"
              }`}
            >
              <Icon size={18} className={isActive ? "text-[#C9A84C]" : "text-[#8b949e] group-hover:text-[#C9A84C]"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      {isSignedIn && (
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)", position: "relative", zIndex: 50 }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="pointer-events-auto" style={{ position: "relative", zIndex: 50 }}>
              <UserButton appearance={userButtonAppearance} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{firstName}</p>
              {isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C9A84C] text-[#0d1117]">
                  PRO
                </span>
              )}
            </div>
          </div>
          {!isPro && (
            <button
              onClick={() => router.push("/analyze")}
              className="mt-2 w-full text-xs font-bold text-[#0d1117] bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
            >
              Passer Pro ✦
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-[#1c2128] border border-[#30363d] rounded-xl p-2.5 text-[#C9A84C]"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 z-50 border-r transition-transform duration-300 md:hidden overflow-visible`}
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar — always visible */}
      <aside
        className="hidden md:flex flex-col w-60 flex-shrink-0 border-r min-h-screen sticky top-0 h-screen overflow-visible"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
