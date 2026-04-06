"""
User endpoints — welcome, referral, onboarding, usage, pro status, email scheduler, stats.
"""

import logging
import time as _time
from fastapi import APIRouter, HTTPException, Request
import httpx

from deps import (
    limiter, verify_clerk_token, _require_owner, _safe_id,
    _sb_get, _sb_patch, _is_user_pro, _get_today_analysis_count,
    ALERTS_CHECK_SECRET, FREE_DAILY_LIMIT, SUPABASE_URL, SUPABASE_KEY,
)
from models import WelcomeRequest
from services.email_service import send_welcome_email

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.post("/api/user/welcome")
@limiter.limit("5/minute")
async def user_welcome(request: Request):
    """Envoie un email de bienvenue à un nouvel utilisateur."""
    await verify_clerk_token(request)
    try:
        body = await request.json()
        welcome_req = WelcomeRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="email et first_name requis")
    email = welcome_req.email
    first_name = welcome_req.first_name

    ok = send_welcome_email(to=email, first_name=first_name)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")
    return {"ok": True}


@router.get("/api/referral/{clerk_user_id}")
async def get_referral(clerk_user_id: str, request: Request):
    """Compte le nombre de filleuls d'un utilisateur."""
    token_user_id = await verify_clerk_token(request)
    clerk_user_id = _safe_id(clerk_user_id)
    _require_owner(token_user_id, clerk_user_id)
    try:
        rows = _sb_get("users", f"referred_by=eq.{clerk_user_id}&select=id")
        count = len(rows)
        return {"count": count, "reward_eligible": count >= 3}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/user/onboarding-status/{user_id}")
@limiter.limit("15/minute")
async def get_onboarding_status(user_id: str, request: Request):
    """Retourne le statut onboarding d'un utilisateur."""
    token_user_id = await verify_clerk_token(request)
    user_id = _safe_id(user_id)
    _require_owner(token_user_id, user_id)
    try:
        rows = _sb_get("users", f"clerk_user_id=eq.{user_id}&select=onboarding_completed,onboarding_step")
        if not rows:
            rows = _sb_get("users", f"id=eq.{user_id}&select=onboarding_completed,onboarding_step")
        if not rows:
            return {"completed": False, "step": 0}
        row = rows[0]
        return {
            "completed": row.get("onboarding_completed", False) or False,
            "step": row.get("onboarding_step", 0) or 0,
        }
    except Exception as e:
        logger.error(f"[Onboarding] status error: {e}")
        return {"completed": False, "step": 0}


@router.post("/api/user/onboarding-complete/{user_id}")
@limiter.limit("5/minute")
async def complete_onboarding(user_id: str, request: Request):
    """Marque l'onboarding comme terminé."""
    token_user_id = await verify_clerk_token(request)
    user_id = _safe_id(user_id)
    _require_owner(token_user_id, user_id)
    try:
        updated = _sb_patch("users", f"clerk_user_id=eq.{user_id}", {
            "onboarding_completed": True,
            "onboarding_step": 4,
        })
        if not updated:
            _sb_patch("users", f"id=eq.{user_id}", {
                "onboarding_completed": True,
                "onboarding_step": 4,
            })
        return {"ok": True}
    except Exception as e:
        logger.error(f"[Onboarding] complete error: {e}")
        return {"ok": True}


# ── Public stats (cached) ────────────────────────────────────────────────
_users_count_cache: dict = {"count": 0, "ts": 0}


@router.get("/api/stats/users-count")
@limiter.limit("30/minute")
async def get_users_count(request: Request):
    """Retourne le nombre total d'utilisateurs inscrits. Public, cache 1h."""
    now = _time.time()
    if now - _users_count_cache["ts"] < 3600 and _users_count_cache["count"] > 0:
        return {"count": _users_count_cache["count"]}
    try:
        url = f"{SUPABASE_URL}/rest/v1/users?select=id"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Prefer": "count=exact",
            "Range": "0-0",
        }
        r = httpx.get(url, headers=headers, timeout=10)
        content_range = r.headers.get("content-range", "")
        total = int(content_range.split("/")[-1]) if "/" in content_range else 0
        _users_count_cache["count"] = total
        _users_count_cache["ts"] = now
        return {"count": total}
    except Exception as e:
        logger.error(f"[Stats] users-count error: {e}")
        return {"count": _users_count_cache.get("count", 0)}


@router.post("/api/email/trigger-sequence")
async def trigger_email_sequence(request: Request):
    """Endpoint interne : envoie les emails D+3, D+7, D+30 aux utilisateurs éligibles."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    try:
        from services.email_scheduler import run_email_sequences
        results = run_email_sequences()
        return {"status": "ok", "results": results}
    except Exception as e:
        logger.error(f"[EmailScheduler] Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi des emails")


@router.post("/api/email/trigger-weekly-digest")
async def trigger_weekly_digest(request: Request):
    """Endpoint interne : envoie le digest hebdomadaire à tous les utilisateurs."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    try:
        from services.email_scheduler import run_weekly_digest
        results = run_weekly_digest()
        return {"status": "ok", "results": results}
    except Exception as e:
        logger.error(f"[WeeklyDigest] Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi du digest")


@router.get("/api/usage/{user_id}")
@limiter.limit("15/minute")
async def get_usage(user_id: str, request: Request):
    """Retourne l'usage quotidien et le statut Pro d'un utilisateur."""
    token_user_id = await verify_clerk_token(request)
    user_id = _safe_id(user_id)
    _require_owner(token_user_id, user_id)
    is_pro = _is_user_pro(user_id)
    used = _get_today_analysis_count(user_id)
    return {
        "used": used,
        "limit": FREE_DAILY_LIMIT,
        "is_pro": is_pro,
    }


@router.get("/api/user/pro-status/{user_id}")
@limiter.limit("15/minute")
async def get_pro_status(user_id: str, request: Request):
    """Retourne le statut Pro vérifié côté serveur via Supabase."""
    token_user_id = await verify_clerk_token(request)
    user_id = _safe_id(user_id)
    _require_owner(token_user_id, user_id)
    is_pro = _is_user_pro(user_id)
    return {"is_pro": is_pro}
