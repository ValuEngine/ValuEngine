"""
Alerts endpoints — CRUD + cron check.
"""

import logging
from fastapi import APIRouter, HTTPException, Request
import httpx
import yfinance as yf

from deps import (
    limiter, verify_clerk_token, _require_owner, _safe_id,
    _sb_get, _sb_post, _sb_patch, ALERTS_CHECK_SECRET, USE_FMP, FMP_KEY,
)
from models import AlertRequest
from services.email_service import send_alert_email

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.post("/api/alerts")
@limiter.limit("10/minute")
async def create_alert(request: Request, body: AlertRequest):
    token_user_id = await verify_clerk_token(request)
    _require_owner(token_user_id, body.clerk_user_id)

    ticker = body.ticker.upper().strip()
    try:
        record = _sb_post("alerts", {
            "user_id":      body.clerk_user_id,
            "email":        body.email,
            "ticker":       ticker,
            "ticker_name":  body.ticker_name or ticker,
            "target_price": body.target_price,
            "condition":    body.direction,
            "active":       True,
            "is_triggered": False,
        })
        return record
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/alerts/{clerk_user_id}")
async def get_alerts(clerk_user_id: str, request: Request):
    token_user_id = await verify_clerk_token(request)
    clerk_user_id = _safe_id(clerk_user_id)
    _require_owner(token_user_id, clerk_user_id)
    try:
        alerts = _sb_get(
            "alerts",
            f"user_id=eq.{clerk_user_id}&active=eq.true&order=created_at.desc"
        )
        return alerts
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: str, request: Request):
    token_user_id = await verify_clerk_token(request)
    alert_id = _safe_id(alert_id)
    try:
        rows = _sb_get("alerts", f"id=eq.{alert_id}&select=user_id")
        if rows and rows[0].get("user_id") != token_user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
    except HTTPException:
        raise
    except Exception:
        pass
    try:
        _sb_patch("alerts", f"id=eq.{alert_id}", {"active": False})
        return {"ok": True}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/api/alerts/check")
def check_alerts(request: Request):
    """Endpoint interne : vérifie toutes les alertes actives et envoie les emails."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    try:
        alerts = _sb_get("alerts", "active=eq.true&is_triggered=eq.false")
    except Exception as e:
        logger.error(f"Supabase error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

    if not alerts:
        return {"checked": 0, "triggered": 0}

    unique_tickers = list({a["ticker"] for a in alerts})
    price_map: dict = {}

    if USE_FMP:
        try:
            joined = ",".join(unique_tickers)
            url = f"https://financialmodelingprep.com/stable/batch-quote?symbol={joined}&apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=8)
            resp.raise_for_status()
            for q in resp.json():
                price_map[q.get("symbol", "")] = float(q.get("price") or 0)
        except Exception:
            pass
    else:
        for sym in unique_tickers:
            try:
                fi = yf.Ticker(sym).fast_info
                price_map[sym] = float(getattr(fi, "last_price", 0) or 0)
            except Exception:
                pass

    triggered = 0
    MAX_EMAILS_PER_RUN = 50
    for alert in alerts:
        if triggered >= MAX_EMAILS_PER_RUN:
            logger.warning(f"[alerts/check] Limite de {MAX_EMAILS_PER_RUN} emails atteinte, arrêt")
            break

        ticker       = alert.get("ticker", "")
        current      = price_map.get(ticker, 0)
        target       = float(alert.get("target_price") or 0)
        direction    = alert.get("condition", "above")
        email        = alert.get("email", "")
        ticker_name  = alert.get("ticker_name") or ticker
        alert_id_val = alert.get("id", "")

        if current <= 0 or target <= 0:
            continue

        fired = (direction == "above" and current >= target) or \
                (direction == "below" and current <= target)

        if fired:
            if email:
                send_alert_email(
                    to=email, ticker=ticker, ticker_name=ticker_name,
                    target_price=target, current_price=current, direction=direction,
                )
            try:
                _sb_patch("alerts", f"id=eq.{alert_id_val}", {
                    "active": False,
                    "is_triggered": True,
                })
            except Exception:
                pass
            triggered += 1

    return {"checked": len(alerts), "triggered": triggered}
