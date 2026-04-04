"""
ValuEngine — FMP Data Service
Source: Financial Modeling Prep — /stable/ API (post-Aug 2025)
Retourne exactement le même contrat de données que market_data.py (yfinance).
"""

import os
import time
import logging
import requests
from typing import Optional

logger = logging.getLogger("valuengine")

# ── Thread-safe cache with TTL and max size ──────────────────────────────────
import threading
from collections import OrderedDict


class _FmpCache:
    def __init__(self, max_size=1000, default_ttl=900):
        self._data: OrderedDict = OrderedDict()
        self._ts: dict = {}
        self._lock = threading.Lock()
        self._max = max_size
        self._default_ttl = default_ttl

    def get(self, key: str, ttl: int | None = None):
        ttl = ttl or self._default_ttl
        with self._lock:
            if key not in self._data:
                return None
            if time.time() - self._ts[key] > ttl:
                del self._data[key]; del self._ts[key]
                return None
            self._data.move_to_end(key)
            return self._data[key]

    def set(self, key: str, val):
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
            self._data[key] = val
            self._ts[key] = time.time()
            while len(self._data) > self._max:
                k = next(iter(self._data))
                del self._data[k]; del self._ts[k]


# Tiered TTL caches
CACHE = _FmpCache(max_size=1000, default_ttl=900)

# TTL constants (seconds)
TTL_QUOTE = 5 * 60          # 5 minutes — prix temps réel
TTL_COMPANY = 6 * 3600      # 6 heures — profil, données de base
TTL_ANNUAL = 24 * 3600       # 24 heures — financial statements annuels
TTL_ANALYST = 24 * 3600      # 24 heures — consensus analystes
TTL_SEGMENTS = 24 * 3600     # 24 heures — revenue segments
TTL_DEEP = 24 * 3600         # 24 heures — deep financials

# FMP call counter for monitoring
_fmp_calls = {"count": 0, "reset_at": time.time() + 86400}
_fmp_lock = threading.Lock()


def get_fmp_call_count() -> dict:
    """Return current FMP API call stats."""
    with _fmp_lock:
        if time.time() > _fmp_calls["reset_at"]:
            _fmp_calls["count"] = 0
            _fmp_calls["reset_at"] = time.time() + 86400
        return {"calls_today": _fmp_calls["count"], "daily_limit": 10_000}


def _safe_float(val, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default


# ── FMP /stable/ API helper ──────────────────────────────────────────────────

FMP_BASE = "https://financialmodelingprep.com/stable"


def _fmp_get(endpoint: str, params: dict | None = None) -> dict | list:
    """
    Call FMP /stable/ API. Symbol goes in params, not URL path.
    Example: _fmp_get("/income-statement", {"symbol": "AAPL", "limit": 5})
    """
    api_key = os.environ.get("FMP_API_KEY", "")
    if not api_key:
        raise RuntimeError("FMP_API_KEY not configured")

    url = f"{FMP_BASE}{endpoint}"
    all_params = {**(params or {}), "apikey": api_key}

    with _fmp_lock:
        _fmp_calls["count"] += 1
        if _fmp_calls["count"] > 8000:
            logger.warning(f"⚠️ FMP: {_fmp_calls['count']} calls today — approaching limit")

    try:
        r = requests.get(url, params=all_params, timeout=12)
        r.raise_for_status()
        data = r.json()
        # FMP returns error messages as dicts sometimes
        if isinstance(data, dict) and ("Error Message" in data or "Upgrade" in str(data.get("message", ""))):
            raise RuntimeError(f"FMP error on {endpoint}: {data}")
        return data
    except requests.exceptions.Timeout:
        raise RuntimeError(f"FMP timeout on {endpoint}")
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"FMP HTTP {e.response.status_code} on {endpoint}")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"FMP network error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# Company Data (main analysis endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

def get_company_data(ticker: str) -> dict:
    """
    Fetch all financial data for a company via FMP /stable/ API.
    Returns a dict matching the market_data.py contract.
    """
    ticker = ticker.upper().strip()

    cached = CACHE.get(f"company:{ticker}", TTL_COMPANY)
    if cached:
        return cached

    # ── 1. Profile ──
    profile_raw = _fmp_get("/profile", {"symbol": ticker})
    if not profile_raw or not isinstance(profile_raw, list) or not profile_raw[0]:
        raise ValueError(f"Ticker '{ticker}' introuvable sur FMP.")
    p = profile_raw[0]

    # ── 2. Income statement ──
    income_raw = _fmp_get("/income-statement", {"symbol": ticker, "limit": 2})
    inc = income_raw[0] if isinstance(income_raw, list) and income_raw else {}

    # ── 3. Cash flow statement ──
    cf_raw = _fmp_get("/cash-flow-statement", {"symbol": ticker, "limit": 1})
    cf = cf_raw[0] if isinstance(cf_raw, list) and cf_raw else {}

    # ── 4. Balance sheet ──
    bs_raw = _fmp_get("/balance-sheet-statement", {"symbol": ticker, "limit": 1})
    bs = bs_raw[0] if isinstance(bs_raw, list) and bs_raw else {}

    # ── Calculations ──
    price       = _safe_float(p.get("price"))
    market_cap  = _safe_float(p.get("marketCap") or p.get("mktCap"))
    shares      = _safe_float(inc.get("weightedAverageShsOutDil") or inc.get("weightedAverageShsOut"), default=1.0)
    revenue     = _safe_float(inc.get("revenue"))
    ebitda      = _safe_float(inc.get("ebitda"))
    net_income  = _safe_float(inc.get("netIncome"))
    fcf         = _safe_float(cf.get("freeCashFlow"))

    if fcf == 0.0:
        fcf = _safe_float(cf.get("operatingCashFlow")) * 0.85

    total_debt  = _safe_float(bs.get("totalDebt"))
    total_cash  = _safe_float(bs.get("cashAndCashEquivalents") or bs.get("cashAndShortTermInvestments"))
    net_debt    = total_debt - total_cash
    ev          = market_cap + net_debt

    total_equity = _safe_float(bs.get("totalStockholdersEquity"))
    pe_ratio      = (price / (net_income / shares)) if (net_income and shares and net_income > 0) else None
    forward_pe    = _safe_float(p.get("forwardPE")) or None
    ev_ebitda     = (ev / ebitda) if ebitda and ebitda > 0 else None
    pb_ratio      = (market_cap / total_equity) if total_equity and total_equity > 0 else None
    roe           = (net_income / total_equity) if total_equity and total_equity > 0 else None
    profit_margin = (net_income / revenue) if revenue and revenue > 0 else None
    beta          = _safe_float(p.get("beta")) or None
    eps           = _safe_float(inc.get("epsDiluted") or inc.get("eps")) or None
    last_div      = _safe_float(p.get("lastDividend") or p.get("lastDiv"))
    dividend_yield = (last_div / price) if (price and last_div) else None

    # Revenue growth (vs prior year)
    revenue_growth: Optional[float] = None
    if isinstance(income_raw, list) and len(income_raw) >= 2:
        rev_curr = _safe_float(income_raw[0].get("revenue"))
        rev_prev = _safe_float(income_raw[1].get("revenue"))
        if rev_prev > 0:
            revenue_growth = (rev_curr - rev_prev) / rev_prev

    result = {
        "ticker": ticker,
        "name": p.get("companyName") or p.get("company_name") or ticker,
        "sector": p.get("sector") or "N/A",
        "industry": p.get("industry") or "N/A",
        "description": p.get("description") or "",
        "price": price,
        "currency": p.get("currency") or "USD",
        "exchange": p.get("exchange") or p.get("exchangeShortName") or "",
        "market_cap": market_cap,
        "enterprise_value": ev,
        "shares_outstanding": shares,
        "revenue": revenue,
        "ebitda": ebitda,
        "net_income": net_income,
        "free_cash_flow": fcf,
        "total_debt": total_debt,
        "total_cash": total_cash,
        "net_debt": net_debt,
        "pe_ratio": pe_ratio,
        "forward_pe": forward_pe,
        "ev_ebitda": ev_ebitda,
        "pb_ratio": pb_ratio,
        "roe": roe,
        "profit_margin": profit_margin,
        "revenue_growth": revenue_growth,
        "beta": beta,
        "eps": eps,
        "dividend_yield": dividend_yield,
    }
    CACHE.set(f"company:{ticker}", result)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Peers Data
# ═══════════════════════════════════════════════════════════════════════════════

def get_peers_data(ticker: str, sector: str) -> list[dict]:
    """Fetch comparable companies data."""
    cached = CACHE.get(f"peers:{ticker}", TTL_ANNUAL)
    if cached:
        return cached

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
        try:
            profile = _fmp_get("/profile", {"symbol": peer})
            if not isinstance(profile, list) or not profile:
                continue
            pr = profile[0]
            peer_income = _fmp_get("/income-statement", {"symbol": peer, "limit": 1})
            pi = peer_income[0] if isinstance(peer_income, list) and peer_income else {}

            peer_price = _safe_float(pr.get("price"))
            peer_mcap = _safe_float(pr.get("marketCap") or pr.get("mktCap"))
            peer_ni = _safe_float(pi.get("netIncome"))
            peer_rev = _safe_float(pi.get("revenue"))
            peer_ebitda = _safe_float(pi.get("ebitda"))
            peer_shares = _safe_float(pi.get("weightedAverageShsOutDil") or pi.get("weightedAverageShsOut"), default=1.0)

            results.append({
                "ticker": peer,
                "name": pr.get("companyName") or peer,
                "price": peer_price,
                "market_cap": peer_mcap,
                "pe_ratio": (peer_price / (peer_ni / peer_shares)) if (peer_ni and peer_shares and peer_ni > 0) else None,
                "ev_ebitda": (peer_mcap / peer_ebitda) if peer_ebitda and peer_ebitda > 0 else None,
                "revenue_growth": None,
                "profit_margin": (peer_ni / peer_rev) if peer_rev and peer_rev > 0 else None,
            })
        except Exception:
            continue

    CACHE.set(f"peers:{ticker}", results)
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# Deep Financials — 5 years + analyst targets + revenue segments
# ═══════════════════════════════════════════════════════════════════════════════

def _get_deep_financials_yf(ticker: str) -> dict:
    """Fallback: extract 5-year financials from yfinance when FMP is unavailable."""
    import yfinance as yf

    t = yf.Ticker(ticker)
    inc = t.financials
    cf = t.cashflow
    bs = t.balance_sheet

    def _col_values(df, row_name):
        if df is None or df.empty or row_name not in df.index:
            return []
        return [float(v) if v == v else 0.0 for v in df.loc[row_name].values[:5]]

    revenue_5y = _col_values(inc, "Total Revenue")
    net_income_5y = _col_values(inc, "Net Income")
    gross_profit_5y = _col_values(inc, "Gross Profit")
    operating_income_5y = _col_values(inc, "Operating Income")
    ebitda_5y = _col_values(inc, "EBITDA")

    op_cf = _col_values(cf, "Operating Cash Flow") or _col_values(cf, "Total Cash From Operating Activities")
    capex = _col_values(cf, "Capital Expenditure") or _col_values(cf, "Capital Expenditures")
    fcf_5y = [op_cf[i] + capex[i] if i < len(capex) else op_cf[i] for i in range(len(op_cf))]

    total_debt_5y = _col_values(bs, "Total Debt") or _col_values(bs, "Long Term Debt")
    total_equity_5y = _col_values(bs, "Stockholders Equity") or _col_values(bs, "Total Stockholder Equity")

    def _growth(lst):
        g = []
        for i in range(len(lst) - 1):
            prev, curr = lst[i + 1], lst[i]
            g.append(round((curr - prev) / prev * 100, 2) if prev else None)
        g.append(None)
        return g

    def _margin(num, denom):
        return [round(num[i] / denom[i] * 100, 2) if i < len(denom) and denom[i] else None for i in range(len(num))]

    years = []
    if inc is not None and not inc.empty:
        for col in inc.columns[:5]:
            try:
                years.append(col.year if hasattr(col, "year") else int(str(col)[:4]))
            except Exception:
                years.append(None)

    eps_5y = _col_values(inc, "Diluted EPS") or _col_values(inc, "Basic EPS")

    result = {
        "revenue_5y": revenue_5y,
        "revenue_growth_5y": _growth(revenue_5y),
        "gross_margin_5y": _margin(gross_profit_5y, revenue_5y),
        "operating_margin_5y": _margin(operating_income_5y, revenue_5y),
        "net_margin_5y": _margin(net_income_5y, revenue_5y),
        "fcf_5y": fcf_5y,
        "fcf_margin_5y": _margin(fcf_5y, revenue_5y),
        "roic_5y": [round(operating_income_5y[i] / (total_debt_5y[i] + total_equity_5y[i]) * 100, 2)
                    if i < len(total_debt_5y) and i < len(total_equity_5y)
                    and (total_debt_5y[i] + total_equity_5y[i]) else None
                    for i in range(len(operating_income_5y))],
        "debt_to_ebitda_5y": [round(total_debt_5y[i] / ebitda_5y[i], 2)
                              if i < len(ebitda_5y) and ebitda_5y[i] else None
                              for i in range(len(total_debt_5y))],
        "eps_5y": eps_5y,
        "eps_growth_5y": _growth(eps_5y),
        "capex_intensity": _margin([abs(c) for c in capex], revenue_5y) if capex else [],
        "cash_conversion": [round(fcf_5y[i] / net_income_5y[i], 2)
                           if i < len(net_income_5y) and net_income_5y[i] else None
                           for i in range(len(fcf_5y))],
        "years": years,
        # Premium data not available from yfinance
        "analyst_targets": None,
        "revenue_segments": None,
        "geographic_segments": None,
    }
    CACHE.set(f"deep:{ticker}", result)
    return result


def _fetch_analyst_targets(ticker: str) -> dict | None:
    """Fetch analyst price target consensus from FMP."""
    cached = CACHE.get(f"analyst:{ticker}", TTL_ANALYST)
    if cached:
        return cached

    try:
        # Price target consensus
        consensus = _fmp_get("/price-target-consensus", {"symbol": ticker})
        if not isinstance(consensus, list) or not consensus:
            return None
        c = consensus[0]

        # Price target summary (more detail)
        summary = _fmp_get("/price-target-summary", {"symbol": ticker})
        s = summary[0] if isinstance(summary, list) and summary else {}

        result = {
            "target_consensus": _safe_float(c.get("targetConsensus")),
            "target_high": _safe_float(c.get("targetHigh")),
            "target_low": _safe_float(c.get("targetLow")),
            "target_median": _safe_float(c.get("targetMedian")),
            "num_analysts": int(s.get("lastQuarterCount") or s.get("lastMonthCount") or 0),
            "last_quarter_avg": _safe_float(s.get("lastQuarterAvgPriceTarget")),
            "last_year_avg": _safe_float(s.get("lastYearAvgPriceTarget")),
            "all_time_avg": _safe_float(s.get("allTimeAvgPriceTarget")),
        }
        CACHE.set(f"analyst:{ticker}", result)
        return result
    except Exception as e:
        logger.warning(f"[FMP] Analyst targets unavailable for {ticker}: {e}")
        return None


def _fetch_revenue_segments(ticker: str) -> dict | None:
    """Fetch revenue breakdown by product and geography."""
    cached = CACHE.get(f"segments:{ticker}", TTL_SEGMENTS)
    if cached:
        return cached

    result = {}

    # Product segmentation
    try:
        prod = _fmp_get("/revenue-product-segmentation", {
            "symbol": ticker, "period": "annual", "structure": "flat"
        })
        if isinstance(prod, list) and prod:
            # Group by fiscal year, take most recent
            latest = prod[0] if prod else {}
            year = latest.get("fiscalYear") or latest.get("date", "")
            segments = {}
            for item in prod:
                if (item.get("fiscalYear") or item.get("date", "")[:4]) == str(year)[:4]:
                    name = item.get("name") or item.get("segment") or "Other"
                    value = _safe_float(item.get("revenue") or item.get("value"))
                    if value > 0:
                        segments[name] = value
            if segments:
                total = sum(segments.values())
                result["products"] = {
                    "year": str(year)[:4],
                    "segments": {k: {"revenue": v, "pct": round(v / total * 100, 1)} for k, v in
                                sorted(segments.items(), key=lambda x: -x[1])},
                }
    except Exception as e:
        logger.warning(f"[FMP] Product segments unavailable for {ticker}: {e}")

    # Geographic segmentation
    try:
        geo = _fmp_get("/revenue-geographic-segmentation", {
            "symbol": ticker, "period": "annual", "structure": "flat"
        })
        if isinstance(geo, list) and geo:
            latest = geo[0]
            year = latest.get("fiscalYear") or latest.get("date", "")
            regions = {}
            for item in geo:
                if (item.get("fiscalYear") or item.get("date", "")[:4]) == str(year)[:4]:
                    name = item.get("name") or item.get("region") or "Other"
                    value = _safe_float(item.get("revenue") or item.get("value"))
                    if value > 0:
                        regions[name] = value
            if regions:
                total = sum(regions.values())
                result["geography"] = {
                    "year": str(year)[:4],
                    "regions": {k: {"revenue": v, "pct": round(v / total * 100, 1)} for k, v in
                               sorted(regions.items(), key=lambda x: -x[1])},
                }
    except Exception as e:
        logger.warning(f"[FMP] Geographic segments unavailable for {ticker}: {e}")

    if result:
        CACHE.set(f"segments:{ticker}", result)
        return result
    return None


def get_deep_financials(ticker: str) -> dict:
    """
    Fetch 5-year financials + analyst targets + revenue segments.
    Tries FMP /stable/ first, falls back to yfinance.
    """
    ticker = ticker.upper().strip()

    cached = CACHE.get(f"deep:{ticker}", TTL_DEEP)
    if cached:
        return cached

    # Try FMP /stable/ API
    try:
        income = _fmp_get("/income-statement", {"symbol": ticker, "limit": 5})
        cashflow = _fmp_get("/cash-flow-statement", {"symbol": ticker, "limit": 5})
        balance = _fmp_get("/balance-sheet-statement", {"symbol": ticker, "limit": 5})
        metrics = _fmp_get("/key-metrics", {"symbol": ticker, "limit": 5})
        ratios = _fmp_get("/ratios", {"symbol": ticker, "limit": 5})
    except Exception as e:
        logger.info(f"[FMP] Deep financials failed for {ticker}, falling back to yfinance: {e}")
        return _get_deep_financials_yf(ticker)

    # Normalize
    for var_name in ['income', 'cashflow', 'balance', 'metrics', 'ratios']:
        v = locals()[var_name]
        if not isinstance(v, list):
            locals()[var_name] = []
    if not isinstance(income, list): income = []
    if not isinstance(cashflow, list): cashflow = []
    if not isinstance(balance, list): balance = []
    if not isinstance(metrics, list): metrics = []
    if not isinstance(ratios, list): ratios = []

    n = max(len(income), 1)

    def _extract(source: list, key: str) -> list:
        return [_safe_float(row.get(key)) if row else 0.0 for row in source[:n]]

    # Revenue & Growth
    revenue_5y = _extract(income, "revenue")
    revenue_growth_5y = []
    for i in range(len(revenue_5y) - 1):
        prev, curr = revenue_5y[i + 1], revenue_5y[i]
        revenue_growth_5y.append(round((curr - prev) / prev * 100, 2) if prev else None)
    revenue_growth_5y.append(None)

    # Margins
    def _margin_from_rows(rows, num_key, denom_key="revenue"):
        result = []
        for row in rows[:n]:
            rev = _safe_float(row.get(denom_key))
            val = _safe_float(row.get(num_key))
            result.append(round(val / rev * 100, 2) if rev else None)
        return result

    gross_margin_5y = _margin_from_rows(income, "grossProfit")
    operating_margin_5y = _margin_from_rows(income, "operatingIncome")
    net_margin_5y = _margin_from_rows(income, "netIncome")

    # FCF
    fcf_5y = _extract(cashflow, "freeCashFlow")
    fcf_margin_5y = [round(fcf_5y[i] / revenue_5y[i] * 100, 2)
                     if i < len(revenue_5y) and revenue_5y[i] else None
                     for i in range(len(fcf_5y))]

    # ROIC from ratios
    roic_5y = _extract(ratios, "returnOnCapitalEmployed")
    roic_5y = [round(v * 100, 2) if v and abs(v) < 10 else (v if v else None) for v in roic_5y]

    # Debt/EBITDA
    debt_to_ebitda_5y = []
    for i in range(min(len(balance), len(income))):
        debt = _safe_float(balance[i].get("totalDebt")) if i < len(balance) else 0
        ebitda_val = _safe_float(income[i].get("ebitda")) if i < len(income) else 0
        debt_to_ebitda_5y.append(round(debt / ebitda_val, 2) if ebitda_val else None)

    # EPS
    eps_5y = _extract(income, "epsDiluted")
    eps_growth_5y = []
    for i in range(len(eps_5y) - 1):
        prev, curr = eps_5y[i + 1], eps_5y[i]
        eps_growth_5y.append(round((curr - prev) / abs(prev) * 100, 2) if prev else None)
    eps_growth_5y.append(None)

    # CapEx intensity
    capex_values = _extract(cashflow, "capitalExpenditure")
    capex_intensity = [round(abs(capex_values[i]) / revenue_5y[i] * 100, 2)
                       if i < len(revenue_5y) and revenue_5y[i] else None
                       for i in range(len(capex_values))]

    # Cash conversion
    net_income_5y = _extract(income, "netIncome")
    cash_conversion = [round(fcf_5y[i] / net_income_5y[i], 2)
                       if i < len(net_income_5y) and net_income_5y[i] else None
                       for i in range(len(fcf_5y))]

    # Years
    years = []
    for row in income[:n]:
        date_str = row.get("calendarYear") or row.get("date", "")
        try:
            years.append(int(str(date_str)[:4]))
        except (ValueError, TypeError):
            years.append(None)

    # ── Premium data (new with Starter plan) ──
    analyst_targets = _fetch_analyst_targets(ticker)
    revenue_segments = _fetch_revenue_segments(ticker)

    result = {
        "revenue_5y": revenue_5y,
        "revenue_growth_5y": revenue_growth_5y,
        "gross_margin_5y": gross_margin_5y,
        "operating_margin_5y": operating_margin_5y,
        "net_margin_5y": net_margin_5y,
        "fcf_5y": fcf_5y,
        "fcf_margin_5y": fcf_margin_5y,
        "roic_5y": roic_5y,
        "debt_to_ebitda_5y": debt_to_ebitda_5y,
        "eps_5y": eps_5y,
        "eps_growth_5y": eps_growth_5y,
        "capex_intensity": capex_intensity,
        "cash_conversion": cash_conversion,
        "years": years,
        # Premium
        "analyst_targets": analyst_targets,
        "revenue_segments": revenue_segments.get("products") if revenue_segments else None,
        "geographic_segments": revenue_segments.get("geography") if revenue_segments else None,
    }

    CACHE.set(f"deep:{ticker}", result)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Sector Benchmarks
# ═══════════════════════════════════════════════════════════════════════════════

def get_sector_benchmarks(ticker: str, sector: str) -> dict:
    """Compute sector median benchmarks from peer ratios."""
    cache_key = f"bench:{ticker}:{sector}"
    cached = CACHE.get(cache_key, TTL_ANNUAL)
    if cached:
        return cached

    # With /stable/ API, stock-screener is not available on Starter.
    # Use sector peers + /ratios endpoint instead.
    SECTOR_PEERS: dict[str, list[str]] = {
        "Technology":      ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AVGO", "CRM", "ADBE"],
        "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "SBUX", "MCD", "TJX", "LOW"],
        "Healthcare":      ["JNJ", "PFE", "UNH", "ABT", "MRK", "TMO", "ABBV", "LLY"],
        "Financial Services": ["JPM", "BAC", "GS", "MS", "WFC", "BLK", "SCHW", "AXP"],
        "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "T", "VZ", "TMUS", "CMCSA"],
        "Industrials":     ["BA", "CAT", "GE", "UPS", "HON", "RTX", "LMT", "DE"],
        "Energy":          ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO"],
        "Consumer Defensive": ["KO", "PEP", "PG", "WMT", "COST", "CL", "MDLZ", "PM"],
    }

    peers = [t for t in SECTOR_PEERS.get(sector, ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "JPM", "JNJ"])
             if t != ticker][:8]

    pe_list, gm_list, nm_list, roe_list = [], [], [], []

    for sym in peers:
        try:
            ratios = _fmp_get("/ratios", {"symbol": sym, "limit": 1})
            if not isinstance(ratios, list) or not ratios:
                continue
            r = ratios[0]
            pe = r.get("priceEarningsRatio")
            if pe and 0 < pe < 200:
                pe_list.append(pe)
            gm = r.get("grossProfitMargin")
            if gm is not None:
                gm_list.append(gm * 100)
            nm = r.get("netProfitMargin")
            if nm is not None:
                nm_list.append(nm * 100)
            roe_v = r.get("returnOnEquity")
            if roe_v is not None:
                roe_list.append(roe_v * 100)
        except Exception:
            continue

    def _median(lst: list) -> float | None:
        valid = sorted(x for x in lst if x is not None)
        if not valid:
            return None
        mid = len(valid) // 2
        return round((valid[mid - 1] + valid[mid]) / 2, 2) if len(valid) % 2 == 0 else round(valid[mid], 2)

    result = {
        "median_pe": _median(pe_list),
        "median_gross_margin": _median(gm_list),
        "median_net_margin": _median(nm_list),
        "median_roe": _median(roe_list),
        "peer_count": len(peers),
        "sector": sector,
    }

    CACHE.set(cache_key, result)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Screener Universe
# ═══════════════════════════════════════════════════════════════════════════════

def get_screener_universe() -> list:
    """Fetch a universe of ~200 stocks for the AI screener."""
    cached = CACHE.get("screener_universe", TTL_ANNUAL)
    if cached:
        return cached

    try:
        data = _fmp_get("/stock-screener", {
            "marketCapMoreThan": 1000000000,
            "limit": 200,
            "exchange": "NASDAQ,NYSE",
        })
    except Exception as e:
        logger.warning(f"[FMP] Stock screener unavailable: {e}")
        # Fallback: use a curated list of ~60 popular stocks
        return _get_fallback_universe()

    if not isinstance(data, list) or not data:
        return _get_fallback_universe()

    universe = []
    for s in data:
        if not s.get("symbol") or not s.get("companyName"):
            continue
        universe.append({
            "symbol": s.get("symbol"),
            "name": s.get("companyName"),
            "sector": s.get("sector", ""),
            "industry": s.get("industry", ""),
            "marketCap": s.get("marketCap", 0),
            "country": s.get("country", ""),
            "beta": s.get("beta"),
            "pe": s.get("priceEarningsRatio") or s.get("pe"),
            "price": s.get("price", 0),
        })

    CACHE.set("screener_universe", universe)
    return universe


def _get_fallback_universe() -> list:
    """Fallback universe when FMP screener is unavailable."""
    TICKERS = [
        ("AAPL", "Apple Inc.", "Technology"), ("MSFT", "Microsoft Corp", "Technology"),
        ("GOOGL", "Alphabet Inc.", "Communication Services"), ("AMZN", "Amazon.com Inc.", "Consumer Cyclical"),
        ("NVDA", "NVIDIA Corp", "Technology"), ("META", "Meta Platforms", "Communication Services"),
        ("TSLA", "Tesla Inc.", "Consumer Cyclical"), ("BRK-B", "Berkshire Hathaway", "Financial Services"),
        ("JPM", "JPMorgan Chase", "Financial Services"), ("JNJ", "Johnson & Johnson", "Healthcare"),
        ("V", "Visa Inc.", "Financial Services"), ("UNH", "UnitedHealth Group", "Healthcare"),
        ("HD", "Home Depot", "Consumer Cyclical"), ("PG", "Procter & Gamble", "Consumer Defensive"),
        ("MA", "Mastercard", "Financial Services"), ("ABBV", "AbbVie Inc.", "Healthcare"),
        ("KO", "Coca-Cola Co.", "Consumer Defensive"), ("PEP", "PepsiCo Inc.", "Consumer Defensive"),
        ("COST", "Costco Wholesale", "Consumer Defensive"), ("MRK", "Merck & Co.", "Healthcare"),
        ("AVGO", "Broadcom Inc.", "Technology"), ("CRM", "Salesforce Inc.", "Technology"),
        ("ADBE", "Adobe Inc.", "Technology"), ("AMD", "AMD Inc.", "Technology"),
        ("NFLX", "Netflix Inc.", "Communication Services"), ("DIS", "Walt Disney Co.", "Communication Services"),
        ("XOM", "Exxon Mobil", "Energy"), ("CVX", "Chevron Corp", "Energy"),
        ("WMT", "Walmart Inc.", "Consumer Defensive"), ("BAC", "Bank of America", "Financial Services"),
        ("LLY", "Eli Lilly", "Healthcare"), ("TMO", "Thermo Fisher", "Healthcare"),
        ("GS", "Goldman Sachs", "Financial Services"), ("CAT", "Caterpillar Inc.", "Industrials"),
        ("BA", "Boeing Co.", "Industrials"), ("NEE", "NextEra Energy", "Utilities"),
        ("GE", "GE Aerospace", "Industrials"), ("RTX", "RTX Corp", "Industrials"),
        ("UBER", "Uber Technologies", "Technology"), ("SQ", "Block Inc.", "Technology"),
        ("SHOP", "Shopify Inc.", "Technology"), ("SPOT", "Spotify Technology", "Communication Services"),
        ("NET", "Cloudflare Inc.", "Technology"), ("CRWD", "CrowdStrike", "Technology"),
        ("SNOW", "Snowflake Inc.", "Technology"), ("DDOG", "Datadog Inc.", "Technology"),
        ("ZS", "Zscaler Inc.", "Technology"), ("PANW", "Palo Alto Networks", "Technology"),
        ("PLTR", "Palantir Technologies", "Technology"), ("COIN", "Coinbase Global", "Financial Services"),
    ]
    return [
        {"symbol": t[0], "name": t[1], "sector": t[2], "industry": "", "marketCap": 0,
         "country": "US", "beta": None, "pe": None, "price": 0}
        for t in TICKERS
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# FMP Endpoint Status (admin/diagnostic)
# ═══════════════════════════════════════════════════════════════════════════════

def test_fmp_endpoints() -> dict:
    """Test which FMP /stable/ endpoints are accessible with current plan."""
    endpoints = {
        "quote":                       {"symbol": "AAPL"},
        "profile":                     {"symbol": "AAPL"},
        "income-statement":            {"symbol": "AAPL", "limit": "1"},
        "cash-flow-statement":         {"symbol": "AAPL", "limit": "1"},
        "balance-sheet-statement":     {"symbol": "AAPL", "limit": "1"},
        "key-metrics":                 {"symbol": "AAPL", "limit": "1"},
        "ratios":                      {"symbol": "AAPL", "limit": "1"},
        "price-target-consensus":      {"symbol": "AAPL"},
        "price-target-summary":        {"symbol": "AAPL"},
        "revenue-product-segmentation": {"symbol": "AAPL", "period": "annual", "structure": "flat"},
        "revenue-geographic-segmentation": {"symbol": "AAPL", "period": "annual", "structure": "flat"},
        "earnings-calendar":           {"symbol": "AAPL"},
    }

    results = {}
    for name, params in endpoints.items():
        try:
            data = _fmp_get(f"/{name}", params)
            count = len(data) if isinstance(data, list) else 1
            results[name] = {"status": "ok", "items": count}
        except RuntimeError as e:
            if "403" in str(e) or "Upgrade" in str(e):
                results[name] = {"status": "upgrade_required"}
            else:
                results[name] = {"status": "error", "detail": str(e)[:100]}
        except Exception as e:
            results[name] = {"status": "error", "detail": str(e)[:100]}

    return {
        "endpoints": results,
        "accessible": sum(1 for v in results.values() if v["status"] == "ok"),
        "total_tested": len(results),
        "fmp_usage": get_fmp_call_count(),
    }
