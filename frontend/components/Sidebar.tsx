"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useProStatus } from "@/hooks/useProStatus";
import {
  Home,
  BarChart3,
  Briefcase,
  Compass,
  Wrench,
  GitCompare,
  LineChart,
  Trophy,
  ChevronDown,
  GraduationCap,
  BookOpen,
  UserPlus,
} from "lucide-react";

const MAIN_ITEMS = [
  { label: "Dashboard",    href: "/dashboard",  icon: Home },
  { label: "Analyser",     href: "/analyze",    icon: BarChart3 },
  { label: "Portefeuille", href: "/portfolio",  icon: Briefcase },
  { label: "Explorer",     href: "/explore",    icon: Compass, badge: "new" as const },
];

const TOOLS_ITEMS = [
  { label: "Comparer",     href: "/compare",      icon: GitCompare },
  { label: "Backtest",     href: "/backtest",      icon: LineChart },
  { label: "Track Record", href: "/track-record",  icon: Trophy },
];

const BOTTOM_ITEMS = [
  { label: "Apprendre",  href: "/pedagogy",  icon: GraduationCap },
  { label: "Blog",       href: "/blog",      icon: BookOpen },
  { label: "Inviter",    href: "/referral",  icon: UserPlus },
];

const userButtonAppearance = {
  elements: {
    avatarBox: "w-7 h-7",
    userButtonPopoverCard: "bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xl",
    userButtonPopoverActionButton: "hover:bg-[var(--accent-primary-muted)]",
    userButtonPopoverActionButtonText: "!text-[var(--text-primary)]",
    userButtonPopoverActionButtonIcon: "!text-[var(--accent-primary)]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "!text-[var(--text-primary)] font-bold",
    userPreviewSecondaryIdentifier: "!text-[var(--text-secondary)]",
  },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [toolsOpen, setToolsOpen] = useState(true);
  const [checkoutError, setCheckoutError] = useState("");
  const { isPro, loading: proLoading } = useProStatus(user?.id);

  const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Utilisateur";

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const NavLink = ({ href, icon: Icon, label, badge }: { href: string; icon: typeof Home; label: string; badge?: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 relative"
        style={{
          background: active ? "var(--accent-primary-muted)" : "transparent",
          color: active ? "var(--accent-primary)" : "var(--text-secondary)",
          fontWeight: active ? 600 : 400,
        }}
      >
        <Icon size={18} style={{ color: active ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
        {label}
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ml-auto"
            style={{
              background: "var(--accent-primary-muted)",
              color: "var(--accent-primary)",
              border: "1px solid rgba(108,92,231,0.25)",
            }}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-56 flex-shrink-0 min-h-screen sticky top-0 h-screen overflow-visible relative z-[2]">
      <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}>
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 h-14 cursor-pointer flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
          onClick={() => router.push("/dashboard")}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-primary-muted)", border: "1px solid rgba(108,92,231,0.25)" }}>
            <span className="font-black text-sm leading-none" style={{ color: "var(--accent-primary)" }}>V</span>
          </div>
          <span className="font-display font-bold text-sm" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>ValuEngine</span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
          {MAIN_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {/* Tools section — collapsible */}
          <div className="pt-4">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-left"
            >
              <Wrench size={14} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Outils</span>
              <ChevronDown
                size={14}
                className={`ml-auto transition-transform ${toolsOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--text-tertiary)" }}
              />
            </button>
            {toolsOpen && (
              <div className="mt-1 space-y-0.5">
                {TOOLS_ITEMS.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="pt-4 space-y-0.5">
            {BOTTOM_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-2 pb-3 pt-2 flex-shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {isSignedIn && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-2"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div style={{ position: "relative", zIndex: 50 }}>
                <UserButton appearance={userButtonAppearance} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{firstName}</p>
                {isPro && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--accent-gold-muted)",
                      color: "var(--accent-gold)",
                      border: "1px solid rgba(240,200,80,0.25)",
                    }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: "var(--accent-gold)" }} />
                    PRO
                  </span>
                )}
              </div>
            </div>
          )}
          {isSignedIn && !isPro && !proLoading && (
            <>
              <button
                onClick={async () => {
                  if (!user) { router.push("/sign-up"); return; }
                  setCheckoutError("");
                  try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
                    const res = await fetch(`${apiUrl}/api/stripe/create-checkout`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user.id,
                        userEmail: user.emailAddresses?.[0]?.emailAddress,
                        plan: "monthly",
                      }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                    else setCheckoutError(data.detail || "Erreur.");
                  } catch {
                    setCheckoutError("Impossible de contacter le serveur.");
                  }
                }}
                className="btn-pro w-full text-sm py-2.5"
              >
                Passer Pro ✦
              </button>
              {checkoutError && (
                <p className="text-xs px-1 mt-1" style={{ color: "var(--color-danger)" }}>{checkoutError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
