"""
Track Record endpoints — AI performance verification.
Provides aggregate stats on AI verdict accuracy.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Request

from deps import limiter, _sb_get

logger = logging.getLogger("valuengine")

router = APIRouter()


@router.get("/api/track-record/stats")
@limiter.limit("15/minute")
async def track_record_stats(request: Request):
    """
    Public endpoint: aggregate AI track record statistics.
    Returns win rate, average performance, by-verdict breakdown.
    """
    try:
        rows = _sb_get(
            "analyses",
            "select=verdict,performance_pct,price_at_analysis,price,price_now&not.verdict=is.null&order=created_at.desc&limit=200"
        )
    except Exception as e:
        logger.error(f"[TrackRecord] DB error: {e}")
        rows = []

    if not rows:
        return _default_stats()

    # Filter rows with performance data
    scored = []
    for r in rows:
        perf = r.get("performance_pct")
        verdict = r.get("verdict", "")
        if perf is not None and verdict in ("BUY", "SELL", "HOLD"):
            scored.append({"verdict": verdict, "perf": float(perf)})

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

    return {
        "total_analyses": total,
        "wins": wins,
        "win_rate": win_rate,
        "avg_performance": avg_perf,
        "by_verdict": by_verdict,
        "is_verified": True,
    }


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
