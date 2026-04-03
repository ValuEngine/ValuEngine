"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_PREFIX = "ve_pro_";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedPro {
  isPro: boolean;
  ts: number;
}

/**
 * Hook serveur-side pour vérifier le statut Pro.
 * Interroge GET /api/user/pro-status/:userId avec cache 5 min par utilisateur.
 */
export function useProStatus(userId: string | undefined): { isPro: boolean; loading: boolean } {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    const cacheKey = `${CACHE_PREFIX}${userId}`;

    // Check localStorage cache
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached: CachedPro = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL) {
          setIsPro(cached.isPro);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    // Fetch from server
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user/pro-status/${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) {
          setIsPro(!!data.is_pro);
          setLoading(false);
          localStorage.setItem(cacheKey, JSON.stringify({
            isPro: !!data.is_pro,
            ts: Date.now(),
          }));
        }
      } catch {
        if (!cancelled) {
          setIsPro(false);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { isPro, loading };
}

/** Force-refresh the pro status cache (call after payment success). */
export function invalidateProCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
