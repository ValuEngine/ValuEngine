import requests
import streamlit as st
import pandas as pd

BASE_URL = "https://www.alphavantage.co/query"

SECTOR_PEERS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA"],
    "Financial Services": ["JPM", "BAC", "GS", "MS", "WFC"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK"],
    "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "MCD"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG"],
    "Industrials": ["CAT", "BA", "HON", "UPS", "GE"],
    "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "T"],
    "Utilities": ["NEE", "DUK", "SO", "D", "AEP"],
    "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "SPG"],
    "Basic Materials": ["LIN", "APD", "SHW", "FCX", "NEM"],
    "Consumer Defensive": ["WMT", "PG", "KO", "PEP", "COST"],
}


def _get_key():
    try:
        return st.secrets["ALPHA_VANTAGE_KEY"].strip()
    except Exception:
        import os
        return os.environ.get("ALPHA_VANTAGE_KEY", "").strip()


def _get(function: str, symbol: str, key: str) -> dict:
    r = requests.get(BASE_URL, params={
        "function": function,
        "symbol": symbol,
        "apikey": key,
    }, timeout=15)
    r.raise_for_status()
    return r.json()


def _safe_float(d: dict, *keys, default=0.0):
    for k in keys:
        v = d.get(k)
        if v and v not in ("None", "N/A", "-", ""):
            try:
                return float(str(v).replace(",", ""))
            except Exception:
                continue
    return default


@st.cache_data(ttl=86400)
def get_company_data(ticker: str) -> dict:
    key = _get_key()
    if not key:
        st.error("ALPHA_VANTAGE_KEY manquante dans les secrets Streamlit.")
        return {}

    try:
        # -- OVERVIEW (1 call) -----------------------------------------------
        ov = _get("OVERVIEW", ticker, key)

        if "Note" in ov:
            st.error("Limite Alpha Vantage atteinte (25 req/jour). Reessayez demain.")
            return {}
        if "Error Message" in ov or not ov.get("Symbol"):
            st.error(f"Ticker '{ticker}' introuvable sur Alpha Vantage.")
            return {}

        shares = _safe_float(ov, "SharesOutstanding")
        price_raw = _safe_float(ov, "AnalystTargetPrice")

        # Prix en temps reel via GLOBAL_QUOTE (1 call)
        gq = _get("GLOBAL_QUOTE", ticker, key)
        price = _safe_float(gq.get("Global Quote", {}), "05. price") or price_raw

        mkt_cap = _safe_float(ov, "MarketCapitalization")

        # -- INCOME STATEMENT (1 call) ----------------------------------------
        inc_data = _get("INCOME_STATEMENT", ticker, key)
        annual_reports = inc_data.get("annualReports", [])

        revenue    = 0.0
        net_income = 0.0
        ebitda     = 0.0
        rev_growth = 0.0

        if annual_reports:
            r0 = annual_reports[0]
            revenue    = _safe_float(r0, "totalRevenue")
            net_income = _safe_float(r0, "netIncome")
            ebitda     = _safe_float(r0, "ebitda")
            if len(annual_reports) >= 2:
                prev_rev = _safe_float(annual_reports[1], "totalRevenue")
                if prev_rev:
                    rev_growth = (revenue - prev_rev) / abs(prev_rev)

        # -- CASH FLOW (1 call) -----------------------------------------------
        cf_data  = _get("CASH_FLOW", ticker, key)
        cf_reports = cf_data.get("annualReports", [])

        fcf         = 0.0
        fcf_history = []

        if cf_reports:
            for rep in cf_reports:
                op  = _safe_float(rep, "operatingCashflow")
                cap = _safe_float(rep, "capitalExpenditures")
                f   = op - abs(cap)
                fcf_history.append({
                    "date": rep.get("fiscalDateEnding", "")[:4],
                    "fcf":  f
                })
            fcf = fcf_history[0]["fcf"] if fcf_history else 0.0

        # -- BALANCE SHEET (1 call) -------------------------------------------
        bs_data     = _get("BALANCE_SHEET", ticker, key)
        bs_reports  = bs_data.get("annualReports", [])

        total_debt = 0.0
        cash       = 0.0

        if bs_reports:
            b0 = bs_reports[0]
            total_debt = _safe_float(b0, "totalLiabilities", "longTermDebtNoncurrent", "currentLongTermDebt")
            cash       = _safe_float(b0, "cashAndCashEquivalentsAtCarryingValue", "cashAndShortTermInvestments")

        return {
            "ticker":             ticker,
            "name":               ov.get("Name", ticker),
            "sector":             ov.get("Sector", "Unknown"),
            "price":              price,
            "mktCap":             mkt_cap,
            "sharesOutstanding":  shares,
            "beta":               _safe_float(ov, "Beta", default=1.0),
            "revenue":            revenue,
            "netIncome":          net_income,
            "ebitda":             ebitda,
            "eps":                _safe_float(ov, "EPS"),
            "freeCashFlow":       fcf,
            "fcf_history":        fcf_history,
            "revenueGrowth":      rev_growth,
            "totalDebt":          total_debt,
            "cashAndEquivalents": cash,
            "peRatio":            _safe_float(ov, "TrailingPE"),
            "pbRatio":            _safe_float(ov, "PriceToBookRatio"),
            "evToEbitda":         _safe_float(ov, "EVToEBITDA"),
            "roe":                _safe_float(ov, "ReturnOnEquityTTM"),
            "debtToEquity":       _safe_float(ov, "DebtToEquityRatio", default=0.0),
            "description":        ov.get("Description", ""),
        }

    except Exception as e:
        st.error(f"Erreur Alpha Vantage : {e}")
        return {}


@st.cache_data(ttl=86400)
def get_peers_data(ticker: str, sector: str) -> pd.DataFrame:
    key = _get_key()
    peers = SECTOR_PEERS.get(sector, [])
    all_tickers = list(dict.fromkeys([ticker] + peers))[:5]
    rows = []

    for t in all_tickers:
        try:
            ov = _get("OVERVIEW", t, key)
            if "Note" in ov or not ov.get("Symbol"):
                continue

            gq    = _get("GLOBAL_QUOTE", t, key)
            price = _safe_float(gq.get("Global Quote", {}), "05. price")
            mktcap = _safe_float(ov, "MarketCapitalization")

            rows.append({
                "Ticker":       t,
                "Entreprise":   ov.get("Name", t),
                "Prix ($)":     round(price, 2),
                "Mkt Cap ($B)": round(mktcap / 1e9, 1),
                "P/E":          round(_safe_float(ov, "TrailingPE"), 1),
                "EV/EBITDA":    round(_safe_float(ov, "EVToEBITDA"), 1),
                "P/B":          round(_safe_float(ov, "PriceToBookRatio"), 1),
            })
        except Exception:
            continue

    if not rows:
        return pd.DataFrame()

    return pd.DataFrame(rows).sort_values("Mkt Cap ($B)", ascending=False).reset_index(drop=True)
