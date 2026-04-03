"use client";

import { useEffect, useSyncExternalStore } from "react";

// ── Global in-memory store ─────────────────────────────────────────────
let _globalIsPro = false;
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
 * Hook pour vérifier le statut Pro.
 * 1. Lit localStorage au montage → réponse instantanée
 * 2. Vérifie avec le serveur (GET /api/db/user) → confirmation
 */
export function useProStatus(userId?: string): { isPro: boolean } {
  const isPro = useSyncExternalStore(
    (listener) => {
      _listeners.add(listener);
      return () => { _listeners.delete(listener); };
    },
    () => _globalIsPro,
    () => false
  );

  // Client-only : lit localStorage au montage (instantané)
  useEffect(() => {
    try {
      const flag = localStorage.getItem("ve_pro_activated");
      const at = localStorage.getItem("ve_pro_activated_at");
      const isRecent = at && (Date.now() - parseInt(at)) < 24 * 60 * 60 * 1000;
      if (flag === "true" && isRecent) {
        _setGlobal(true);
      }
    } catch {}
  }, []);

  // Vérifie avec le serveur une fois que l'user est identifié
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/db/user");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data && data.is_pro === true) {
          _setGlobal(true);
          // Persister le flag pour les prochains rechargements
          try {
            localStorage.setItem("ve_pro_activated", "true");
            if (!localStorage.getItem("ve_pro_activated_at")) {
              localStorage.setItem("ve_pro_activated_at", Date.now().toString());
            }
          } catch {}
        } else if (data && data.is_pro === false) {
          // Le serveur dit pas Pro — vérifier si le flag optimiste est encore valide
          const at = localStorage.getItem("ve_pro_activated_at");
          const isRecent = at && (Date.now() - parseInt(at)) < 5 * 60 * 1000; // 5 min de grâce
          if (!isRecent) {
            // Le flag a expiré et le serveur confirme pas Pro
            _setGlobal(false);
            try {
              localStorage.removeItem("ve_pro_activated");
              localStorage.removeItem("ve_pro_activated_at");
            } catch {}
          }
          // Sinon on garde l'optimiste 5 min le temps que le PATCH se propage
        }
      } catch {
        // Pas de connexion — on garde l'état localStorage
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { isPro };
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
