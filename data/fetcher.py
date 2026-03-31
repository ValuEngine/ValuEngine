import requests
import streamlit as st
import pandas as pd

SECTOR_PEERS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA"],
    "Finance": ["JPM", "BAC", "GS", "MS", "WFC"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK"],
    "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "MCD"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG"],
    "Industrials": ["CAT", "BA", "HON", "UPS", "GE"],
    "Communication": ["GOOGL", "META", "NFLX", "DIS", "T"],
    "Utilities": ["NEE", "DUK", "SO", "D", "AEP"],
    "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "SPG"],
    "Materials": ["LIN", "APD", "SHW", "FCX", "NEM"],
    "Consumer Defensive": ["WMT", "PG", "KO", "PEP", "COST"],
}

def _get_fmp_key():
    try:
        return st.secrets["FMP_API_KEY"].strip()
    except Exception:
        import os
        return os.environ.get("FMP_API_KEY", "").strip()

@st.cache_data(ttl=3600)
def get_company_data(ticker: str) -> dict:
    key = _get_fmp_key()
    if not key:
        st.error("FMP_API_KEY manquante dans les secrets Streamlit.")
        return {}
    BASE = "https://financialmodelingprep.com/api/v3"
    try:
        r = requests.get(f"{BASE}/profile/{ticker}?apikey={key}", timeout=15)
        if r.status_code == 429:
            st.error("Limite FMP atteinte. Reessayez demain ou upgradez votre plan.")
            return {}
        if r.status_code == 401:
            st.error("Cle FMP invalide.")
            return {}
        r.raise_for_status()
        profile_data = r.json()
        if not profile_data:
            st.error(f"Ticker {ticker} introuvable.")
            return {}
        p = profile_data[0]
        shares = p.get("sharesOutstanding", 0) or 0
        result = {
            "ticker": ticker,
            "name": p.get("companyName", ticker),
            "sector": p.get("sector", "Unknown"),
            "price": p.get("price", 0) or 0,
            "mktCap": p.get("mktCap", 0) or 0,
            "beta": p.get("beta", 1.0) or 1.0,
            "sharesOutstanding": shares,
        }
        r2 = requests.get(f"{BASE}/income-statement/{ticker}?limit=4&apikey={key}", timeout=15)
        r2.raise_for_status()
        income = r2.json() or []
        if income:
            l = income[0]
            result["revenue"] = l.get("revenue", 0) or 0
            result["netIncome"] = l.get("netIncome", 0) or 0
            result["ebitda"] = l.get("ebitda", 0) or 0
            result["eps"] = l.get("eps", 0) or 0
            if len(income) >= 2:
                prev = income[1].get("revenue", 0) or 0
                curr = result["revenue"]
                result["revenueGrowth"] = (curr - prev) / abs(prev) if prev else 0
            else:
                result["revenueGrowth"] = 0
        r3 = requests.get(f"{BASE}/cash-flow-statement/{ticker}?limit=4&apikey={key}", timeout=15)
        r3.raise_for_status()
        cf = r3.json() or []
        if cf:
            result["freeCashFlow"] = cf[0].get("freeCashFlow", 0) or 0
            result["fcf_history"] = [{"date": x.get("date",""), "fcf": x.get("freeCashFlow",0) or 0} for x in cf]
        else:
            result["freeCashFlow"] = 0
            result["fcf_history"] = []
        r4 = requests.get(f"{BASE}/balance-sheet-statement/{ticker}?limit=1&apikey={key}", timeout=15)
        r4.raise_for_status()
        bs = r4.json() or []
        if bs:
            result["totalDebt"] = bs[0].get("totalDebt", 0) or 0
            result["cashAndEquivalents"] = bs[0].get("cashAndCashEquivalents", 0) or 0
        r5 = requests.get(f"{BASE}/key-metrics/{ticker}?limit=1&apikey={key}", timeout=15)
        r5.raise_for_status()
        km = r5.json() or []
        if km:
            m = km[0]
            result["peRatio"] = m.get("peRatio", 0) or 0
            result["pbRatio"] = m.get("pbRatio", 0) or 0
            result["evToEbitda"] = m.get("enterpriseValueOverEBITDA", 0) or 0
            result["roe"] = m.get("roe", 0) or 0
            result["debtToEquity"] = m.get("debtToEquity", 0) or 0
        return result
    except Exception as e:
        st.error(f"Erreur : {e}")
        return {}

@st.cache_data(ttl=3600)
def get_peers_data(ticker: str, sector: str) -> pd.DataFrame:
    key = _get_fmp_key()
    peers = SECTOR_PEERS.get(sector, [])
    all_tickers = list(dict.fromkeys([ticker] + peers))[:5]
    BASE = "https://financialmodelingprep.com/api/v3"
    rows = []
    for t in all_tickers:
        try:
            rp = requests.get(f"{BASE}/profile/{t}?apikey={key}", timeout=10)
            if rp.status_code == 429:
                break
            rp.raise_for_status()
            pd_data = rp.json()
            if not pd_data:
                continue
            prof = pd_data[0]
            rm = requests.get(f"{BASE}/key-metrics/{t}?limit=1&apikey={key}", timeout=10)
            rm.raise_for_status()
            m_data = rm.json() or []
            m = m_data[0] if m_data else {}
            rows.append({
                "Ticker": t,
                "Entreprise": prof.get("companyName", t),
                "Prix ($)": round(prof.get("price", 0) or 0, 2),
                "Mkt Cap ($B)": round((prof.get("mktCap", 0) or 0) / 1e9, 1),
                "P/E": round(m.get("peRatio", 0) or 0, 1),
                "EV/EBITDA": round(m.get("enterpriseValueOverEBITDA", 0) or 0, 1),
                "P/B": round(m.get("pbRatio", 0) or 0, 1),
            })
        except Exception:
            continue
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("Mkt Cap ($B)", ascending=False).reset_index(drop=True)
