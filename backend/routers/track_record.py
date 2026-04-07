"""
Track Record endpoints — AI performance verification.
Provides aggregate stats on AI verdict accuracy with live price updates.
"""
from __future__ import annotations

import os
import time
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Request

from deps import limiter, _sb_get, _sb_patch

logger = logging.getLogger("valuengine")

router = APIRouter()

# ── Cache ────────────────────────────────────────────────────────────────
_stats_cache: dict = {}
_CACHE_TTL = 300  # 5 min

FMP_KEY = os.environ.get("FMP_API_KEY", "")


def _fetch_live_prices(tickers: list[str]) -> dict[str, float]:
    """Batch fetch live prices via FMP."""
    if not tickers or not FMP_KEY:
        return {}
    try:
        joined = ",".join(tickers[:30])
        url = f"https://financialmodelingprep.com/stable/batch-quote?symbol={joined}&apikey={FMP_KEY}"
        resp = httpx.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        return {q["symbol"]: q["price"] for q in data if q.get("price")}
    except Exception as e:
        logger.warning(f"[TrackRecord] Live price fetch failed: {e}")
        return {}


@router.get("/api/track-record/stats")
@limiter.limit("15/minute")
async def track_record_stats(request: Request):
    """
    Public endpoint: aggregate AI track record statistics.
    Fetches live prices to recalculate performance in real time.
    """
    now = time.time()
    if _stats_cache.get("ts") and (now - _stats_cache["ts"]) < _CACHE_TTL:
        return _stats_cache["data"]

    try:
        rows = _sb_get(
            "analyses",
            "select=id,ticker,ticker_name,company_name,verdict,price_at_analysis,price,price_now,performance_pct,created_at"
            "&not.verdict=is.null&order=created_at.desc&limit=200"
        )
    except Exception as e:
        logger.error(f"[TrackRecord] DB error: {e}")
        rows = []

    if not rows:
        return _default_stats()

    # Collect tickers that have entry prices for live update
    tickers_with_prices = set()
    for r in rows:
        entry_price = r.get("price_at_analysis") or r.get("price")
        if entry_price and r.get("ticker"):
            tickers_with_prices.add(r["ticker"])

    # Fetch live prices
    price_map = _fetch_live_prices(list(tickers_with_prices))

    # Recalculate performance with live prices + build scored list
    scored = []
    updates_batch = []

    for r in rows:
        verdict = r.get("verdict", "")
        if verdict not in ("BUY", "SELL", "HOLD"):
            continue

        entry_price = r.get("price_at_analysis") or r.get("price")
        if not entry_price or entry_price <= 0:
            continue

        # Use live price > stored price_now > skip
        live_price = price_map.get(r.get("ticker", ""))
        current_price = live_price or r.get("price_now")

        if current_price and current_price > 0:
            perf = round((current_price - entry_price) / entry_price * 100, 2)

            # Queue update if we got a live price
            if live_price:
                updates_batch.append({
                    "id": r["id"],
                    "price_now": live_price,
                    "performance_pct": perf,
                })

            scored.append({"verdict": verdict, "perf": perf, "ticker": r.get("ticker", "")})
        elif r.get("performance_pct") is not None:
            scored.append({"verdict": verdict, "perf": float(r["performance_pct"]), "ticker": r.get("ticker", "")})

    # Fire-and-forget: update prices in DB
    for upd in updates_batch[:20]:  # Limit batch size
        try:
            _sb_patch("analyses", f"id=eq.{upd['id']}", {
                "price_now": upd["price_now"],
                "performance_pct": upd["performance_pct"],
            })
        except Exception:
            pass

    if not scored:
        return _default_stats()

    # Overall stats
    total = len(scored)
    wins = sum(1 for s in scored if _is_win(s["verdict"], s["perf"]))
    win_rate = round(wins / total * 100, 1) if total > 0 else 0
    avg_perf = round(sum(s["perf"] for s in scored) / total, 2) if total > 0 else 0

    # By verdict breakdown
    by_verdict = {}
    for verdict in ("BUY", "SELL", "HOLD"):
        subset = [s for s in scored if s["verdict"] == verdict]
        if subset:
            v_wins = sum(1 for s in subset if _is_win(s["verdict"], s["perf"]))
            by_verdict[verdict] = {
                "count": len(subset),
                "wins": v_wins,
                "win_rate": round(v_wins / len(subset) * 100, 1),
                "avg_performance": round(sum(s["perf"] for s in subset) / len(subset), 2),
            }

    result = {
        "total_analyses": total,
        "wins": wins,
        "win_rate": win_rate,
        "avg_performance": avg_perf,
        "by_verdict": by_verdict,
        "is_verified": True,
    }

    _stats_cache["data"] = result
    _stats_cache["ts"] = now
    return result


@router.get("/api/track-record/entries")
@limiter.limit("15/minute")
async def track_record_entries(request: Request):
    """
    Public endpoint: returns individual track record entries with live performance.
    Used by the Track Record page and landing preview widget.
    """
    try:
        rows = _sb_get(
            "analyses",
            "select=id,ticker,ticker_name,company_name,verdict,price_at_analysis,price,price_now,performance_pct,created_at"
            "&not.verdict=is.null&order=created_at.desc&limit=50"
        )
    except Exception as e:
        logger.error(f"[TrackRecord] DB error: {e}")
        return {"entries": [], "summary": _default_summary()}

    if not rows:
        return {"entries": [], "summary": _default_summary()}

    # Fetch live prices
    tickers = list({r["ticker"] for r in rows if r.get("ticker") and (r.get("price_at_analysis") or r.get("price"))})
    price_map = _fetch_live_prices(tickers)

    entries = []
    for r in rows:
        entry_price = r.get("price_at_analysis") or r.get("price")
        live_price = price_map.get(r.get("ticker", ""))
        current_price = live_price or r.get("price_now")
        perf = None

        if entry_price and entry_price > 0 and current_price and current_price > 0:
            perf = round((current_price - entry_price) / entry_price * 100, 2)

        entries.append({
            "id": r["id"],
            "ticker": r.get("ticker", ""),
            "name": r.get("ticker_name") or r.get("company_name") or r.get("ticker", ""),
            "verdict": r.get("verdict", "HOLD"),
            "price_entry": entry_price,
            "price_now": current_price,
            "performance_pct": perf,
            "created_at": r.get("created_at", ""),
        })

    # Compute summary
    scoreable = [e for e in entries if e["performance_pct"] is not None and e["verdict"] in ("BUY", "SELL", "HOLD")]
    wins = sum(1 for e in scoreable if _is_win(e["verdict"], e["performance_pct"]))
    total = len(scoreable)

    summary = {
        "total": len(entries),
        "wins": wins,
        "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
        "avg_performance": round(sum(e["performance_pct"] for e in scoreable) / total, 2) if total > 0 else 0,
    }

    return {"entries": entries, "summary": summary}


def _is_win(verdict: str, perf: float) -> bool:
    if verdict == "BUY":
        return perf > 0
    if verdict == "SELL":
        return perf < 0
    if verdict == "HOLD":
        return abs(perf) <= 10
    return False


def _default_stats() -> dict:
    return {
        "total_analyses": 0,
        "wins": 0,
        "win_rate": 0,
        "avg_performance": 0,
        "by_verdict": {},
        "is_verified": False,
    }


def _default_summary() -> dict:
    return {"total": 0, "wins": 0, "win_rate": 0, "avg_performance": 0}
