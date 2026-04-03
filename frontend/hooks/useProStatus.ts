"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_PREFIX = "ve_pro_";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ACTIVATED_KEY = "ve_pro_activated";

// ── Global in-memory store (survives across components, not SSR) ──────
let _globalIsPro = false;
let _listeners: Array<() => void> = [];

function _notify() {
  _listeners.forEach((l) => l());
}

function _subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function _getSnapshot() {
  return _globalIsPro;
}

function _getServerSnapshot() {
  return false;
}

function _setGlobalPro(value: boolean) {
  if (_globalIsPro !== value) {
    _globalIsPro = value;
    _notify();
  }
}

/**
 * Hook pour vérifier le statut Pro.
 * Utilise useSyncExternalStore pour un état global partagé entre tous les composants.
 * Supporte l'activation optimiste via activateProNow().
 */
export function useProStatus(userId: string | undefined): {
  isPro: boolean;
  loading: boolean;
} {
  const isPro = useSyncExternalStore(_subscribe, _getSnapshot, _getServerSnapshot);
  const [loading, setLoading] = useState(true);

  // On mount (client only): check optimistic activation flag
  useEffect(() => {
    try {
      const activated = localStorage.getItem(ACTIVATED_KEY);
      if (activated) {
        const ts = parseInt(activated);
        if (Date.now() - ts < 60 * 60 * 1000) {
          _setGlobalPro(true);
          setLoading(false);
        } else {
          localStorage.removeItem(ACTIVATED_KEY);
        }
      }
    } catch {}
  }, []);

  // Fetch from server when userId is available
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const cacheKey = `${CACHE_PREFIX}${userId}`;

    // Check localStorage cache
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL) {
          if (cached.isPro) _setGlobalPro(true);
          // If cache says false but optimistic flag is set, don't override — just refetch
          if (!cached.isPro && _globalIsPro) {
            // Fall through to server fetch
          } else {
            setLoading(false);
            return;
          }
        }
      }
    } catch {}

    // Fetch from server
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/user/pro-status/${encodeURIComponent(userId)}`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) {
          const serverPro = !!data.is_pro;
          // If server says pro, update global. If server says false but optimistic is set, keep optimistic.
          if (serverPro) {
            _setGlobalPro(true);
            localStorage.removeItem(ACTIVATED_KEY);
          }
          // Only set to false if there's no optimistic flag
          if (!serverPro && !localStorage.getItem(ACTIVATED_KEY)) {
            _setGlobalPro(false);
          }
          setLoading(false);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ isPro: serverPro, ts: Date.now() })
          );
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { isPro, loading };
}

/**
 * Called by success page after payment. Sets optimistic Pro flag
 * and immediately updates all mounted components.
 */
export function activateProNow(): void {
  try {
    localStorage.setItem(ACTIVATED_KEY, Date.now().toString());
    // Clear stale caches
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
  // Immediately update all components using the hook
  _setGlobalPro(true);
}

/** Force-refresh the pro status cache. */
export function invalidateProCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/** Check if Pro was just activated (for showing welcome modal). */
export function wasProJustActivated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const activated = localStorage.getItem(ACTIVATED_KEY);
    if (activated) {
      const ts = parseInt(activated);
      return Date.now() - ts < 60 * 60 * 1000;
    }
  } catch {}
  return false;
}
