"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  LineChart,
  GitCompare,
  Filter,
  Briefcase,
  TrendingUp,
  BookOpen,
  UserPlus,
  Menu,
  X,
  FlaskConical,
  Info,
} from "lucide-react";

const MAIN_ITEMS = [
  { label: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard },
  { label: "Analyser",       href: "/analyze",      icon: LineChart },
  { label: "Portefeuille",   href: "/portfolio",    icon: Briefcase },
];

const SECONDARY_ITEMS = [
  { label: "Comparer",       href: "/compare",      icon: GitCompare },
  { label: "Screener",       href: "/screener",     icon: Filter },
  { label: "Track Record",   href: "/track-record", icon: TrendingUp },
];

const BOTTOM_ITEMS = [
  { label: "Blog",           href: "/blog",         icon: BookOpen },
  { label: "Méthodologie",   href: "/methodology",  icon: FlaskConical },
  { label: "À propos",       href: "/about",        icon: Info },
  { label: "Inviter",        href: "/referral",     icon: UserPlus },
];

const userButtonAppearance = {
  elements: {
    avatarBox: "w-7 h-7",
    userButtonPopoverCard: "bg-[#18181b] border border-[#27272a] shadow-xl",
    userButtonPopoverActionButton: "hover:bg-[rgba(201,168,76,0.08)]",
    userButtonPopoverActionButtonText: "!text-[#e4e4e7]",
    userButtonPopoverActionButtonIcon: "!text-[#C9A84C]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "!text-[#e4e4e7] font-bold",
    userPreviewSecondaryIdentifier: "!text-[#71717a]",
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
    <div className="flex flex-col h-full bg-[#111113]/80 backdrop-blur-md border-r border-[#27272a]">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 h-12 border-b border-[#27272a] cursor-pointer flex-shrink-0"
        onClick={() => router.push("/dashboard")}
      >
        <div className="w-7 h-7 rounded-lg bg-[#09090b] border border-[rgba(201,168,76,0.3)] flex items-center justify-center flex-shrink-0">
          <span className="text-[#C9A84C] font-black text-sm leading-none">V</span>
        </div>
        <span className="font-bold text-sm text-white tracking-tight">ValuEngine</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {/* Main */}
        <div className="space-y-0.5">
          {MAIN_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative ${
                  isActive
                    ? "bg-[#18181b] text-[#C9A84C] border-l-2 border-[#C9A84C] pl-[10px]"
                    : "text-[#71717a] hover:bg-[#18181b] hover:text-[#e4e4e7]"
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-[#C9A84C]" : "text-[#52525b]"}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Separator: Outils */}
        <div className="border-t border-zinc-800/50 mt-4 pt-3 mb-2">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 px-3">Outils</span>
        </div>
        <div className="space-y-0.5">
          {SECONDARY_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative ${
                  isActive
                    ? "bg-[#18181b] text-[#C9A84C] border-l-2 border-[#C9A84C] pl-[10px]"
                    : "text-[#71717a] hover:bg-[#18181b] hover:text-[#e4e4e7]"
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-[#C9A84C]" : "text-[#52525b]"}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Separator: Ressources */}
        <div className="border-t border-zinc-800/50 mt-4 pt-3 mb-2">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 px-3">Ressources</span>
        </div>
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative ${
                  isActive
                    ? "bg-[#18181b] text-[#C9A84C] border-l-2 border-[#C9A84C] pl-[10px]"
                    : "text-[#71717a] hover:bg-[#18181b] hover:text-[#e4e4e7]"
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-[#C9A84C]" : "text-[#52525b]"}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-2 border-t border-[#27272a] pt-2 flex-shrink-0">
        {isSignedIn && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ position: "relative", zIndex: 50 }}>
              <UserButton appearance={userButtonAppearance} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-[#e4e4e7]">{firstName}</p>
              {isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]">
                  PRO
                </span>
              )}
            </div>
          </div>
        )}
        {isSignedIn && !isPro && (
          <button
            onClick={async () => {
              if (!user) { router.push("/sign-up"); return; }
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/stripe/create-checkout`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user_id: user.id, email: user.emailAddresses?.[0]?.emailAddress }),
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              } catch {}
            }}
            className="w-full text-xs font-bold text-[#09090b] bg-[#C9A84C] hover:bg-[#b8943d] py-2 rounded-lg transition-colors mb-1"
          >
            Passer Pro ✦
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden bg-[#18181b] border border-[#27272a] rounded-lg p-2 text-[#C9A84C]"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-56 z-50 transition-transform duration-300 md:hidden overflow-visible`}
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 min-h-screen sticky top-0 h-screen overflow-visible relative z-[2]">
        <SidebarContent />
      </aside>
    </>
  );
}
