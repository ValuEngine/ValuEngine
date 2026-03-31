import requests
import streamlit as st
import pandas as pd
from typing import Optional

BASE_URL = "https://www.alphavantage.co/query"

_FALLBACK_KEYS = [
    "REDACTED_AV1",
    "REDACTED_AV2",
    "REDACTED_AV3",
]

SECTOR_PEERS = {
    "Technology":            ["AAPL", "MSFT", "GOOGL", "META", "NVDA"],
    "Consumer Cyclical":     ["AMZN", "TSLA", "NKE", "MCD", "SBUX"],
    "Consumer Defensive":    ["KO", "PEP", "PG", "WMT", "COST"],
    "Healthcare":            ["JNJ", "UNH", "PFE", "ABBV", "MRK"],
    "Financial Services":    ["JPM", "BAC", "GS", "MS", "V"],
    "Industrials":           ["HON", "GE", "CAT", "BA", "MMM"],
    "Energy":                ["XOM", "CVX", "COP", "SLB", "EOG"],
    "Communication Services":["GOOGL", "META", "NFLX", "DIS", "T"],
    "Real Estate":           ["AMT", "PLD", "CCI", "EQIX", "SPG"],
    "Utilities":             ["NEE", "DUK", "SO", "D", "AEP"],
    "Basic Materials":       ["LIN", "APD", "ECL", "DD", "NEM"],
}


def _get_keys():
    try:
        return [
            st.secrets.get("AV_KEY_1") or _FALLBACK_KEYS[0],
            st.secrets.get("AV_KEY_2") or _FALLBACK_KEYS[1],
            st.secrets.get("AV_KEY_3") or _FALLBACK_KEYS[2],
        ]
    except Exception:
        return _FALLBACK_KEYS[:]


def _fetch(function: str, symbol: str) -> dict:
    """Essaie chaque clé jusqu'à succès."""
    keys = _get_keys()
    last_error = None
    for key in keys:
        try:
            r = requests.get(
                BASE_URL,
                params={"function": function, "symbol": symbol, "apikey": key},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
            if "Note" in data or "Information" in data:
                last_error = "rate_limit"
                continue
            return data
        except requests.exceptions.RequestException as e:
            last_error = str(e)
            continue
    if last_error == "rate_limit":
        raise Exception("Limite Alpha Vantage atteinte. Revenez demain.")
    raise Exception(f"Erreur réseau : {last_error}")


def _f(d: dict, *keys, default: float = 0.0) -> float:
    """Extraction sécurisée d'un float depuis un dict."""
    for k in keys:
        v = d.get(k)
        if v is not None and str(v).strip() not in ("None", "N/A", "-", "", "0"):
            try:
                return float(str(v).replace(",", "").replace("%", ""))
            except (ValueError, TypeError):
                continue
    return default


def _f_zero_ok(d: dict, *keys, default: float = 0.0) -> float:
    """Comme _f mais accepte 0 comme valeur valide."""
    for k in keys:
        v = d.get(k)
        if v is not None and str(v).strip() not in ("None", "N/A", "-", ""):
            try:
                return float(str(v).replace(",", "").replace("%", ""))
            except (ValueError, TypeError):
                continue
    return default


@st.cache_data(ttl=86400)
def get_company_data(ticker: str) -> Optional[dict]:
    """Récupère les données financières complètes d'une entreprise."""
    ticker = ticker.upper().strip()

    try:
        # CALL 1 : OVERVIEW
        ov = _fetch("OVERVIEW", ticker)
        if not ov or "Symbol" not in ov:
            return None

        # CALL 2 : GLOBAL_QUOTE
        gq = _fetch("GLOBAL_QUOTE", ticker)
        quote = gq.get("Global Quote", {})

        # ── Données directes ──────────────────────────────────────────────
        price    = _f(quote, "05. price")
        revenue  = _f(ov, "RevenueTTM")
        ebitda   = _f(ov, "EBITDA")
        mktcap   = _f(ov, "MarketCapitalization")
        shares   = _f(ov, "SharesOutstanding")
        beta     = _f_zero_ok(ov, "Beta")
        roe      = _f(ov, "ReturnOnEquityTTM")

        # EPS — clé de fallback pour P/E, net_income, FCF
        eps = _f(ov, "EPS", "DilutedEPSTTM")

        # ── P/E : direct ou calculé via EPS ───────────────────────────────
        pe = _f(ov, "TrailingPE")
        if pe == 0.0 and eps > 0 and price > 0:
            pe = round(price / eps, 2)

        # ── Net Income : Revenue×Margin ou EPS×Shares ─────────────────────
        profit_m = _f(ov, "ProfitMargin")
        if profit_m > 0:
            net_income = revenue * profit_m
        elif eps > 0 and shares > 0:
            net_income = eps * shares
            profit_m   = net_income / revenue if revenue > 0 else 0.0
        else:
            net_income = 0.0

        # FCF ≈ Net Income (proxy)
        fcf = net_income

        # ── EV / EBITDA : direct ou calculé ───────────────────────────────
        ev_ebitda = _f(ov, "EVToEBITDA")
        if ev_ebitda == 0.0 and ebitda > 0 and mktcap > 0:
            # Approximation : EV ≈ MarketCap (on ignore dette pour simplifier)
            ev_ebitda = round(mktcap / ebitda, 2)

        # ── Dette nette ───────────────────────────────────────────────────
        if ev_ebitda > 0 and ebitda > 0:
            net_debt = max((ebitda * ev_ebitda) - mktcap, 0.0)
        else:
            net_debt = 0.0

        # ── P/B et croissance ─────────────────────────────────────────────
        pbv        = _f(ov, "PriceToBookRatio")
        rev_growth = _f_zero_ok(ov, "QuarterlyRevenueGrowthYOY")

        return {
            "ticker":             ticker,
            "name":               ov.get("Name", ticker),
            "sector":             ov.get("Sector", "N/A"),
            "description":        ov.get("Description", ""),
            "price":              price,
            "revenue":            revenue,
            "ebitda":             ebitda,
            "fcf":                fcf,
            "net_income":         net_income,
            "profit_margin":      profit_m,
            "shares_outstanding": shares,
            "market_cap":         mktcap,
            "net_debt":           net_debt,
            "ev_ebitda":          ev_ebitda,
            "pe_ratio":           pe,
            "pb_ratio":           pbv,
            "roe":                roe,
            "beta":               beta,
            "revenue_growth":     rev_growth,
            "eps":                eps,
            "currency":           ov.get("Currency", "USD"),
            "exchange":           ov.get("Exchange", ""),
        }

    except Exception as e:
        raise Exception(f"Erreur lors de la récupération des données : {e}")


@st.cache_data(ttl=86400)
def get_peers_data(ticker: str, sector: str) -> Optional[pd.DataFrame]:
    """Récupère les comparables du même secteur."""
    ticker = ticker.upper().strip()
    candidates = SECTOR_PEERS.get(sector, ["AAPL", "MSFT", "GOOGL", "AMZN"])
    peers = [t for t in candidates if t != ticker][:4]

    rows = []
    for t in peers:
        try:
            d = get_company_data(t)
            if d:
                rows.append({
                    "Ticker":    d["ticker"],
                    "Nom":       d["name"],
                    "Prix":      d["price"],
                    "P/E":       round(d["pe_ratio"], 1) if d["pe_ratio"] else "N/A",
                    "EV/EBITDA": round(d["ev_ebitda"], 1) if d["ev_ebitda"] else "N/A",
                    "Marge (%)": round(d["profit_margin"] * 100, 1) if d["profit_margin"] else 0,
                    "Beta":      round(d["beta"], 2),
                })
        except Exception:
            continue

    return pd.DataFrame(rows) if rows else None
