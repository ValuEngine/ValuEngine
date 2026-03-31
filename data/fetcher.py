import streamlit as st
import pandas as pd
import yfinance as yf

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


@st.cache_data(ttl=86400)
def get_company_data(ticker: str) -> dict:
    try:
        t = yf.Ticker(ticker)
        info = t.info

        if not info or (not info.get("currentPrice") and not info.get("regularMarketPrice")):
            st.error(f"Ticker '{ticker}' introuvable ou donnees indisponibles.")
            return {}

        price  = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        shares = info.get("sharesOutstanding") or 0
        mkt_cap = info.get("marketCap") or (price * shares) or 0
        fcf    = info.get("freeCashflow") or 0

        # FCF historique
        fcf_history = []
        try:
            cf = t.cashflow
            if cf is not None and not cf.empty:
                for label in ["Free Cash Flow", "Operating Cash Flow"]:
                    if label in cf.index:
                        for date, val in cf.loc[label].items():
                            if pd.notna(val):
                                fcf_history.append({"date": str(date)[:10], "fcf": float(val)})
                        if fcf_history and fcf == 0:
                            fcf = fcf_history[0]["fcf"]
                        break
        except Exception:
            pass

        # Croissance revenus
        rev_growth = info.get("revenueGrowth") or 0
        if not rev_growth:
            try:
                fin = t.financials
                if fin is not None and not fin.empty and "Total Revenue" in fin.index:
                    vals = [v for v in fin.loc["Total Revenue"].values if pd.notna(v)]
                    if len(vals) >= 2:
                        rev_growth = (vals[0] - vals[1]) / abs(vals[1]) if vals[1] else 0
            except Exception:
                pass

        return {
            "ticker":             ticker,
            "name":               info.get("longName") or info.get("shortName") or ticker,
            "sector":             info.get("sector") or "Unknown",
            "price":              price,
            "mktCap":             mkt_cap,
            "sharesOutstanding":  shares,
            "beta":               info.get("beta") or 1.0,
            "revenue":            info.get("totalRevenue") or 0,
            "netIncome":          info.get("netIncomeToCommon") or 0,
            "ebitda":             info.get("ebitda") or 0,
            "eps":                info.get("trailingEps") or 0,
            "freeCashFlow":       fcf,
            "fcf_history":        fcf_history,
            "revenueGrowth":      rev_growth,
            "totalDebt":          info.get("totalDebt") or 0,
            "cashAndEquivalents": info.get("totalCash") or 0,
            "peRatio":            info.get("trailingPE") or 0,
            "pbRatio":            info.get("priceToBook") or 0,
            "evToEbitda":         info.get("enterpriseToEbitda") or 0,
            "roe":                info.get("returnOnEquity") or 0,
            "debtToEquity":       info.get("debtToEquity") or 0,
            "description":        info.get("longBusinessSummary") or "",
        }

    except Exception as e:
        st.error(f"Erreur lors de la recuperation des donnees : {e}")
        return {}


@st.cache_data(ttl=86400)
def get_peers_data(ticker: str, sector: str) -> pd.DataFrame:
    peers = SECTOR_PEERS.get(sector, [])
    all_tickers = list(dict.fromkeys([ticker] + peers))[:5]
    rows = []

    for t_str in all_tickers:
        try:
            info = yf.Ticker(t_str).info
            if not info:
                continue
            price   = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            mkt_cap = info.get("marketCap") or 0
            rows.append({
                "Ticker":       t_str,
                "Entreprise":   info.get("longName") or info.get("shortName") or t_str,
                "Prix ($)":     round(price, 2),
                "Mkt Cap ($B)": round(mkt_cap / 1e9, 1),
                "P/E":          round(info.get("trailingPE") or 0, 1),
                "EV/EBITDA":    round(info.get("enterpriseToEbitda") or 0, 1),
                "P/B":          round(info.get("priceToBook") or 0, 1),
            })
        except Exception:
            continue

    if not rows:
        return pd.DataFrame()

    return pd.DataFrame(rows).sort_values("Mkt Cap ($B)", ascending=False).reset_index(drop=True)
