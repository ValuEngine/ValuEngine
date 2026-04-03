"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_PREFIX = "ve_pro_";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ACTIVATED_KEY = "ve_pro_activated"; // optimistic flag set by success page

interface CachedPro {
  isPro: boolean;
  ts: number;
}

/**
 * Hook serveur-side pour vérifier le statut Pro.
 * Supporte l'activation optimiste : si activateProNow() a été appelé,
 * le hook retourne isPro=true immédiatement sans attendre le serveur.
 */
export function useProStatus(userId: string | undefined): { isPro: boolean; loading: boolean } {
  const [isPro, setIsPro] = useState(() => {
    // Optimistic: check if just activated (set by success page)
    if (typeof window === "undefined") return false;
    try {
      const activated = localStorage.getItem(ACTIVATED_KEY);
      if (activated) {
        const ts = parseInt(activated);
        // Valid for 1 hour — enough time for server to catch up
        if (Date.now() - ts < 60 * 60 * 1000) return true;
        localStorage.removeItem(ACTIVATED_KEY);
      }
    } catch {}
    return false;
  });
  const [loading, setLoading] = useState(!isPro); // skip loading if optimistic

  useEffect(() => {
    if (!userId) {
      // Don't override optimistic true if no userId yet (clerk still loading)
      if (!isPro) {
        setIsPro(false);
        setLoading(false);
      }
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
          // If cache says false but optimistic says true, keep true and refetch
          if (!cached.isPro && isPro) {
            // Don't return — fall through to server check
          } else {
            return;
          }
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
          const serverPro = !!data.is_pro;
          setIsPro(serverPro);
          setLoading(false);
          localStorage.setItem(cacheKey, JSON.stringify({
            isPro: serverPro,
            ts: Date.now(),
          }));
          // If server confirms pro, we can remove the optimistic flag
          if (serverPro) {
            localStorage.removeItem(ACTIVATED_KEY);
          }
        }
      } catch {
        if (!cancelled) {
          // On error, keep optimistic value if set
          if (!isPro) setIsPro(false);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { isPro, loading };
}

/**
 * Called by success page after payment confirmation.
 * Sets an optimistic flag so the badge shows immediately everywhere.
 */
export function activateProNow(): void {
  try {
    localStorage.setItem(ACTIVATED_KEY, Date.now().toString());
    // Also clear any cached "false" values
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/** Force-refresh the pro status cache. */
export function invalidateProCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/** Check if Pro was just activated (for showing welcome modal). */
export function wasProJustActivated(): boolean {
  try {
    const activated = localStorage.getItem(ACTIVATED_KEY);
    if (activated) {
      const ts = parseInt(activated);
      return Date.now() - ts < 60 * 60 * 1000;
    }
  } catch {}
  return false;
}
