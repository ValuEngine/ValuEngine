"""
Earnings Calendar endpoints.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request

from deps import limiter, verify_clerk_token
from services.earnings_calendar import get_earnings_calendar, get_earnings_for_ticker

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.post("/api/earnings/calendar")
@limiter.limit("10/minute")
async def earnings_calendar(request: Request):
    """
    Get upcoming earnings calendar.
    Body: { tickers?: string[], days_ahead?: number }
    """
    await verify_clerk_token(request)

    try:
        body = await request.json()
        tickers = body.get("tickers", [])
        days_ahead = min(int(body.get("days_ahead", 30)), 90)
    except Exception:
        tickers = []
        days_ahead = 30

    result = get_earnings_calendar(tickers=tickers or None, days_ahead=days_ahead)
    return result


@router.get("/api/earnings/{ticker}")
@limiter.limit("15/minute")
async def earnings_ticker(ticker: str, request: Request):
    """Get next earnings date for a specific ticker."""
    await verify_clerk_token(request)

    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Ticker invalide")

    result = get_earnings_for_ticker(ticker.upper().strip())
    if not result:
        return {"symbol": ticker.upper(), "date": None, "message": "Aucune date de resultats trouvee"}
    return result
