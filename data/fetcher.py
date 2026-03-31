import requests
import streamlit as st
import pandas as pd

BASE_URL = "https://www.alphavantage.co/query"

# 3 keys → 75 req/jour, rotation automatique
AV_KEYS = [
    st.secrets.get("AV_KEY_1", "REDACTED_AV1"),
    st.secrets.get("AV_KEY_2", "REDACTED_AV2"),
    st.secrets.get("AV_KEY_3", "REDACTED_AV3"),
]

def _fetch(function, symbol):
    """Essaie chaque clé jusqu'à en trouver une qui fonctionne."""
    last_error = None
    for key in AV_KEYS:
        try:
            r = requests.get(
                BASE_URL,
                params={"function": function, "symbol": symbol, "apikey": key},
                timeout=15
            )
            data = r.json()
            # Rate limit détecté → essayer la clé suivante
            if "Note" in data or "Information" in data:
                last_error = "rate_limit"
                continue
            return data
        except Exception as e:
            last_error = str(e)
            continue
    if last_error == "rate_limit":
        raise Exception("Toutes les clés Alpha Vantage sont épuisées aujourd'hui (75 req/jour max). Revenez demain.")
    raise Exception(f"Erreur réseau : {last_error}")


def _f(d, *keys, default=0.0):
    """Extraction sécurisée d'un float depuis un dict."""
    for k in keys:
        v = d.get(k)
        if v and v not in ("None", "N/A", "-", ""):
            try:
                return float(str(v).replace(",", "").replace("%", ""))
            except (ValueError, TypeError):
                continue
    return default


@st.cache_data(ttl=86400)
def get_company_data(ticker: str) -> dict | None:
    ticker = ticker.upper().strip()
    try:
        # CALL 1 : OVERVIEW (fondamentaux)
        ov = _fetch("OVERVIEW", ticker)
        if not ov or "Symbol" not in ov:
            return None

        # CALL 2 : GLOBAL_QUOTE (prix actuel)
        gq = _fetch("GLOBAL_QUOTE", ticker)
        quote = gq.get("Global Quote", {})

        # --- Données brutes ---
        price       = _f(quote, "05. price")
        revenue     = _f(ov, "RevenueTTM")
        ebitda      = _f(ov, "EBITDA")
        profit_m    = _f(ov, "ProfitMargin")
        shares      = _f(ov, "SharesOutstanding")
        mktcap      = _f(ov, "MarketCapitalization")
        ev_ebitda   = _f(ov, "EVToEBITDA")
        pe          = _f(ov, "TrailingPE")
        pbv         = _f(ov, "PriceToBookRatio")
        roe         = _f(ov, "ReturnOnEquityTTM")
        beta        = _f(ov, "Beta")
        rev_growth  = _f(ov, "QuarterlyRevenueGrowthYOY")

        # --- Dérivés ---
        net_income  = revenue * profit_m if profit_m else 0.0
        fcf         = net_income  # approximation FCF ≈ Net Income
        net_debt    = max((ebitda * ev_ebitda) - mktcap, 0.0) if ev_ebitda and ebitda else 0.0

        return {
            "ticker":           ticker,
            "name":             ov.get("Name", ticker),
            "sector":           ov.get("Sector", "N/A"),
            "description":      ov.get("Description", ""),
            "price":            price,
            "revenue":          revenue,
            "ebitda":           ebitda,
            "fcf":              fcf,
            "net_income":       net_income,
            "profit_margin":    profit_m,
            "shares_outstanding": shares,
            "market_cap":       mktcap,
            "net_debt":         net_debt,
            "ev_ebitda":        ev_ebitda,
            "pe_ratio":         pe,
            "pb_ratio":         pbv,
            "roe":              roe,
            "beta":             beta,
            "revenue_growth":   rev_growth,
            "currency":         ov.get("Currency", "USD"),
            "exchange":         ov.get("Exchange", ""),
        }

    except Exception as e:
        raise Exception(f"Erreur lors de la récupération des données : {e}")


@st.cache_data(ttl=86400)
def get_peers_data(tickers: list[str]) -> pd.DataFrame | None:
    """Récupère les données de comparables (peers)."""
    rows = []
    for t in tickers[:4]:  # max 4 peers pour limiter les appels API
        try:
            d = get_company_data(t)
            if d:
                rows.append({
                    "Ticker":    d["ticker"],
                    "Nom":       d["name"],
                    "Prix":      d["price"],
                    "P/E":       d["pe_ratio"],
                    "EV/EBITDA": d["ev_ebitda"],
                    "Marge (%)": round(d["profit_margin"] * 100, 1) if d["profit_margin"] else 0,
                    "Beta":      d["beta"],
                })
        except Exception:
            continue
    return pd.DataFrame(rows) if rows else None
