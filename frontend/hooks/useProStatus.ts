"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// ── Global in-memory store ─────────────────────────────────────────────
let _globalIsPro: boolean | null = null; // null = not yet resolved
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _setGlobal(value: boolean) {
  if (_globalIsPro !== value) {
    _globalIsPro = value;
    _notify();
  }
}

// Track if a server fetch is already in progress (dedup)
let _fetchPromise: Promise<void> | null = null;

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Called by success page after payment.
 * Immediately updates all mounted components + sets localStorage flag.
 */
export function activateProNow(): void {
  _globalIsPro = true;
  try {
    localStorage.setItem("ve_pro_activated", "true");
    localStorage.setItem("ve_pro_activated_at", Date.now().toString());
  } catch {}
  _notify();
}

/**
 * Fetch pro status from the server (Supabase via Next.js API route).
 * Deduplicates concurrent calls. Updates global store.
 */
async function _fetchProFromServer(): Promise<void> {
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const res = await fetch("/api/db/user");
      if (!res.ok) return;
      const data = await res.json();

      if (data && data.is_pro === true) {
        _setGlobal(true);
        // Persist flag for instant load next time
        try {
          localStorage.setItem("ve_pro_activated", "true");
          if (!localStorage.getItem("ve_pro_activated_at")) {
            localStorage.setItem("ve_pro_activated_at", Date.now().toString());
          }
        } catch {}
      } else if (data && data.is_pro === false) {
        // Server says not Pro — check if we have a very recent optimistic flag (5min grace)
        const at = localStorage.getItem("ve_pro_activated_at");
        const isRecent = at && (Date.now() - parseInt(at)) < 5 * 60 * 1000;
        if (!isRecent) {
          _setGlobal(false);
          try {
            localStorage.removeItem("ve_pro_activated");
            localStorage.removeItem("ve_pro_activated_at");
          } catch {}
        }
        // Else: keep optimistic for 5 min (PATCH may still be propagating)
      }
    } catch {
      // Network error — keep current state
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

/**
 * Hook pour vérifier le statut Pro.
 *
 * FLOW:
 * 1. useSyncExternalStore reads _globalIsPro (safe for SSR: returns false)
 * 2. On mount (client-only useEffect):
 *    a. Read localStorage for instant response (no flash)
 *    b. Fetch from server (GET /api/db/user) — THE source of truth
 * 3. After logout/re-login: userId changes → triggers new server fetch
 *    → isPro restored from Supabase, not just localStorage
 */
export function useProStatus(userId?: string): { isPro: boolean; loading: boolean } {
  const storeValue = useSyncExternalStore(
    (listener) => {
      _listeners.add(listener);
      return () => { _listeners.delete(listener); };
    },
    () => _globalIsPro,
    () => null as boolean | null // SSR: null (unknown)
  );

  const [loading, setLoading] = useState(_globalIsPro === null);

  // Step 1: Client-only — read localStorage for instant display (no flash)
  useEffect(() => {
    if (_globalIsPro !== null) return; // Already resolved
    try {
      const flag = localStorage.getItem("ve_pro_activated");
      const at = localStorage.getItem("ve_pro_activated_at");
      const isRecent = at && (Date.now() - parseInt(at)) < 24 * 60 * 60 * 1000;
      if (flag === "true" && isRecent) {
        _setGlobal(true);
      }
    } catch {}
  }, []);

  // Step 2: Fetch from server when userId is available (THE source of truth)
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      await _fetchProFromServer();
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // If no userId yet and no localStorage, resolve to false
  useEffect(() => {
    if (!userId && _globalIsPro === null) {
      // No user = definitely not pro
      const timer = setTimeout(() => {
        if (_globalIsPro === null) {
          _setGlobal(false);
          setLoading(false);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  return { isPro: storeValue === true, loading };
}

/** Check if Pro was just activated (for showing welcome modal). */
export function shouldShowProWelcome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seen = localStorage.getItem("ve_pro_welcome_seen");
    if (seen) return false;
    const flag = localStorage.getItem("ve_pro_activated");
    const at = localStorage.getItem("ve_pro_activated_at");
    const isRecent = at && (Date.now() - parseInt(at)) < 60 * 60 * 1000;
    return flag === "true" && !!isRecent;
  } catch {}
  return false;
}

/** Force a fresh check from the server. Useful after payment flow. */
export function refreshProStatus(): Promise<void> {
  _fetchPromise = null; // Clear dedup lock
  return _fetchProFromServer();
}
