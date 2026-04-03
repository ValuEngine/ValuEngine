"use client";

import { useEffect, useSyncExternalStore } from "react";

// ── Global in-memory store ─────────────────────────────────────────────
let _globalIsPro = false;
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Called by success page after payment.
 * Sets optimistic Pro flag + updates ALL mounted components instantly.
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
 * Hook pour vérifier le statut Pro.
 * useSyncExternalStore → pas de bug SSR, état partagé entre tous les composants.
 */
export function useProStatus(userId?: string): { isPro: boolean } {
  const isPro = useSyncExternalStore(
    (listener) => {
      _listeners.add(listener);
      return () => { _listeners.delete(listener); };
    },
    () => _globalIsPro,
    () => false // getServerSnapshot → toujours false, pas de hydration mismatch
  );

  // Client-only : lit localStorage au montage pour les rechargements de page
  useEffect(() => {
    const flag = localStorage.getItem("ve_pro_activated");
    const activatedAt = localStorage.getItem("ve_pro_activated_at");
    const isRecent =
      activatedAt && Date.now() - parseInt(activatedAt) < 24 * 60 * 60 * 1000;

    if (flag === "true" && isRecent) {
      _globalIsPro = true;
      _notify();
    }
  }, []);

  return { isPro };
}

/** Check if Pro was just activated (for showing welcome modal). */
export function shouldShowProWelcome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seen = localStorage.getItem("ve_pro_welcome_seen");
    if (seen) return false;
    const flag = localStorage.getItem("ve_pro_activated");
    const activatedAt = localStorage.getItem("ve_pro_activated_at");
    const isRecent =
      activatedAt && Date.now() - parseInt(activatedAt) < 60 * 60 * 1000;
    return flag === "true" && !!isRecent;
  } catch {}
  return false;
}
