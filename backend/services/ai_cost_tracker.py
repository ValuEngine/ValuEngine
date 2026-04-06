"""
ValuEngine — AI Cost Tracker
Tracks token usage and estimated costs per AI call.
Thread-safe in-memory accumulator + Supabase persistence.
"""

import time
import logging
import threading
from datetime import datetime, timezone
from collections import defaultdict

logger = logging.getLogger("valuengine")

# ── Pricing per model (USD per 1M tokens) ─────────────────────────────────
# Source: Anthropic pricing as of 2025
MODEL_PRICING = {
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
    "claude-opus-4-6": {"input": 15.00, "output": 75.00},
    # Fallback
    "default": {"input": 1.00, "output": 5.00},
}

# ── Thread-safe in-memory accumulator ──────────────────────────────────────
_lock = threading.Lock()
_calls: list = []  # List of dicts with call metadata
_daily_totals: dict = defaultdict(lambda: {"calls": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0})


def _get_pricing(model: str) -> dict:
    return MODEL_PRICING.get(model, MODEL_PRICING["default"])


def track_ai_call(
    model: str,
    endpoint: str,
    input_tokens: int,
    output_tokens: int,
    ticker: str = "",
    user_id: str = "",
    duration_ms: int = 0,
):
    """Record an AI API call with token usage and estimated cost."""
    pricing = _get_pricing(model)
    cost = (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000

    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "endpoint": endpoint,
        "ticker": ticker,
        "user_id": user_id,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": round(cost, 6),
        "duration_ms": duration_ms,
    }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with _lock:
        _calls.append(record)
        # Keep max 1000 recent calls in memory
        if len(_calls) > 1000:
            _calls.pop(0)

        _daily_totals[today]["calls"] += 1
        _daily_totals[today]["input_tokens"] += input_tokens
        _daily_totals[today]["output_tokens"] += output_tokens
        _daily_totals[today]["cost_usd"] += cost

    logger.info(
        f"[AI Cost] {model} | {endpoint} | {ticker} | "
        f"in={input_tokens} out={output_tokens} | ${cost:.4f} | {duration_ms}ms"
    )


def get_cost_summary() -> dict:
    """Return cost summary for admin dashboard."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with _lock:
        today_stats = dict(_daily_totals.get(today, {"calls": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}))

        # Last 7 days
        daily_list = []
        for date_key in sorted(_daily_totals.keys(), reverse=True)[:7]:
            daily_list.append({"date": date_key, **dict(_daily_totals[date_key])})

        # Totals across all tracked days
        total_calls = sum(d["calls"] for d in _daily_totals.values())
        total_cost = sum(d["cost_usd"] for d in _daily_totals.values())
        total_input = sum(d["input_tokens"] for d in _daily_totals.values())
        total_output = sum(d["output_tokens"] for d in _daily_totals.values())

        # Recent calls (last 20)
        recent = list(reversed(_calls[-20:]))

        # Cost by model
        model_costs: dict = defaultdict(lambda: {"calls": 0, "cost_usd": 0.0})
        for c in _calls:
            m = c["model"]
            model_costs[m]["calls"] += 1
            model_costs[m]["cost_usd"] += c["cost_usd"]

        # Cost by endpoint
        endpoint_costs: dict = defaultdict(lambda: {"calls": 0, "cost_usd": 0.0})
        for c in _calls:
            ep = c["endpoint"]
            endpoint_costs[ep]["calls"] += 1
            endpoint_costs[ep]["cost_usd"] += c["cost_usd"]

    return {
        "today": {
            "date": today,
            "calls": today_stats["calls"],
            "input_tokens": today_stats["input_tokens"],
            "output_tokens": today_stats["output_tokens"],
            "cost_usd": round(today_stats["cost_usd"], 4),
        },
        "totals": {
            "calls": total_calls,
            "input_tokens": total_input,
            "output_tokens": total_output,
            "cost_usd": round(total_cost, 4),
        },
        "daily": daily_list,
        "by_model": {k: {"calls": v["calls"], "cost_usd": round(v["cost_usd"], 4)} for k, v in model_costs.items()},
        "by_endpoint": {k: {"calls": v["calls"], "cost_usd": round(v["cost_usd"], 4)} for k, v in endpoint_costs.items()},
        "recent_calls": recent,
    }
