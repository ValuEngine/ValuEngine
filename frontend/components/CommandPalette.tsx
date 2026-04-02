"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Search,
  LayoutDashboard,
  LineChart,
  GitCompare,
  Filter,
  Briefcase,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { searchTicker } from "@/lib/api";

interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
}

const NAV_ITEMS: CommandItem[] = [
  { id: "nav-dashboard",     label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard, section: "Navigation" },
  { id: "nav-analyser",      label: "Analyser",      href: "/analyze",       icon: LineChart,       section: "Navigation" },
  { id: "nav-comparer",      label: "Comparer",      href: "/compare",       icon: GitCompare,      section: "Navigation" },
  { id: "nav-screener",      label: "Screener",      href: "/screener",      icon: Filter,          section: "Navigation" },
  { id: "nav-portfolio",     label: "Portefeuille",  href: "/portfolio",     icon: Briefcase,       section: "Navigation" },
  { id: "nav-track-record",  label: "Track Record",  href: "/track-record",  icon: TrendingUp,      section: "Navigation" },
  { id: "nav-blog",          label: "Blog",          href: "/blog",          icon: BookOpen,        section: "Navigation" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tickerResult, setTickerResult] = useState<{ ticker: string; name: string } | null>(null);
  const [tickerLoading, setTickerLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter nav items by query
  const filteredNav = query
    ? NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  // Build combined items list
  const items: { id: string; label: string; href: string; icon: React.ComponentType<{ className?: string }>; section: string }[] = [
    ...filteredNav,
    ...(tickerResult
      ? [
          {
            id: `ticker-${tickerResult.ticker}`,
            label: `${tickerResult.ticker} — ${tickerResult.name}`,
            href: `/analyze?ticker=${encodeURIComponent(tickerResult.ticker)}`,
            icon: TrendingUp,
            section: "Ticker",
          },
        ]
      : []),
  ];

  // Search ticker when query changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.length < 1) {
      setTickerResult(null);
      setTickerLoading(false);
      return;
    }

    setTickerLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchTicker(query);
        setTickerResult({ ticker: result.ticker, name: result.name });
      } catch {
        setTickerResult(null);
      } finally {
        setTickerLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Clamp selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, tickerResult]);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setTickerResult(null);
      setSelectedIndex(0);
      // Small delay so the portal is mounted
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const selectItem = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  // Keyboard navigation inside modal
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        selectItem(items[selectedIndex].href);
      }
      return;
    }
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] animate-in fade-in duration-150"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272a]">
          <Search className="w-5 h-5 text-[#71717a] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Rechercher une page ou un ticker..."
            className="flex-1 bg-transparent text-[#e4e4e7] placeholder-[#71717a] outline-none text-sm"
          />
          <kbd className="hidden sm:inline-block text-[10px] text-[#71717a] border border-[#27272a] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {items.length === 0 && !tickerLoading && (
            <p className="px-4 py-6 text-sm text-[#71717a] text-center">
              Aucun résultat
            </p>
          )}

          {tickerLoading && items.length === 0 && (
            <p className="px-4 py-6 text-sm text-[#71717a] text-center">
              Recherche...
            </p>
          )}

          {/* Render sections */}
          {renderSection("Navigation", items, selectedIndex, selectItem)}
          {renderSection("Ticker", items, selectedIndex, selectItem)}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function renderSection(
  section: string,
  items: { id: string; label: string; href: string; icon: React.ComponentType<{ className?: string }>; section: string }[],
  selectedIndex: number,
  onSelect: (href: string) => void
) {
  const sectionItems = items.filter((item) => item.section === section);
  if (sectionItems.length === 0) return null;

  return (
    <div key={section}>
      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
        {section}
      </p>
      {sectionItems.map((item) => {
        const globalIndex = items.indexOf(item);
        const isSelected = globalIndex === selectedIndex;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors cursor-pointer ${
              isSelected
                ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                : "text-[#e4e4e7] hover:bg-[#27272a]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
