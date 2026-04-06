"""
Market data endpoints — overview, quotes, history, search, peers, profile.
"""

import logging
from fastapi import APIRouter, HTTPException, Request
import yfinance as yf

from deps import USE_FMP, FMP_KEY, TTLCache, limiter
from services.market_data import get_company_data as _get_data, get_peers_data

try:
    import httpx
except ImportError:
    import httpx

logger = logging.getLogger("valuengine")

router = APIRouter()

# ── Market overview cache ────────────────────────────────────────────────
_market_cache = TTLCache(max_size=10, default_ttl=300)

_INDICES = [
    {"label": "S&P 500", "yf": "^GSPC"},
    {"label": "NASDAQ",  "yf": "^IXIC"},
    {"label": "CAC 40",  "yf": "^FCHI"},
    {"label": "DAX",     "yf": "^GDAXI"},
]

_MARKET_FALLBACK = [
    {"label": "S&P 500",  "value": "—", "change": "—", "up": True},
    {"label": "NASDAQ",   "value": "—", "change": "—", "up": True},
    {"label": "CAC 40",   "value": "—", "change": "—", "up": True},
    {"label": "DAX",      "value": "—", "change": "—", "up": True},
]


@router.get("/api/market-overview")
def market_overview():
    cached = _market_cache.get("overview")
    if cached:
        return cached

    try:
        results = []
        for idx in _INDICES:
            fi = yf.Ticker(idx["yf"]).fast_info
            price = float(getattr(fi, "last_price", 0) or 0)
            prev  = float(getattr(fi, "previous_close", 0) or
                          getattr(fi, "regular_market_previous_close", 0) or 0)
            change_pct = ((price - prev) / prev * 100) if prev else 0.0
            sign = "+" if change_pct >= 0 else ""
            results.append({
                "label":  idx["label"],
                "value":  f"{price:,.2f}",
                "change": f"{sign}{change_pct:.2f}%",
                "up":     change_pct >= 0,
            })
        _market_cache.set("overview", results)
        return results
    except Exception as e:
        logger.warning(f"[market-overview] yfinance error: {e}")
        return _MARKET_FALLBACK


VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}


@router.get("/api/history/{ticker}")
def history(ticker: str, period: str = "1y"):
    """Retourne l'historique des prix de clôture d'une action."""
    if period not in VALID_PERIODS:
        period = "1y"
    try:
        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period)
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"Aucune donnée historique pour '{ticker}'")
        result = [
            {
                "date":   str(idx.date()),
                "close":  round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            }
            for idx, row in hist.iterrows()
        ]
        return {"ticker": ticker.upper(), "period": period, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/search/{ticker}")
def search(ticker: str):
    """Vérifie qu'un ticker existe et retourne son nom + secteur."""
    try:
        raw = _get_data(ticker.upper())
        return {
            "ticker": raw["ticker"],
            "name":   raw["name"],
            "sector": raw["sector"],
            "price":  raw["price"],
        }
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Ticker introuvable")
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/peers/{ticker}")
def peers(ticker: str, sector: str = "Technology"):
    """Retourne les entreprises comparables du même secteur."""
    try:
        result = get_peers_data(ticker.upper(), sector)
        return {"peers": result}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/quotes")
def batch_quotes(tickers: str):
    """Prix live pour plusieurs tickers (séparés par virgule)."""
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()][:30]
    if not symbols:
        return []
    if USE_FMP:
        try:
            joined = ",".join(symbols)
            url = f"https://financialmodelingprep.com/stable/batch-quote?symbol={joined}&apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=8)
            resp.raise_for_status()
            return [
                {
                    "ticker":     q.get("symbol", ""),
                    "name":       q.get("name", ""),
                    "price":      round(float(q.get("price") or 0), 2),
                    "change_pct": round(float(q.get("changesPercentage") or 0), 2),
                }
                for q in resp.json()
            ]
        except Exception:
            return []
    else:
        results = []
        for sym in symbols:
            try:
                fi = yf.Ticker(sym).fast_info
                price = float(getattr(fi, "last_price", 0) or 0)
                results.append({"ticker": sym, "name": sym, "price": round(price, 2), "change_pct": 0.0})
            except Exception:
                pass
        return results


@router.get("/api/quote/{ticker}")
def quote(ticker: str):
    """Prix en temps réel + variation journalière d'un ticker."""
    t = ticker.upper().strip()
    if USE_FMP:
        try:
            url = f"https://financialmodelingprep.com/stable/quote?symbol={t}&apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                raise HTTPException(status_code=404, detail=f"'{t}' introuvable")
            q = data[0] if isinstance(data, list) else data
            return {
                "ticker":     q.get("symbol", t),
                "name":       q.get("name", t),
                "price":      round(float(q.get("price") or 0), 2),
                "change_pct": round(float(q.get("changesPercentage") or 0), 2),
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
    else:
        try:
            fi = yf.Ticker(t).fast_info
            price = float(getattr(fi, "last_price", 0) or 0)
            prev  = float(getattr(fi, "previous_close", price) or price)
            change_pct = round(((price - prev) / prev * 100), 2) if prev else 0
            return {"ticker": t, "name": t, "price": round(price, 2), "change_pct": change_pct}
        except Exception as e:
            logger.warning(f"[Quote] Error for {t}: {e}")
            raise HTTPException(status_code=404, detail=f"Ticker '{t}' introuvable")


@router.get("/api/profile/{ticker}")
def profile(ticker: str):
    """Profil fondamental d'un ticker."""
    t = ticker.upper().strip()
    if USE_FMP:
        try:
            url = f"https://financialmodelingprep.com/stable/profile?symbol={t}&apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                raise HTTPException(status_code=404, detail=f"'{t}' introuvable")
            p = data[0]
            desc = p.get("description") or ""
            return {
                "ticker":      p.get("symbol", t),
                "name":        p.get("companyName", t),
                "sector":      p.get("sector", ""),
                "industry":    p.get("industry", ""),
                "description": desc[:600],
                "price":       round(float(p.get("price") or 0), 2),
                "market_cap":  p.get("mktCap"),
                "pe_ratio":    p.get("pe"),
                "country":     p.get("country", ""),
                "exchange":    p.get("exchangeShortName", ""),
                "currency":    p.get("currency", ""),
                "image":       p.get("image", ""),
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
    else:
        try:
            info = yf.Ticker(t).info
            if not info or info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
                raise HTTPException(status_code=404, detail=f"'{t}' introuvable")
            desc = info.get("longBusinessSummary") or ""
            return {
                "ticker":      t,
                "name":        info.get("longName") or info.get("shortName", t),
                "sector":      info.get("sector", ""),
                "industry":    info.get("industry", ""),
                "description": desc[:600],
                "price":       round(float(info.get("currentPrice") or 0), 2),
                "market_cap":  info.get("marketCap"),
                "pe_ratio":    info.get("trailingPE"),
                "country":     info.get("country", ""),
                "exchange":    "",
                "currency":    info.get("currency", ""),
                "image":       "",
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
