"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Briefcase, Compass, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: BarChart3, label: "Analyse", href: "/analyze" },
  { icon: Briefcase, label: "Portfolio", href: "/portfolio" },
  { icon: Compass, label: "Explorer", href: "/explore" },
];

const MORE_ITEMS = [
  { label: "Comparer", href: "/compare" },
  { label: "Backtest", href: "/backtest" },
  { label: "Track Record", href: "/track-record" },
  { label: "Apprendre", href: "/pedagogy" },
  { label: "Inviter", href: "/referral" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[98] md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-[72px] right-4 rounded-2xl p-2 min-w-[180px]"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            onClick={(e) => e.stopPropagation()}>
            {MORE_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  color: pathname === item.href ? "var(--accent-primary)" : "var(--text-secondary)",
                  background: pathname === item.href ? "var(--accent-primary-muted)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[99] md:hidden flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]"
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-subtle)",
          height: "68px",
          backdropFilter: "blur(12px)",
        }}
      >
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2 px-3 min-w-[56px]"
            >
              <Icon
                size={22}
                style={{ color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)" }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-1 w-5 h-0.5 rounded-full"
                  style={{ background: "var(--accent-primary)" }}
                />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center gap-1 py-2 px-3 min-w-[56px]"
        >
          <MoreHorizontal
            size={22}
            style={{ color: showMore ? "var(--accent-primary)" : "var(--text-tertiary)" }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: showMore ? "var(--accent-primary)" : "var(--text-tertiary)" }}
          >
            Plus
          </span>
        </button>
      </nav>
    </>
  );
}
