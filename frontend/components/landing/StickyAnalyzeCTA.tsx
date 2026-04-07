"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gtmEvents } from "@/lib/analytics";

export default function StickyAnalyzeCTA() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => { gtmEvents.ctaClicked('sticky_analyze'); router.push("/analyze"); }}
      className="btn-primary fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-bold px-4 py-2 sm:px-5 sm:py-3 rounded-xl shadow-lg transition-all hover:scale-105 text-xs sm:text-sm"
    >
      Analyser une action &rarr;
    </button>
  );
}
