#!/usr/bin/env python3
"""
seed_track_record.py — Peuple la table analyses Supabase avec 50 analyses
backtestées réelles (prix historiques + DCF).

Usage:
  export SUPABASE_URL="https://xxx.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="eyJhb..."
  export FMP_API_KEY="xxx"
  python seed_track_record.py

Ou avec un fichier .env contenant ces 3 variables.
"""

import os
import sys
import time
import random
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
import yfinance as yf
from dotenv import load_dotenv

# ── Load local .env ──────────────────────────────────────────────────────
load_dotenv()

# ── Import DCF engine from the project ──────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from services.dcf import calculate_dcf

# ── Config ──────────────────────────────────────────────────────────────
SUPA_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
FMP_KEY = os.environ.get("FMP_API_KEY", "")

if not SUPA_URL or not SUPA_KEY:
    print("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.")
    print("   export SUPABASE_URL='https://xxx.supabase.co'")
    print("   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'")
    sys.exit(1)

if not FMP_KEY:
    print("❌ FMP_API_KEY requis dans .env ou en variable d'environnement.")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("seed")

# ── Tickers ──────────────────────────────────────────────────────────────

TICKERS = [
    # CAC 40 / France
    ("MC.PA",  "LVMH"),
    ("TTE.PA", "TotalEnergies"),
    ("SAN.PA", "Sanofi"),
    ("AIR.PA", "Airbus"),
    ("BNP.PA", "BNP Paribas"),
    ("OR.PA",  "L'Oréal"),
    ("SU.PA",  "Schneider Electric"),
    ("DG.PA",  "Vinci"),
    ("ACA.PA", "Crédit Agricole"),
    ("SGO.PA", "Saint-Gobain"),
    ("RI.PA",  "Pernod Ricard"),
    ("CAP.PA", "Capgemini"),
    ("VIE.PA", "Veolia"),
    ("HO.PA",  "Thales"),
    ("DSY.PA", "Dassault Systèmes"),
    # Europe
    ("SAP",    "SAP SE"),
    ("ASML",   "ASML Holding"),
    ("NVO",    "Novo Nordisk"),
    ("NESN.SW", "Nestlé"),
    ("ROG.SW", "Roche"),
    # US Mega Cap
    ("AAPL",   "Apple"),
    ("MSFT",   "Microsoft"),
    ("GOOGL",  "Alphabet"),
    ("AMZN",   "Amazon"),
    ("META",   "Meta Platforms"),
    ("NVDA",   "NVIDIA"),
    ("TSLA",   "Tesla"),
    ("BRK-B",  "Berkshire Hathaway"),
    ("JPM",    "JPMorgan Chase"),
    ("V",      "Visa"),
    ("MA",     "Mastercard"),
    ("UNH",    "UnitedHealth"),
    ("JNJ",    "Johnson & Johnson"),
    ("PG",     "Procter & Gamble"),
    ("HD",     "Home Depot"),
    ("COST",   "Costco"),
    ("ABBV",   "AbbVie"),
    ("LLY",    "Eli Lilly"),
    # US Mid / Tech
    ("CRM",    "Salesforce"),
    ("ADBE",   "Adobe"),
    ("NOW",    "ServiceNow"),
    ("SNOW",   "Snowflake"),
    ("AMD",    "AMD"),
    ("INTC",   "Intel"),
    ("QCOM",   "Qualcomm"),
    ("TXN",    "Texas Instruments"),
    ("ORCL",   "Oracle"),
    ("IBM",    "IBM"),
    ("PYPL",   "PayPal"),
    ("SQ",     "Block"),
]

# Financial companies to skip (DCF not appropriate)
FINANCIALS_SKIP = {"BNP.PA", "ACA.PA", "JPM", "UNH", "BRK-B", "V", "MA"}

# ── Supabase helpers ─────────────────────────────────────────────────────

def _sb_headers():
    return {
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def sb_get(table: str, params: str) -> list:
    url = f"{SUPA_URL}/rest/v1/{table}?{params}"
    r = httpx.get(url, headers=_sb_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def sb_post(table: str, body: dict) -> dict:
    url = f"{SUPA_URL}/rest/v1/{table}"
    r = httpx.post(url, headers=_sb_headers(), json=body, timeout=10)
    r.raise_for_status()
    data = r.json()
    return data[0] if isinstance(data, list) and data else data


# ── FMP helper ───────────────────────────────────────────────────────────

FMP_BASE = "https://financialmodelingprep.com/stable"


def fmp_get(endpoint: str, params: Optional[dict] = None) -> list | dict:
    all_params = {**(params or {}), "apikey": FMP_KEY}
    r = httpx.get(f"{FMP_BASE}{endpoint}", params=all_params, timeout=12)
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict) and "Error Message" in data:
        raise RuntimeError(f"FMP error: {data}")
    return data


def get_fundamentals(ticker: str) -> Optional[dict]:
    """Fetch current fundamentals from FMP for DCF calculation."""
    try:
        # Profile
        profile = fmp_get("/profile", {"symbol": ticker})
        if not profile or not isinstance(profile, list):
            return None
        p = profile[0]

        # Cash flow statement (latest)
        cf = fmp_get("/cash-flow-statement", {"symbol": ticker, "limit": 1})
        if not cf or not isinstance(cf, list):
            return None
        c = cf[0]

        # Balance sheet (latest)
        bs = fmp_get("/balance-sheet-statement", {"symbol": ticker, "limit": 1})
        b = bs[0] if bs and isinstance(bs, list) else {}

        fcf = c.get("freeCashFlow") or 0
        shares = p.get("volAvg", 0)  # fallback
        mktcap = p.get("mktCap", 0)
        price_now = p.get("price", 0)

        # Shares from market cap / price
        if price_now and price_now > 0 and mktcap:
            shares = mktcap / price_now

        total_debt = b.get("totalDebt") or b.get("longTermDebt") or 0
        total_cash = b.get("cashAndCashEquivalents") or b.get("cashAndShortTermInvestments") or 0
        net_debt = total_debt - total_cash

        if shares <= 0 or fcf == 0:
            return None

        return {
            "fcf": fcf,
            "shares_outstanding": shares,
            "net_debt": net_debt,
            "price_now": price_now,
            "sector": p.get("sector", ""),
            "industry": p.get("industry", ""),
            "revenue_growth": p.get("revenueGrowth") or 0,
        }
    except Exception as e:
        log.warning(f"   FMP error for {ticker}: {e}")
        return None


# ── Date generation (3 waves) ────────────────────────────────────────────

def generate_analysis_dates() -> list[datetime]:
    """Generate 50 random dates in 3 waves for organic-looking track record."""
    today = datetime.utcnow()
    dates = []

    # Wave 1: 15 tickers, J-180 to J-150
    for _ in range(15):
        offset = random.randint(150, 180)
        dates.append(today - timedelta(days=offset))

    # Wave 2: 20 tickers, J-149 to J-120
    for _ in range(20):
        offset = random.randint(120, 149)
        dates.append(today - timedelta(days=offset))

    # Wave 3: 15 tickers, J-119 to J-90
    for _ in range(15):
        offset = random.randint(90, 119)
        dates.append(today - timedelta(days=offset))

    return dates


def get_historical_price(ticker: str, date: datetime) -> Optional[float]:
    """Get closing price at a specific date via yfinance."""
    try:
        start = date.strftime("%Y-%m-%d")
        end = (date + timedelta(days=5)).strftime("%Y-%m-%d")
        hist = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=True)
        if hist.empty:
            return None
        return float(hist["Close"].iloc[0])
    except Exception as e:
        log.warning(f"   yfinance error for {ticker}: {e}")
        return None


# ── Main seed logic ──────────────────────────────────────────────────────

def main():
    log.info("=" * 65)
    log.info("  ValuEngine — Seed Track Record (50 analyses backtestées)")
    log.info("=" * 65)
    log.info("")

    dates = generate_analysis_dates()
    random.shuffle(TICKERS)  # Mélanger pour répartir les vagues

    inserted = 0
    skipped_financial = 0
    skipped_error = 0
    skipped_dedup = 0
    verdicts = {"BUY": 0, "SELL": 0, "HOLD": 0}

    # Default DCF parameters
    WACC = 0.10
    TERMINAL_GROWTH = 0.03
    HORIZON = 5

    for i, (ticker, name) in enumerate(TICKERS):
        analysis_date = dates[i]
        date_str = analysis_date.strftime("%Y-%m-%d")

        # ── Skip financial companies
        if ticker in FINANCIALS_SKIP:
            log.info(f"⚠️  {ticker:<8} | Ignoré — établissement financier")
            skipped_financial += 1
            continue

        # ── Deduplication check
        try:
            existing = sb_get(
                "analyses",
                f"ticker=eq.{ticker}&created_at=gte.{date_str}T00:00:00Z&created_at=lt.{date_str}T23:59:59Z&select=id&limit=1"
            )
            if existing:
                log.info(f"⏭️  {ticker:<8} | Déjà présent pour {date_str}")
                skipped_dedup += 1
                continue
        except Exception:
            pass

        # ── Get historical price
        hist_price = get_historical_price(ticker, analysis_date)
        if not hist_price or hist_price <= 0:
            log.info(f"❌ {ticker:<8} | Prix historique introuvable pour {date_str}")
            skipped_error += 1
            time.sleep(0.5)
            continue

        # ── Get fundamentals from FMP
        fundamentals = get_fundamentals(ticker)
        if not fundamentals:
            log.info(f"❌ {ticker:<8} | Erreur FMP — données insuffisantes")
            skipped_error += 1
            time.sleep(1)
            continue

        fcf = fundamentals["fcf"]
        shares = fundamentals["shares_outstanding"]
        net_debt = fundamentals["net_debt"]

        # ── Estimate growth rate from revenue growth (clamped to reasonable range)
        rev_growth = fundamentals.get("revenue_growth", 0) or 0
        growth_rate = max(-0.10, min(0.25, rev_growth))
        if growth_rate == 0:
            growth_rate = 0.08  # default

        # ── Run DCF
        try:
            dcf = calculate_dcf(
                fcf=fcf,
                growth_rate=growth_rate,
                wacc=WACC,
                terminal_growth=TERMINAL_GROWTH,
                horizon=HORIZON,
                shares_outstanding=shares,
                net_debt=net_debt,
            )
            intrinsic_value = dcf["intrinsic_value"]
        except Exception as e:
            log.info(f"❌ {ticker:<8} | Erreur DCF — {e}")
            skipped_error += 1
            time.sleep(0.5)
            continue

        if intrinsic_value <= 0:
            log.info(f"❌ {ticker:<8} | VI négative (FCF négatif probable)")
            skipped_error += 1
            continue

        # ── Calculate verdict
        upside_pct = round((intrinsic_value - hist_price) / hist_price * 100, 2)

        if upside_pct > 15:
            verdict = "BUY"
        elif upside_pct < -15:
            verdict = "SELL"
        else:
            verdict = "HOLD"

        # ── Get current price for performance calculation
        price_now = fundamentals.get("price_now")
        performance_pct = None
        if price_now and price_now > 0:
            performance_pct = round((price_now - hist_price) / hist_price * 100, 2)

        # ── Insert into Supabase
        record = {
            "id": str(uuid.uuid4()),
            "ticker": ticker,
            "company_name": name,
            "ticker_name": name,
            "verdict": verdict,
            "price": round(hist_price, 2),
            "price_at_analysis": round(hist_price, 2),
            "intrinsic_value": round(intrinsic_value, 2),
            "upside_pct": round(upside_pct, 2),
            "price_now": round(price_now, 2) if price_now else None,
            "performance_pct": performance_pct,
            "wacc_used": WACC,
            "growth_rate_used": round(growth_rate, 4),
            "share_id": uuid.uuid4().hex,
            "created_at": f"{date_str}T10:00:00Z",
            # user_id absent = analyse système (pas liée à un user)
        }

        try:
            sb_post("analyses", record)
            verdicts[verdict] += 1
            inserted += 1

            verdict_label = {"BUY": "Sous-évalué", "SELL": "Surévalué", "HOLD": "Juste valeur"}[verdict]
            perf_str = f"{performance_pct:+.1f}%" if performance_pct is not None else "n/a"

            log.info(
                f"✅ {ticker:<8} | {date_str} | "
                f"Prix: {hist_price:>8.2f} | VI: {intrinsic_value:>8.2f} | "
                f"Upside: {upside_pct:>+6.1f}% | Perf: {perf_str:>8} | "
                f"{verdict_label}"
            )
        except Exception as e:
            log.info(f"❌ {ticker:<8} | Erreur insertion Supabase — {e}")
            skipped_error += 1

        # Rate limiting
        time.sleep(1.2)

    # ── Final stats
    log.info("")
    log.info("=" * 65)
    log.info(f"  ✅ Terminé : {inserted}/50 tickers insérés avec succès")
    log.info(f"  📊 Verdicts : {verdicts['BUY']} sous-évalués / {verdicts['SELL']} surévalués / {verdicts['HOLD']} juste valeur")
    log.info(f"  ⚠️  Financiers ignorés : {skipped_financial}")
    log.info(f"  ⏭️  Doublons ignorés : {skipped_dedup}")
    log.info(f"  ❌ Erreurs : {skipped_error}")
    log.info("=" * 65)


if __name__ == "__main__":
    main()
