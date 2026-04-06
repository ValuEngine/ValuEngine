"""
Admin endpoints — FMP diagnostics, shared analysis.
"""

import logging
from fastapi import APIRouter, HTTPException, Request

from deps import ALERTS_CHECK_SECRET, _safe_id, _sb_get
from services.fmp_data import test_fmp_endpoints, get_fmp_call_count
from services.ai_cost_tracker import get_cost_summary

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.get("/api/admin/fmp-endpoints-status")
async def admin_fmp_status(request: Request):
    """Test which FMP endpoints are accessible (protected by internal secret)."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    return test_fmp_endpoints()


@router.get("/api/admin/fmp-usage")
async def admin_fmp_usage(request: Request):
    """Return current FMP API call count (protected by internal secret)."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    return get_fmp_call_count()


@router.get("/api/admin/ai-costs")
async def admin_ai_costs(request: Request):
    """Return AI cost summary (protected by internal secret)."""
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    return get_cost_summary()


@router.get("/api/analyse/{share_id}")
def get_shared_analysis(share_id: str):
    """Retourne une analyse publique par son share_id (pas d'auth requise)."""
    share_id = _safe_id(share_id)
    try:
        rows = _sb_get(
            "analyses",
            f"share_id=eq.{share_id}&select=ticker,company_name,verdict,price,intrinsic_value,upside_pct,created_at&limit=1"
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Analyse introuvable")
        return rows[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
