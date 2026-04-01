"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Search,
  Scale,
  BarChart2,
  Briefcase,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",   href: "/dashboard", icon: LayoutDashboard },
  { label: "Analyser",    href: "/analyze",   icon: Search },
  { label: "Comparer",    href: "/compare",   icon: Scale },
  { label: "Screener",    href: "/screener",  icon: BarChart2 },
  { label: "Portefeuille",href: "/portfolio", icon: Briefcase },
];

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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[rgba(201,168,76,0.12)]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center flex-shrink-0">
          <span className="text-[#0a1628] font-black text-lg">V</span>
        </div>
        <span className="text-white font-bold text-base tracking-tight">ValuEngine</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "?");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 relative group ${
                isActive
                  ? "text-[#C9A84C] bg-[rgba(201,168,76,0.08)] border-l-2 border-[#C9A84C] pl-[14px]"
                  : "text-[#6b7d91] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              <Icon size={18} className={isActive ? "text-[#C9A84C]" : "text-[#4a6070] group-hover:text-white"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      {isSignedIn && (
        <div className="px-3 py-4 border-t border-[rgba(201,168,76,0.12)]">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[rgba(255,255,255,0.03)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0a1628] font-black text-xs">
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{firstName}</p>
              {isPro && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C9A84C] text-[#0a1628]">
                  PRO
                </span>
              )}
            </div>
          </div>
          {!isPro && (
            <button
              onClick={() => router.push("/analyze")}
              className="mt-2 w-full text-xs font-bold text-[#0a1628] bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] py-2.5 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
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
        className="fixed top-4 left-4 z-50 md:hidden bg-[#132032] border border-[rgba(201,168,76,0.2)] rounded-xl p-2.5 text-[#C9A84C]"
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
        className={`fixed top-0 left-0 h-full w-60 z-50 bg-[#0d1f38] border-r border-[rgba(201,168,76,0.12)] transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-[#0d1f38] border-r border-[rgba(201,168,76,0.12)] min-h-screen sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>
    </>
  );
}
