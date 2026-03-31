import streamlit as st
import pandas as pd
import yfinance as yf
import requests

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


def _make_session():
    """Session avec headers pour eviter le rate limiting Yahoo Finance."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    })
    return s


@st.cache_data(ttl=86400)
def get_company_data(ticker: str) -> dict:
    """Recupere les donnees d'une entreprise via yfinance."""
    try:
        session = _make_session()
        t = yf.Ticker(ticker, session=session)
        info = t.info

        if not info or info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
            st.error(f"Ticker '{ticker}' introuvable ou donnees indisponibles.")
            return {}

        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        shares = info.get("sharesOutstanding") or 0
        mkt_cap = info.get("marketCap") or (price * shares) or 0

        # Free Cash Flow
        fcf = info.get("freeCashflow") or 0

        # FCF historique depuis les cash flows
        fcf_history = []
        try:
            cf_stmt = t.cashflow
            if cf_stmt is not None and not cf_stmt.empty:
                if "Free Cash Flow" in cf_stmt.index:
                    fcf_row = cf_stmt.loc["Free Cash Flow"]
                elif "Operating Cash Flow" in cf_stmt.index:
                    fcf_row = cf_stmt.loc["Operating Cash Flow"]
                else:
                    fcf_row = None

                if fcf_row is not None:
                    for date, val in fcf_row.items():
                        if pd.notna(val):
                            fcf_history.append({
                                "date": str(date)[:10],
                                "fcf": float(val)
                            })
                    if fcf_history and fcf == 0:
                        fcf = fcf_history[0]["fcf"]
        except Exception:
            pass

        # Revenue growth
        rev_growth = 0
        try:
            financials = t.financials
            if financials is not None and not financials.empty and "Total Revenue" in financials.index:
                rev_row = financials.loc["Total Revenue"]
                vals = [v for v in rev_row.values if pd.notna(v)]
                if len(vals) >= 2:
                    rev_growth = (vals[0] - vals[1]) / abs(vals[1]) if vals[1] != 0 else 0
        except Exception:
            pass

        sector = info.get("sector", "Unknown")

        result = {
            "ticker":               ticker,
            "name":                 info.get("longName") or info.get("shortName") or ticker,
            "sector":               sector,
            "price":                price,
            "mktCap":               mkt_cap,
            "sharesOutstanding":    shares,
            "beta":                 info.get("beta") or 1.0,
            "revenue":              info.get("totalRevenue") or 0,
            "netIncome":            info.get("netIncomeToCommon") or 0,
            "ebitda":               info.get("ebitda") or 0,
            "eps":                  info.get("trailingEps") or 0,
            "freeCashFlow":         fcf,
            "fcf_history":          fcf_history,
            "revenueGrowth":        info.get("revenueGrowth") or rev_growth,
            "totalDebt":            info.get("totalDebt") or 0,
            "cashAndEquivalents":   info.get("totalCash") or 0,
            "peRatio":              info.get("trailingPE") or 0,
            "pbRatio":              info.get("priceToBook") or 0,
            "evToEbitda":           info.get("enterpriseToEbitda") or 0,
            "roe":                  info.get("returnOnEquity") or 0,
            "debtToEquity":         info.get("debtToEquity") or 0,
            "description":          info.get("longBusinessSummary") or "",
        }

        return result

    except Exception as e:
        st.error(f"Erreur lors de la recuperation des donnees : {e}")
        return {}


@st.cache_data(ttl=86400)
def get_peers_data(ticker: str, sector: str) -> pd.DataFrame:
    """Recupere les donnees des pairs sectoriels via yfinance."""
    peers = SECTOR_PEERS.get(sector, [])
    all_tickers = list(dict.fromkeys([ticker] + peers))[:5]

    rows = []
    session = _make_session()

    for t_str in all_tickers:
        try:
            t = yf.Ticker(t_str, session=session)
            info = t.info
            if not info:
                continue

            price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            mkt_cap = info.get("marketCap") or 0
            pe = info.get("trailingPE") or 0
            ev_ebitda = info.get("enterpriseToEbitda") or 0
            pb = info.get("priceToBook") or 0

            rows.append({
                "Ticker":       t_str,
                "Entreprise":   info.get("longName") or info.get("shortName") or t_str,
                "Prix ($)":     round(price, 2),
                "Mkt Cap ($B)": round(mkt_cap / 1e9, 1),
                "P/E":          round(pe, 1),
                "EV/EBITDA":    round(ev_ebitda, 1),
                "P/B":          round(pb, 1),
            })
        except Exception:
            continue

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    return df.sort_values("Mkt Cap ($B)", ascending=False).reset_index(drop=True)
