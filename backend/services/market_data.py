"""
ValuEngine — Market Data Service
Source : Yahoo Finance via yfinance (gratuit, fiable, 10 000+ tickers)
"""

import time
import requests
import yfinance as yf
from typing import Optional


# ── Cache en mémoire (TTL 15 min) ────────────────────────────────────────────
CACHE: dict = {}
CACHE_TTL = 15 * 60  # 15 minutes en secondes


def _cache_get(ticker: str):
    entry = CACHE.get(ticker)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        print(f"[Cache hit]  {ticker}")
        return entry["data"]
    return None


def _cache_set(ticker: str, data: dict):
    CACHE[ticker] = {"data": data, "ts": time.time()}
    print(f"[Cache miss] {ticker} — données mises en cache")


# Session HTTP avec User-Agent réaliste pour éviter le blocage Yahoo Finance
def _make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
    })
    return s


# Secteurs → peers pour Trading Comps
SECTOR_PEERS: dict[str, list[str]] = {
    "Technology":             ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "ORCL", "ADBE"],
    "Consumer Cyclical":      ["AMZN", "TSLA", "NKE", "MCD", "SBUX", "HD", "TGT"],
    "Consumer Defensive":     ["KO", "PEP", "PG", "WMT", "COST", "CL", "MDLZ"],
    "Healthcare":             ["JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY", "TMO"],
    "Financial Services":     ["JPM", "BAC", "GS", "MS", "V", "MA", "AXP"],
    "Industrials":            ["HON", "GE", "CAT", "BA", "MMM", "UPS", "RTX"],
    "Energy":                 ["XOM", "CVX", "COP", "SLB", "EOG", "PSX", "MPC"],
    "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "T", "VZ", "CMCSA"],
    "Real Estate":            ["AMT", "PLD", "CCI", "EQIX", "SPG", "O", "WELL"],
    "Utilities":              ["NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE"],
    "Basic Materials":        ["LIN", "APD", "ECL", "NEM", "FCX", "NUE", "ALB"],
}


def _safe_float(value, default: float = 0.0) -> float:
    """Extraction sécurisée d'un float depuis n'importe quelle valeur."""
    if value is None:
        return default
    try:
        f = float(value)
        return f if f == f else default  # NaN check
    except (TypeError, ValueError):
        return default


def _fetch_info_with_retry(ticker: str, max_retries: int = 3) -> dict:
    """
    Récupère t.info avec retry + session pour éviter le rate-limiting Yahoo Finance.
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            session = _make_session()
            t = yf.Ticker(ticker, session=session)
            info = t.info
            # Yahoo retourne parfois un dict vide ou minimal sans erreur
            if info and len(info) > 5:
                return info
            # Si trop peu de champs, on retry
            if attempt < max_retries - 1:
                time.sleep(1.5 * (attempt + 1))
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))

    # Dernier essai sans session custom
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if info:
            return info
    except Exception as e:
        last_error = e

    raise RuntimeError(f"Impossible de récupérer les données pour '{ticker}' après {max_retries} tentatives. Erreur: {last_error}")


def get_company_data(ticker: str) -> dict:
    """
    Récupère toutes les données financières d'une entreprise via yfinance.
    Retourne un dict avec des clés snake_case cohérentes.
    Lève une ValueError si le ticker est invalide.
    """
    ticker = ticker.upper().strip()

    cached = _cache_get(ticker)
    if cached:
        return cached

    try:
        info = _fetch_info_with_retry(ticker)
    except RuntimeError as e:
        raise ValueError(str(e))

    # Validation : si yfinance ne trouve pas le ticker, info est minimal
    if not info.get("symbol") and not info.get("shortName") and not info.get("longName"):
        raise ValueError(f"Ticker '{ticker}' introuvable. Vérifiez le symbole (ex: AAPL, TSLA, MSFT).")

    # ── Prix ──────────────────────────────────────────────────────────────
    price = _safe_float(
        info.get("currentPrice") or
        info.get("regularMarketPrice") or
        info.get("previousClose")
    )

    # ── Métriques de valorisation ─────────────────────────────────────────
    market_cap        = _safe_float(info.get("marketCap"))
    enterprise_value  = _safe_float(info.get("enterpriseValue"))
    shares            = _safe_float(info.get("sharesOutstanding"), default=1.0)

    # ── P&L & Cash Flow ───────────────────────────────────────────────────
    revenue           = _safe_float(info.get("totalRevenue"))
    ebitda            = _safe_float(info.get("ebitda"))
    net_income        = _safe_float(info.get("netIncomeToCommon"))
    fcf               = _safe_float(info.get("freeCashflow"))

    # Si FCF absent, on utilise Operating CF comme proxy
    if fcf == 0.0:
        fcf = _safe_float(info.get("operatingCashflow")) * 0.85

    # ── Bilan ─────────────────────────────────────────────────────────────
    total_debt        = _safe_float(info.get("totalDebt"))
    total_cash        = _safe_float(info.get("totalCash"))
    net_debt          = max(total_debt - total_cash, 0.0)

    # ── Ratios ────────────────────────────────────────────────────────────
    pe_ratio          = _safe_float(info.get("trailingPE"))   or None
    forward_pe        = _safe_float(info.get("forwardPE"))    or None
    ev_ebitda         = _safe_float(info.get("enterpriseToEbitda")) or None
    pb_ratio          = _safe_float(info.get("priceToBook"))  or None
    roe               = _safe_float(info.get("returnOnEquity")) or None
    profit_margin     = _safe_float(info.get("profitMargins")) or None
    revenue_growth    = _safe_float(info.get("revenueGrowth")) or None
    beta              = _safe_float(info.get("beta"))         or None
    eps               = _safe_float(info.get("trailingEps"))  or None
    dividend_yield    = _safe_float(info.get("dividendYield")) or None

    result = {
        "ticker":           ticker,
        "name":             info.get("shortName") or info.get("longName") or ticker,
        "sector":           info.get("sector") or "N/A",
        "industry":         info.get("industry") or "N/A",
        "description":      info.get("longBusinessSummary") or "",
        "price":            price,
        "currency":         info.get("currency") or "USD",
        "exchange":         info.get("exchange") or "",
        "market_cap":       market_cap,
        "enterprise_value": enterprise_value,
        "shares_outstanding": shares,
        "revenue":          revenue,
        "ebitda":           ebitda,
        "net_income":       net_income,
        "free_cash_flow":   fcf,
        "total_debt":       total_debt,
        "total_cash":       total_cash,
        "net_debt":         net_debt,
        "pe_ratio":         pe_ratio,
        "forward_pe":       forward_pe,
        "ev_ebitda":        ev_ebitda,
        "pb_ratio":         pb_ratio,
        "roe":              roe,
        "profit_margin":    profit_margin,
        "revenue_growth":   revenue_growth,
        "beta":             beta,
        "eps":              eps,
        "dividend_yield":   dividend_yield,
    }
    _cache_set(ticker, result)
    return result


def get_peers_data(ticker: str, sector: str) -> list[dict]:
    """
    Récupère les données des entreprises comparables du même secteur.
    Retourne une liste de dicts (max 4 peers, ticker principal exclu).
    """
    ticker = ticker.upper().strip()
    candidates = SECTOR_PEERS.get(sector, ["AAPL", "MSFT", "GOOGL", "AMZN", "META"])
    peers = [t for t in candidates if t != ticker][:4]

    results = []
    for peer_ticker in peers:
        try:
            d = get_company_data(peer_ticker)
            results.append({
                "ticker":       d["ticker"],
                "name":         d["name"],
                "price":        round(d["price"], 2),
                "market_cap":   d["market_cap"],
                "pe_ratio":     round(d["pe_ratio"], 1) if d["pe_ratio"] else None,
                "ev_ebitda":    round(d["ev_ebitda"], 1) if d["ev_ebitda"] else None,
                "profit_margin": round(d["profit_margin"] * 100, 1) if d["profit_margin"] else None,
                "revenue_growth": round(d["revenue_growth"] * 100, 1) if d["revenue_growth"] else None,
                "beta":         round(d["beta"], 2) if d["beta"] else None,
            })
        except Exception:
            continue  # On skip silencieusement les peers en erreur

    return results
