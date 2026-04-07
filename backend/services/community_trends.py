"""
ValuEngine — Community Trends
Anonymous aggregated data: most analyzed tickers, trending positions, community stats.
"""
from __future__ import annotations

import logging
from typing import Dict, List

from deps import _sb_get, SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("valuengine")


def get_community_trends() -> Dict:
    """
    Fetch community trends from Supabase:
    - Top analyzed tickers (from analyses table)
    - Most held positions (from portfolio_positions table)
    - Community stats (total users, analyses, positions)
    """
    top_analyzed = _get_top_analyzed()
    top_held = _get_top_held()
    stats = _get_community_stats()

    return {
        "top_analyzed": top_analyzed,
        "top_held": top_held,
        "stats": stats,
    }


def _get_top_analyzed() -> List[Dict]:
    """Get most analyzed tickers in the last 7 days."""
    try:
        # Fetch recent analyses and count by ticker
        rows = _sb_get(
            "analyses",
            "select=ticker&order=created_at.desc&limit=500"
        )
        if not rows:
            return []

        # Count occurrences
        counts: Dict[str, int] = {}
        for row in rows:
            ticker = row.get("ticker", "").upper()
            if ticker:
                counts[ticker] = counts.get(ticker, 0) + 1

        # Sort by count and return top 10
        sorted_tickers = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:10]
        return [{"ticker": t, "count": c, "rank": i + 1} for i, (t, c) in enumerate(sorted_tickers)]

    except Exception as e:
        logger.warning(f"[CommunityTrends] top analyzed error: {e}")
        return []


def _get_top_held() -> List[Dict]:
    """Get most commonly held positions across all portfolios."""
    try:
        rows = _sb_get(
            "portfolio_positions",
            "select=ticker&limit=1000"
        )
        if not rows:
            return []

        counts: Dict[str, int] = {}
        for row in rows:
            ticker = row.get("ticker", "").upper()
            if ticker:
                counts[ticker] = counts.get(ticker, 0) + 1

        sorted_tickers = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:10]
        return [{"ticker": t, "holders": c, "rank": i + 1} for i, (t, c) in enumerate(sorted_tickers)]

    except Exception as e:
        logger.warning(f"[CommunityTrends] top held error: {e}")
        return []


def _get_community_stats() -> Dict:
    """Get aggregate community statistics."""
    import httpx

    stats = {
        "total_users": 0,
        "total_analyses": 0,
        "total_positions": 0,
    }

    try:
        # Count users
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Prefer": "count=exact",
            "Range": "0-0",
        }

        for table, key in [("users", "total_users"), ("analyses", "total_analyses"), ("portfolio_positions", "total_positions")]:
            try:
                r = httpx.get(f"{SUPABASE_URL}/rest/v1/{table}?select=id", headers=headers, timeout=5)
                content_range = r.headers.get("content-range", "")
                if "/" in content_range:
                    stats[key] = int(content_range.split("/")[-1])
            except Exception:
                pass

    except Exception as e:
        logger.warning(f"[CommunityTrends] stats error: {e}")

    return stats
