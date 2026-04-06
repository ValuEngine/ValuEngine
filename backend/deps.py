"""
Shared dependencies for all routers — auth, Supabase helpers, cache, freemium.
"""

import os
import re
import time
import logging
import threading
import httpx
import jwt
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, Request
from jwt import PyJWKClient
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("valuengine")

# ── Environment ────────────────────────────────────────────────────────────
FMP_KEY = os.environ.get("FMP_API_KEY", "")
USE_FMP = bool(FMP_KEY and FMP_KEY.strip())
ALERTS_CHECK_SECRET = os.environ.get("ALERTS_CHECK_SECRET", "")
FREE_DAILY_LIMIT = 3

# ── Rate limiter (shared instance) ────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Clerk JWT verification ────────────────────────────────────────────────
_CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")
_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client:
        return _jwks_client
    jwks_url = _CLERK_JWKS_URL
    if not jwks_url:
        return None
    _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


async def verify_clerk_token(request: Request) -> str:
    """
    Verify the Clerk JWT from the Authorization header.
    Returns the clerk user_id (sub claim) if valid.
    Raises HTTPException 401 if invalid or missing.
    """
    client = _get_jwks_client()
    if not client:
        if os.environ.get("ENVIRONMENT", "production") == "development":
            user_id = request.headers.get("X-User-Id", "")
            if user_id:
                logger.warning(f"[Auth] DEV ONLY: X-User-Id fallback used for {user_id}")
                return _safe_id(user_id)
        raise HTTPException(status_code=401, detail="Authentification requise")

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")

    token = auth_header[7:]
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        sub = payload.get("sub", "")
        if not sub:
            raise HTTPException(status_code=401, detail="Token invalide (sub manquant)")
        return sub
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError as e:
        logger.warning(f"[Auth] Token invalide: {e}")
        raise HTTPException(status_code=401, detail="Token invalide")


def _require_owner(token_user_id: str, resource_user_id: str):
    """Ensure the authenticated user owns the resource."""
    if token_user_id != resource_user_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")


# ── Input sanitization ────────────────────────────────────────────────────
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")


def _safe_id(value: str) -> str:
    """Validate and return a safe identifier for Supabase queries."""
    if not value or not _SAFE_ID_RE.match(value):
        raise HTTPException(status_code=400, detail="Identifiant invalide")
    return value


def _safe_id_internal(value: str) -> str:
    """Same as _safe_id but returns empty string instead of raising."""
    if not value or not _SAFE_ID_RE.match(value):
        return ""
    return value


# ── Supabase REST helpers ─────────────────────────────────────────────────
_SUPA_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Expose for routers that need raw access
SUPABASE_URL = _SUPA_URL
SUPABASE_KEY = _SUPA_KEY


def _sb_headers() -> dict:
    return {
        "apikey": _SUPA_KEY,
        "Authorization": f"Bearer {_SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _sb_get(table: str, params: str = "") -> list:
    if not _SUPA_URL or not _SUPA_KEY:
        return []
    url = f"{_SUPA_URL}/rest/v1/{table}?{params}"
    resp = httpx.get(url, headers=_sb_headers(), timeout=6)
    resp.raise_for_status()
    return resp.json()


def _sb_post(table: str, body: dict) -> dict:
    url = f"{_SUPA_URL}/rest/v1/{table}"
    resp = httpx.post(url, headers=_sb_headers(), json=body, timeout=6)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) else data


def _sb_patch(table: str, params: str, body: dict) -> list:
    """PATCH rows in Supabase. Returns list of updated rows."""
    if not _SUPA_URL or not _SUPA_KEY:
        logger.error(f"[Supabase] _sb_patch called but SUPA_URL/KEY missing")
        return []
    url = f"{_SUPA_URL}/rest/v1/{table}?{params}"
    resp = httpx.patch(url, headers=_sb_headers(), json=body, timeout=10)
    logger.info(f"[Supabase] PATCH {table}?{params} → status={resp.status_code} body={resp.text[:300]}")
    resp.raise_for_status()
    try:
        data = resp.json()
        return data if isinstance(data, list) else [data] if data else []
    except Exception:
        return []


def _webhook_patch_user(user_id: str, update_full: dict, update_minimal: dict) -> list:
    """
    Try to PATCH user with full payload (incl. pro_until).
    If that fails, retry with minimal payload (just is_pro).
    """
    for body_label, body in [("full", update_full), ("minimal", update_minimal)]:
        for col in ["id", "clerk_user_id"]:
            try:
                updated = _sb_patch("users", f"{col}=eq.{user_id}", body)
                if updated:
                    logger.info(f"[Patch] {col}=eq.{user_id} ({body_label}) → {len(updated)} row(s) ✓")
                    return updated
                else:
                    logger.info(f"[Patch] {col}=eq.{user_id} ({body_label}) → 0 rows (no match)")
            except Exception as e:
                logger.warning(f"[Patch] {col}=eq.{user_id} ({body_label}) → erreur: {e}")
                if body_label == "full" and ("column" in str(e).lower() or "42703" in str(e)):
                    logger.info("[Patch] Colonne manquante détectée, bascule vers payload minimal")
                    break
    return []


# ── Thread-safe TTL cache with LRU eviction ──────────────────────────────
class TTLCache:
    """Thread-safe cache with TTL and max size (LRU eviction)."""
    def __init__(self, max_size: int = 500, default_ttl: int = 1800):
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: dict = {}
        self._lock = threading.Lock()
        self._max_size = max_size
        self._default_ttl = default_ttl

    def get(self, key: str, ttl: Optional[int] = None):
        ttl = ttl or self._default_ttl
        with self._lock:
            if key not in self._cache:
                return None
            if time.time() - self._timestamps[key] > ttl:
                del self._cache[key]
                del self._timestamps[key]
                return None
            self._cache.move_to_end(key)
            return self._cache[key]

    def set(self, key: str, value):
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            self._timestamps[key] = time.time()
            while len(self._cache) > self._max_size:
                oldest = next(iter(self._cache))
                del self._cache[oldest]
                del self._timestamps[oldest]


# ── Freemium enforcement helpers ──────────────────────────────────────────
_pro_cache = None


def _get_today_analysis_count(user_id: str) -> int:
    """Count how many analyses a user has run today (UTC)."""
    user_id = _safe_id_internal(user_id)
    if not _SUPA_URL or not _SUPA_KEY or not user_id:
        return 0
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00+00:00")
    try:
        rows = _sb_get(
            "analyses",
            f"user_id=eq.{user_id}&created_at=gte.{today_start}&select=id",
        )
        return len(rows)
    except Exception as e:
        logger.error(f"[Freemium] Error counting analyses: {e}")
        return 0


def _is_user_pro(user_id: str) -> bool:
    """Check whether a user has an active Pro subscription (cached 60s)."""
    global _pro_cache
    user_id = _safe_id_internal(user_id)
    if not _SUPA_URL or not _SUPA_KEY or not user_id:
        return False

    if _pro_cache is None:
        _pro_cache = TTLCache(max_size=200, default_ttl=60)

    cached = _pro_cache.get(f"pro:{user_id}")
    if cached is not None:
        return cached

    try:
        rows = _sb_get("users", f"id=eq.{user_id}&select=is_pro,pro_until")
        if not rows:
            rows = _sb_get("users", f"clerk_user_id=eq.{user_id}&select=is_pro,pro_until")
        if not rows:
            _pro_cache.set(f"pro:{user_id}", False)
            return False
        user = rows[0]
        is_pro = False
        if user.get("is_pro"):
            is_pro = True
        elif user.get("pro_until"):
            is_pro = datetime.fromisoformat(user["pro_until"].replace("Z", "+00:00")) > datetime.now(timezone.utc)
        _pro_cache.set(f"pro:{user_id}", is_pro)
        return is_pro
    except Exception as e:
        logger.error(f"[Freemium] Error checking pro status: {e}")
        return False
