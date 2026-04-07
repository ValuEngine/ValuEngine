"""
Backtest endpoints — "What if I had bought..." simulator.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request

from deps import limiter, verify_clerk_token
from services.backtest import run_backtest

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.post("/api/backtest")
@limiter.limit("10/minute")
async def backtest(request: Request):
    """
    Run a backtest simulation.
    Body: { ticker, buy_date (YYYY-MM-DD), amount, sell_date? }
    """
    await verify_clerk_token(request)

    try:
        body = await request.json()
        ticker = (body.get("ticker") or "").strip().upper()
        buy_date = (body.get("buy_date") or "").strip()
        amount = float(body.get("amount", 0))
        sell_date = body.get("sell_date", None)
    except Exception:
        raise HTTPException(status_code=400, detail="Parametres invalides")

    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Ticker invalide (max 10 caracteres)")

    if not buy_date:
        raise HTTPException(status_code=400, detail="Date d'achat requise (YYYY-MM-DD)")

    if amount <= 0 or amount > 10_000_000:
        raise HTTPException(status_code=400, detail="Montant invalide (1 - 10M)")

    result = run_backtest(ticker, buy_date, amount, sell_date)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
