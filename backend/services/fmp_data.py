"""
ValuEngine — Market Data Service
Source : Financial Modeling Prep (FMP) API — stable endpoints
Retourne exactement le même contrat de données que market_data.py (yfinance).
"""

import os
import time
import requests
from typing import Optional

# ── Cache en mémoire (TTL 15 min) ────────────────────────────────────────────
CACHE: dict = {}
CACHE_TTL = 15 * 60


def _cache_get(ticker: str):
    entry = CACHE.get(ticker)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        print(f"[FMP Cache hit]  {ticker}")
        return entry["data"]
    return None


def _cache_set(ticker: str, data: dict):
    CACHE[ticker] = {"data": data, "ts": time.time()}
    print(f"[FMP Cache miss] {ticker} — données mises en cache")


def _safe_float(val, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default


def _fmp_get(path: str, params: dict = {}) -> dict | list:
    """Appel HTTP vers l'API FMP (stable endpoints) avec gestion d'erreur."""
    api_key = os.environ.get("FMP_API_KEY", "")
    base = "https://financialmodelingprep.com/stable"
    url = f"{base}{path}"
    params = {**params, "apikey": api_key}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.Timeout:
        raise RuntimeError(f"FMP timeout sur {path}")
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"FMP HTTP error {e.response.status_code} sur {path}")
    except Exception as e:
        raise RuntimeError(f"FMP erreur réseau : {e}")


def get_company_data(ticker: str) -> dict:
    """
    Récupère toutes les données financières d'une entreprise via FMP.
    Retourne un dict identique au contrat de market_data.py.
    """
    ticker = ticker.upper().strip()

    cached = _cache_get(ticker)
    if cached:
        return cached

    # ── 1. Profil entreprise ─────────────────────────────────────────────────
    profile_raw = _fmp_get(f"/profile", {"symbol": ticker})
    if not profile_raw or not isinstance(profile_raw, list) or not profile_raw[0]:
        raise ValueError(f"Ticker '{ticker}' introuvable sur FMP.")

    p = profile_raw[0]

    # ── 2. Income statement (dernière année) ─────────────────────────────────
    income_raw = _fmp_get(f"/income-statement", {"symbol": ticker, "limit": 1})
    inc = income_raw[0] if isinstance(income_raw, list) and income_raw else {}

    # ── 3. Cash flow statement ───────────────────────────────────────────────
    cf_raw = _fmp_get(f"/cash-flow-statement", {"symbol": ticker, "limit": 1})
    cf = cf_raw[0] if isinstance(cf_raw, list) and cf_raw else {}

    # ── 4. Balance sheet ─────────────────────────────────────────────────────
    bs_raw = _fmp_get(f"/balance-sheet-statement", {"symbol": ticker, "limit": 1})
    bs = bs_raw[0] if isinstance(bs_raw, list) and bs_raw else {}

    # ── Calculs ───────────────────────────────────────────────────────────────
    price       = _safe_float(p.get("price"))
    market_cap  = _safe_float(p.get("marketCap"))
    shares      = _safe_float(inc.get("weightedAverageShsOutDil") or inc.get("weightedAverageShsOut"), default=1.0)
    revenue     = _safe_float(inc.get("revenue"))
    ebitda      = _safe_float(inc.get("ebitda"))
    net_income  = _safe_float(inc.get("netIncome"))
    fcf         = _safe_float(cf.get("freeCashFlow"))

    # Si FCF absent, proxy via operating CF
    if fcf == 0.0:
        fcf = _safe_float(cf.get("operatingCashFlow")) * 0.85

    total_debt  = _safe_float(bs.get("totalDebt"))
    total_cash  = _safe_float(bs.get("cashAndCashEquivalents"))
    net_debt    = max(total_debt - total_cash, 0.0)

    # Enterprise value (calculé, pas besoin de /key-metrics)
    ev = market_cap + net_debt

    # Ratios (calculés à partir des financial statements, pas besoin de /ratios)
    total_equity = _safe_float(bs.get("totalStockholdersEquity"))
    pe_ratio      = (price / (net_income / shares)) if (net_income and shares and net_income > 0) else None
    forward_pe    = None
    ev_ebitda     = (ev / ebitda) if ebitda and ebitda > 0 else None
    pb_ratio      = (market_cap / total_equity) if total_equity and total_equity > 0 else None
    roe           = (net_income / total_equity) if total_equity and total_equity > 0 else None
    profit_margin = (net_income / revenue) if revenue and revenue > 0 else None
    beta          = _safe_float(p.get("beta")) or None
    eps           = _safe_float(inc.get("epsDiluted") or inc.get("eps")) or None
    last_div      = _safe_float(p.get("lastDividend"))
    dividend_yield = (last_div / price) if (price and last_div) else None

    # Croissance CA : comparaison avec l'année précédente
    revenue_growth: Optional[float] = None
    income_2y = _fmp_get(f"/income-statement", {"symbol": ticker, "limit": 2})
    if isinstance(income_2y, list) and len(income_2y) >= 2:
        rev_curr = _safe_float(income_2y[0].get("revenue"))
        rev_prev = _safe_float(income_2y[1].get("revenue"))
        if rev_prev > 0:
            revenue_growth = (rev_curr - rev_prev) / rev_prev

    result = {
        "ticker":             ticker,
        "name":               p.get("companyName") or ticker,
        "sector":             p.get("sector") or "N/A",
        "industry":           p.get("industry") or "N/A",
        "description":        p.get("description") or "",
        "price":              price,
        "currency":           p.get("currency") or "USD",
        "exchange":           p.get("exchange") or "",
        "market_cap":         market_cap,
        "enterprise_value":   ev,
        "shares_outstanding": shares,
        "revenue":            revenue,
        "ebitda":             ebitda,
        "net_income":         net_income,
        "free_cash_flow":     fcf,
        "total_debt":         total_debt,
        "total_cash":         total_cash,
        "net_debt":           net_debt,
        "pe_ratio":           pe_ratio,
        "forward_pe":         forward_pe,
        "ev_ebitda":          ev_ebitda,
        "pb_ratio":           pb_ratio,
        "roe":                roe,
        "profit_margin":      profit_margin,
        "revenue_growth":     revenue_growth,
        "beta":               beta,
        "eps":                eps,
        "dividend_yield":     dividend_yield,
    }
    _cache_set(ticker, result)
    return result


def get_peers_data(ticker: str, sector: str) -> list[dict]:
    """
    Récupère les données des entreprises comparables via FMP.
    Utilise les peer companies de FMP ou un fallback sectoriel.
    """
    peers_raw = _fmp_get(f"/stock-peers", {"symbol": ticker})
    peers: list[str] = []
    if isinstance(peers_raw, list) and peers_raw:
        peers = [p["symbol"] for p in peers_raw[:6] if p.get("symbol") != ticker]

    # Fallback sectoriel si FMP ne retourne rien
    if not peers:
        SECTOR_PEERS: dict[str, list[str]] = {
            "Technology":      ["AAPL", "MSFT", "GOOGL", "META", "NVDA"],
            "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "SBUX"],
            "Healthcare":      ["JNJ", "PFE", "UNH", "ABT", "MRK"],
            "Financial Services": ["JPM", "BAC", "GS", "MS", "WFC"],
            "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "T"],
            "Industrials":     ["BA", "CAT", "GE", "MMM", "UPS"],
            "Energy":          ["XOM", "CVX", "COP", "SLB", "EOG"],
            "Consumer Defensive": ["KO", "PEP", "PG", "WMT", "COST"],
            "Real Estate":     ["AMT", "PLD", "CCI", "EQIX", "SPG"],
            "Utilities":       ["NEE", "DUK", "SO", "D", "AEP"],
            "Basic Materials": ["LIN", "APD", "ECL", "DD", "NEM"],
        }
        peers = [t for t in SECTOR_PEERS.get(sector, ["AAPL", "MSFT", "GOOGL", "AMZN", "META"])
                 if t != ticker][:5]

    results = []
    for peer in peers:
        if peer == ticker:
            continue
        try:
            profile = _fmp_get(f"/profile", {"symbol": peer})
            if not isinstance(profile, list) or not profile:
                continue
            pr = profile[0]

            # Income statement pour calculer les ratios (évite /key-metrics et /ratios qui sont payants)
            peer_income = _fmp_get(f"/income-statement", {"symbol": peer, "limit": 1})
            pi = peer_income[0] if isinstance(peer_income, list) and peer_income else {}

            peer_price = _safe_float(pr.get("price"))
            peer_mcap = _safe_float(pr.get("marketCap"))
            peer_ni = _safe_float(pi.get("netIncome"))
            peer_rev = _safe_float(pi.get("revenue"))
            peer_ebitda = _safe_float(pi.get("ebitda"))
            peer_shares = _safe_float(pi.get("weightedAverageShsOutDil") or pi.get("weightedAverageShsOut"), default=1.0)

            results.append({
                "ticker":         peer,
                "name":           pr.get("companyName") or peer,
                "price":          peer_price,
                "market_cap":     peer_mcap,
                "pe_ratio":       (peer_price / (peer_ni / peer_shares)) if (peer_ni and peer_shares and peer_ni > 0) else None,
                "ev_ebitda":      (peer_mcap / peer_ebitda) if peer_ebitda and peer_ebitda > 0 else None,
                "revenue_growth": None,
                "profit_margin":  (peer_ni / peer_rev) if peer_rev and peer_rev > 0 else None,
            })
        except Exception:
            continue

    return results
