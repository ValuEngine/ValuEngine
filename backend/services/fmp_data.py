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
    base = "https://financialmodelingprep.com/api/v3"
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
    profile_raw = _fmp_get(f"/profile/{ticker}", {})
    if not profile_raw or not isinstance(profile_raw, list) or not profile_raw[0]:
        raise ValueError(f"Ticker '{ticker}' introuvable sur FMP.")

    p = profile_raw[0]

    # ── 2. Income statement (dernière année) ─────────────────────────────────
    income_raw = _fmp_get(f"/income-statement/{ticker}", {"limit": 1})
    inc = income_raw[0] if isinstance(income_raw, list) and income_raw else {}

    # ── 3. Cash flow statement ───────────────────────────────────────────────
    cf_raw = _fmp_get(f"/cash-flow-statement/{ticker}", {"limit": 1})
    cf = cf_raw[0] if isinstance(cf_raw, list) and cf_raw else {}

    # ── 4. Balance sheet ─────────────────────────────────────────────────────
    bs_raw = _fmp_get(f"/balance-sheet-statement/{ticker}", {"limit": 1})
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
    income_2y = _fmp_get(f"/income-statement/{ticker}", {"limit": 2})
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
    peers_raw = _fmp_get(f"/stock_peers_bulk", {"symbol": ticker})
    peers: list[str] = []
    if isinstance(peers_raw, list) and peers_raw:
        # v3 format: [{"symbol": "AAPL", "peersList": ["MSFT", "GOOGL", ...]}]
        first = peers_raw[0] if peers_raw else {}
        peer_list = first.get("peersList", [])
        if peer_list:
            peers = [p for p in peer_list[:6] if p != ticker]
        else:
            peers = [p["symbol"] for p in peers_raw[:6] if p.get("symbol") and p.get("symbol") != ticker]

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
            profile = _fmp_get(f"/profile/{peer}", {})
            if not isinstance(profile, list) or not profile:
                continue
            pr = profile[0]

            # Income statement pour calculer les ratios (évite /key-metrics et /ratios qui sont payants)
            peer_income = _fmp_get(f"/income-statement/{peer}", {"limit": 1})
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


# ── NIVEAU 1 — Deep Financials (5 ans) ──────────────────────────────────────

def _get_deep_financials_yf(ticker: str) -> dict:
    """Fallback: extract 5-year financials from yfinance when FMP is unavailable."""
    import yfinance as yf

    cache_key = f"__deep__{ticker}"

    t = yf.Ticker(ticker)
    inc = t.financials  # columns = years, rows = line items
    cf = t.cashflow
    bs = t.balance_sheet

    def _col_values(df, row_name):
        """Extract values for a given row across all year columns."""
        if df is None or df.empty or row_name not in df.index:
            return []
        return [float(v) if v == v else 0.0 for v in df.loc[row_name].values[:5]]

    # Revenue & Net Income
    revenue_5y = _col_values(inc, "Total Revenue")
    net_income_5y = _col_values(inc, "Net Income")
    gross_profit_5y = _col_values(inc, "Gross Profit")
    operating_income_5y = _col_values(inc, "Operating Income")
    ebitda_5y = _col_values(inc, "EBITDA")

    # FCF
    op_cf = _col_values(cf, "Operating Cash Flow") or _col_values(cf, "Total Cash From Operating Activities")
    capex = _col_values(cf, "Capital Expenditure") or _col_values(cf, "Capital Expenditures")
    fcf_5y = [op_cf[i] + capex[i] if i < len(capex) else op_cf[i] for i in range(len(op_cf))]

    # Balance sheet
    total_debt_5y = _col_values(bs, "Total Debt") or _col_values(bs, "Long Term Debt")
    total_equity_5y = _col_values(bs, "Stockholders Equity") or _col_values(bs, "Total Stockholder Equity")

    n = max(len(revenue_5y), 1)

    # Growth rates
    revenue_growth_5y = []
    for i in range(len(revenue_5y) - 1):
        prev = revenue_5y[i + 1]
        curr = revenue_5y[i]
        revenue_growth_5y.append(round((curr - prev) / prev * 100, 2) if prev else None)
    revenue_growth_5y.append(None)

    # Margins
    def _margin(num_list, denom_list):
        result = []
        for i in range(min(len(num_list), len(denom_list))):
            d = denom_list[i]
            result.append(round(num_list[i] / d * 100, 2) if d else None)
        return result

    gross_margin_5y = _margin(gross_profit_5y, revenue_5y)
    operating_margin_5y = _margin(operating_income_5y, revenue_5y)
    net_margin_5y = _margin(net_income_5y, revenue_5y)
    fcf_margin_5y = _margin(fcf_5y, revenue_5y)

    # Debt/EBITDA
    debt_to_ebitda_5y = []
    for i in range(min(len(total_debt_5y), len(ebitda_5y))):
        eb = ebitda_5y[i]
        debt_to_ebitda_5y.append(round(total_debt_5y[i] / eb, 2) if eb else None)

    # ROIC approximation (Operating Income / (Debt + Equity))
    roic_5y = []
    for i in range(min(len(operating_income_5y), len(total_debt_5y), len(total_equity_5y))):
        ic = total_debt_5y[i] + total_equity_5y[i]
        roic_5y.append(round(operating_income_5y[i] / ic * 100, 2) if ic else None)

    # EPS
    eps_5y = _col_values(inc, "Diluted EPS") or _col_values(inc, "Basic EPS")
    eps_growth_5y = []
    for i in range(len(eps_5y) - 1):
        prev = eps_5y[i + 1]
        curr = eps_5y[i]
        eps_growth_5y.append(round((curr - prev) / abs(prev) * 100, 2) if prev else None)
    eps_growth_5y.append(None)

    # CapEx intensity
    capex_intensity = _margin([abs(c) for c in capex], revenue_5y) if capex else []

    # Cash conversion
    cash_conversion = []
    for i in range(min(len(fcf_5y), len(net_income_5y))):
        ni = net_income_5y[i]
        cash_conversion.append(round(fcf_5y[i] / ni, 2) if ni else None)

    # Years
    years = []
    if inc is not None and not inc.empty:
        for col in inc.columns[:5]:
            try:
                years.append(col.year if hasattr(col, "year") else int(str(col)[:4]))
            except Exception:
                years.append(None)

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
    }
    _cache_set(cache_key, result)
    return result

def get_deep_financials(ticker: str) -> dict:
    """
    Fetch 5 years of income statement, cash flow, balance sheet, key metrics
    and financial ratios. Tries FMP first, falls back to yfinance if FMP fails.
    """
    ticker = ticker.upper().strip()

    # Check cache (separate key)
    cache_key = f"__deep__{ticker}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    # Try FMP first, fallback to yfinance
    try:
        income = _fmp_get(f"/income-statement/{ticker}", {"limit": 5})
        cashflow = _fmp_get(f"/cash-flow-statement/{ticker}", {"limit": 5})
        balance = _fmp_get(f"/balance-sheet-statement/{ticker}", {"limit": 5})
        metrics = _fmp_get(f"/key-metrics/{ticker}", {"limit": 5})
        ratios = _fmp_get(f"/financial-ratios/{ticker}", {"limit": 5})
    except Exception:
        # FMP failed (403/rate limit) — use yfinance fallback
        return _get_deep_financials_yf(ticker)

    # Normalize to lists
    if not isinstance(income, list): income = []
    if not isinstance(cashflow, list): cashflow = []
    if not isinstance(balance, list): balance = []
    if not isinstance(metrics, list): metrics = []
    if not isinstance(ratios, list): ratios = []

    n = max(len(income), 1)

    # Helper to safely extract a list of floats
    def _extract(source: list, key: str) -> list:
        return [_safe_float(row.get(key)) if row else 0.0 for row in source[:n]]

    # ── Revenue & Growth ──
    revenue_5y = _extract(income, "revenue")
    revenue_growth_5y = []
    for i in range(len(revenue_5y) - 1):
        prev = revenue_5y[i + 1]
        curr = revenue_5y[i]
        revenue_growth_5y.append(round((curr - prev) / prev * 100, 2) if prev else None)
    revenue_growth_5y.append(None)  # oldest year has no prior

    # ── Margins ──
    gross_margin_5y = []
    for row in income[:n]:
        rev = _safe_float(row.get("revenue"))
        gp = _safe_float(row.get("grossProfit"))
        gross_margin_5y.append(round(gp / rev * 100, 2) if rev else None)

    operating_margin_5y = []
    for row in income[:n]:
        rev = _safe_float(row.get("revenue"))
        oi = _safe_float(row.get("operatingIncome"))
        operating_margin_5y.append(round(oi / rev * 100, 2) if rev else None)

    net_margin_5y = []
    for row in income[:n]:
        rev = _safe_float(row.get("revenue"))
        ni = _safe_float(row.get("netIncome"))
        net_margin_5y.append(round(ni / rev * 100, 2) if rev else None)

    # ── FCF ──
    fcf_5y = _extract(cashflow, "freeCashFlow")
    fcf_margin_5y = []
    for i in range(min(len(fcf_5y), len(revenue_5y))):
        rev = revenue_5y[i]
        fcf_margin_5y.append(round(fcf_5y[i] / rev * 100, 2) if rev else None)

    # ── ROIC ──
    roic_5y = _extract(ratios, "returnOnCapitalEmployed")
    roic_5y = [round(v * 100, 2) if v else None for v in roic_5y]

    # ── Debt/EBITDA ──
    debt_to_ebitda_5y = []
    for i in range(min(len(balance), len(income))):
        debt = _safe_float(balance[i].get("totalDebt")) if i < len(balance) else 0
        ebitda = _safe_float(income[i].get("ebitda")) if i < len(income) else 0
        debt_to_ebitda_5y.append(round(debt / ebitda, 2) if ebitda else None)

    # ── EPS ──
    eps_5y = _extract(income, "epsDiluted")
    eps_growth_5y = []
    for i in range(len(eps_5y) - 1):
        prev = eps_5y[i + 1]
        curr = eps_5y[i]
        eps_growth_5y.append(round((curr - prev) / abs(prev) * 100, 2) if prev else None)
    eps_growth_5y.append(None)

    # ── CapEx intensity ──
    capex_values = _extract(cashflow, "capitalExpenditure")
    capex_intensity = []
    for i in range(min(len(capex_values), len(revenue_5y))):
        rev = revenue_5y[i]
        capex_intensity.append(round(abs(capex_values[i]) / rev * 100, 2) if rev else None)

    # ── Cash conversion (FCF / Net Income) ──
    net_income_5y = _extract(income, "netIncome")
    cash_conversion = []
    for i in range(min(len(fcf_5y), len(net_income_5y))):
        ni = net_income_5y[i]
        cash_conversion.append(round(fcf_5y[i] / ni, 2) if ni else None)

    # ── Years ──
    years = []
    for row in income[:n]:
        date_str = row.get("calendarYear") or row.get("date", "")
        try:
            years.append(int(str(date_str)[:4]))
        except (ValueError, TypeError):
            years.append(None)

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
    }

    _cache_set(cache_key, result)
    return result


# ── NIVEAU 2 — Sector Benchmarks ────────────────────────────────────────────

def get_sector_benchmarks(ticker: str, sector: str) -> dict:
    """
    Fetch sector peers via FMP screener and compute median benchmarks.
    """
    cache_key = f"__bench__{ticker}_{sector}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    # Use stock screener for the sector
    try:
        screener = _fmp_get("/stock-screener", {
            "sector": sector,
            "limit": 20,
            "marketCapMoreThan": 1_000_000_000,  # >1B market cap
        })
    except Exception:
        screener = []

    if not isinstance(screener, list) or len(screener) < 3:
        # Return empty benchmarks — anomaly detection will skip comparisons
        result = {"peer_count": 0, "sector": sector}
        _cache_set(cache_key, result)
        return result

    # Collect metrics from screener results
    pe_list, pb_list, ps_list = [], [], []
    gm_list, nm_list, roe_list = [], [], []
    de_list, rg_list = [], []

    for s in screener:
        sym = s.get("symbol", "")
        if sym == ticker:
            continue
        pe = s.get("pe")
        if pe and 0 < pe < 200:
            pe_list.append(pe)
        pb = s.get("priceToBook")
        if pb and 0 < pb < 50:
            pb_list.append(pb)
        mc = _safe_float(s.get("marketCap"))
        rev = _safe_float(s.get("revenue")) or _safe_float(s.get("annualRevenue"))
        if mc and rev and rev > 0:
            ps_list.append(mc / rev)

    # For deeper metrics, fetch a few peers' ratios
    peer_symbols = [s.get("symbol") for s in screener if s.get("symbol") != ticker][:8]
    for sym in peer_symbols:
        try:
            r = _fmp_get(f"/financial-ratios/{sym}", {"limit": 1})
            if isinstance(r, list) and r:
                row = r[0]
                gm = row.get("grossProfitMargin")
                if gm is not None:
                    gm_list.append(gm * 100)
                nm = row.get("netProfitMargin")
                if nm is not None:
                    nm_list.append(nm * 100)
                roe_v = row.get("returnOnEquity")
                if roe_v is not None:
                    roe_list.append(roe_v * 100)
                de = row.get("debtEquityRatio")
                if de is not None and 0 < de < 20:
                    de_list.append(de)
        except Exception:
            continue

    def _median(lst: list) -> float | None:
        valid = [x for x in lst if x is not None]
        if not valid:
            return None
        valid.sort()
        mid = len(valid) // 2
        if len(valid) % 2 == 0:
            return round((valid[mid - 1] + valid[mid]) / 2, 2)
        return round(valid[mid], 2)

    result = {
        "median_pe": _median(pe_list),
        "median_pb": _median(pb_list),
        "median_ps": _median(ps_list),
        "median_gross_margin": _median(gm_list),
        "median_net_margin": _median(nm_list),
        "median_roe": _median(roe_list),
        "median_debt_to_equity": _median(de_list),
        "peer_count": len(screener),
        "sector": sector,
    }

    _cache_set(cache_key, result)
    return result
