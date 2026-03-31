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
        import os as _os
        return _os.environ.get("ALPHA_VANTAGE_KEY", "").strip()


def _fetch(function, symbol, key):
    r = requests.get(BASE_URL, params={
        "function": function, "symbol": symbol, "apikey": key
    }, timeout=15)
    r.raise_for_status()
    data = r.json()
    if "Note" in data:
        raise Exception("Limite Alpha Vantage atteinte (25 req/jour). Reessayez demain.")
    if "Information" in data:
        raise Exception("Limite Alpha Vantage depassee. Reessayez dans quelques minutes.")
    return data


def _f(d, *keys, default=0.0):
    for k in keys:
        v = d.get(k)
        if v and str(v).strip() not in ("None", "N/A", "-", ""):
            try:
                return float(str(v).replace(",", "").strip())
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
        # CALL 1 — OVERVIEW (donnees fondamentales)
        ov = _fetch("OVERVIEW", ticker, key)
        if not ov.get("Symbol"):
            st.error(f"Ticker '{ticker}' introuvable sur Alpha Vantage.")
            return {}

        # CALL 2 — GLOBAL_QUOTE (prix en temps reel)
        gq = _fetch("GLOBAL_QUOTE", ticker, key)
        price = _f(gq.get("Global Quote", {}), "05. price")

        # Donnees directes depuis OVERVIEW
        revenue       = _f(ov, "RevenueTTM")
        ebitda        = _f(ov, "EBITDA")
        profit_margin = _f(ov, "ProfitMargin")
        shares        = _f(ov, "SharesOutstanding")
        mkt_cap       = _f(ov, "MarketCapitalization")
        ev_ebitda     = _f(ov, "EVToEBITDA")
        rev_growth    = _f(ov, "QuarterlyRevenueGrowthYOY")

        # Calculs derives
        net_income = revenue * profit_margin if revenue and profit_margin else 0.0
        fcf = net_income  # FCF approxime par le resultat net (conservateur)

        # Dette nette : derive de EV et Market Cap
        # EV = EBITDA x EV/EBITDA => Dette nette = EV - Market Cap
        net_debt = 0.0
        if ebitda and ev_ebitda and mkt_cap:
            ev = ebitda * ev_ebitda
            net_debt = ev - mkt_cap

        total_debt = max(0.0, net_debt)
        cash       = max(0.0, -net_debt)

        return {
            "ticker":             ticker,
            "name":               ov.get("Name", ticker),
            "sector":             ov.get("Sector", "Unknown"),
            "price":              price,
            "mktCap":             mkt_cap,
            "sharesOutstanding":  shares,
            "beta":               _f(ov, "Beta", default=1.0),
            "revenue":            revenue,
            "netIncome":          net_income,
            "ebitda":             ebitda,
            "eps":                _f(ov, "EPS"),
            "freeCashFlow":       fcf,
            "fcf_history":        [],
            "revenueGrowth":      rev_growth,
            "totalDebt":          total_debt,
            "cashAndEquivalents": cash,
            "peRatio":            _f(ov, "TrailingPE"),
            "pbRatio":            _f(ov, "PriceToBookRatio"),
            "evToEbitda":         ev_ebitda,
            "roe":                _f(ov, "ReturnOnEquityTTM"),
            "debtToEquity":       _f(ov, "BookValue", default=0.0),
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
            ov = _fetch("OVERVIEW", t, key)
            if not ov.get("Symbol"):
                continue
            mkt_cap = _f(ov, "MarketCapitalization")
            shares  = _f(ov, "SharesOutstanding")
            price   = (mkt_cap / shares) if shares > 0 else 0.0
            rows.append({
                "Ticker":       t,
                "Entreprise":   ov.get("Name", t),
                "Prix ($)":     round(price, 2),
                "Mkt Cap ($B)": round(mkt_cap / 1e9, 1),
                "P/E":          round(_f(ov, "TrailingPE"), 1),
                "EV/EBITDA":    round(_f(ov, "EVToEBITDA"), 1),
                "P/B":          round(_f(ov, "PriceToBookRatio"), 1),
            })
        except Exception:
            continue

    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("Mkt Cap ($B)", ascending=False).reset_index(drop=True)
