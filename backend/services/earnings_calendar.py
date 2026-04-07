"""
ValuEngine — Earnings Calendar
Fetches upcoming earnings dates for portfolio tickers and popular stocks.
Uses FMP API for earnings calendar data.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict

import httpx

logger = logging.getLogger("valuengine")


def get_earnings_calendar(tickers: Optional[List[str]] = None, days_ahead: int = 30) -> Dict:
    """
    Fetch upcoming earnings for given tickers (or popular stocks).

    Returns: { earnings: [...], period: { from, to } }
    """
    fmp_key = os.environ.get("FMP_API_KEY", "")

    today = datetime.now()
    from_date = today.strftime("%Y-%m-%d")
    to_date = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    earnings = []

    if fmp_key:
        earnings = _fetch_fmp_earnings(fmp_key, from_date, to_date, tickers)

    # Fallback: try yfinance for individual tickers
    if not earnings and tickers:
        earnings = _fetch_yfinance_earnings(tickers)

    # Sort by date
    earnings.sort(key=lambda e: e.get("date", ""))

    # Mark tickers that are in the user's portfolio
    portfolio_set = set(t.upper() for t in (tickers or []))
    for e in earnings:
        e["in_portfolio"] = e.get("symbol", "").upper() in portfolio_set

    return {
        "earnings": earnings,
        "period": {"from": from_date, "to": to_date},
        "count": len(earnings),
    }


def _fetch_fmp_earnings(api_key: str, from_date: str, to_date: str, tickers: Optional[List[str]] = None) -> list:
    """Fetch earnings from FMP API."""
    try:
        url = f"https://financialmodelingprep.com/stable/earning-calendar?from={from_date}&to={to_date}&apikey={api_key}"
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if not isinstance(data, list):
            return []

        results = []
        ticker_set = set(t.upper() for t in (tickers or []))

        for item in data:
            symbol = item.get("symbol", "")
            # If tickers specified, filter. Otherwise return major ones.
            if tickers and symbol.upper() not in ticker_set:
                continue

            results.append({
                "symbol": symbol,
                "date": item.get("date", ""),
                "time": item.get("time", ""),
                "eps_estimated": item.get("epsEstimated"),
                "eps_actual": item.get("eps"),
                "revenue_estimated": item.get("revenueEstimated"),
                "revenue_actual": item.get("revenue"),
                "fiscal_period": item.get("fiscalDateEnding", ""),
            })

        return results[:50]  # Cap at 50

    except Exception as e:
        logger.warning(f"[EarningsCalendar] FMP error: {e}")
        return []


def _fetch_yfinance_earnings(tickers: List[str]) -> list:
    """Fallback: fetch earnings from yfinance."""
    import yfinance as yf

    results = []
    for ticker in tickers[:20]:  # Cap at 20
        try:
            info = yf.Ticker(ticker).info
            earnings_date = info.get("earningsTimestamp") or info.get("earningsTimestampStart")
            if earnings_date:
                dt = datetime.fromtimestamp(earnings_date)
                if dt > datetime.now():
                    results.append({
                        "symbol": ticker.upper(),
                        "date": dt.strftime("%Y-%m-%d"),
                        "time": "bmo" if dt.hour < 12 else "amc",
                        "eps_estimated": info.get("earningsQuarterlyGrowth"),
                        "eps_actual": None,
                        "revenue_estimated": None,
                        "revenue_actual": None,
                        "fiscal_period": "",
                    })
        except Exception:
            continue

    return results


def get_earnings_for_ticker(ticker: str) -> Optional[Dict]:
    """Get next earnings date for a specific ticker."""
    fmp_key = os.environ.get("FMP_API_KEY", "")

    if fmp_key:
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            to_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
            url = f"https://financialmodelingprep.com/stable/earning-calendar?from={today}&to={to_date}&apikey={fmp_key}"
            resp = httpx.get(url, timeout=8)
            resp.raise_for_status()
            data = resp.json()
            for item in data:
                if item.get("symbol", "").upper() == ticker.upper():
                    return {
                        "symbol": ticker.upper(),
                        "date": item.get("date", ""),
                        "time": item.get("time", ""),
                        "eps_estimated": item.get("epsEstimated"),
                        "days_until": (datetime.strptime(item["date"], "%Y-%m-%d") - datetime.now()).days,
                    }
        except Exception as e:
            logger.warning(f"[EarningsCalendar] FMP ticker error for {ticker}: {e}")

    # Fallback yfinance
    try:
        import yfinance as yf
        info = yf.Ticker(ticker).info
        earnings_ts = info.get("earningsTimestamp") or info.get("earningsTimestampStart")
        if earnings_ts:
            dt = datetime.fromtimestamp(earnings_ts)
            if dt > datetime.now():
                return {
                    "symbol": ticker.upper(),
                    "date": dt.strftime("%Y-%m-%d"),
                    "time": "bmo" if dt.hour < 12 else "amc",
                    "eps_estimated": None,
                    "days_until": (dt - datetime.now()).days,
                }
    except Exception:
        pass

    return None
