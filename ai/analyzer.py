import os
import streamlit as st
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

def get_client():
    try:
        api_key = st.secrets["ANTHROPIC_API_KEY"]
    except Exception:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    return Anthropic(api_key=api_key)

def get_bull_bear_analysis(data: dict, dcf_result: dict) -> dict:
    try:
        client = get_client()
        ticker    = data.get("ticker", "N/A")
        name      = data.get("name", ticker)
        sector    = data.get("sector", "N/A")
        price     = data.get("price", 0)
        revenue   = data.get("revenue", 0)
        net_income= data.get("netIncome", 0)
        fcf       = data.get("freeCashFlow", 0)
        rev_growth= data.get("revenueGrowth", 0)
        pe        = data.get("peRatio", 0)
        ev_ebitda = data.get("evToEbitda", 0)
        roe       = data.get("roe", 0)
        debt      = data.get("totalDebt", 0)
        cash      = data.get("cashAndEquivalents", 0)
        mkt_cap   = data.get("mktCap", 0)
        intrinsic = dcf_result.get("intrinsic_value_per_share", 0)
        upside    = ((intrinsic - price) / price * 100) if price else 0
        prompt = f"""Tu es un analyste financier senior. Analyse {name} ({ticker}) secteur {sector}.

Donnees: Prix ${price:.2f} | Valeur DCF ${intrinsic:.2f} ({upside:+.1f}%) | Cap ${mkt_cap/1e9:.1f}B
CA ${revenue/1e9:.1f}B | Net ${net_income/1e9:.1f}B | FCF ${fcf/1e9:.1f}B | Croissance {rev_growth*100:.1f}%
P/E {pe:.1f}x | EV/EBITDA {ev_ebitda:.1f}x | ROE {roe*100:.1f}% | Dette nette ${(debt-cash)/1e9:.1f}B

Reponds EXACTEMENT dans ce format:
BULL_CASE:
[3-4 arguments haussiers concrets en francais]

BEAR_CASE:
[3-4 risques baissiers concrets en francais]"""
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        response = msg.content[0].text
        if "BULL_CASE:" in response and "BEAR_CASE:" in response:
            parts = response.split("BEAR_CASE:")
            bull = parts[0].replace("BULL_CASE:", "").strip()
            bear = parts[1].strip() if len(parts) > 1 else ""
        else:
            half = len(response) // 2
            bull = response[:half].strip()
            bear = response[half:].strip()
        return {"bull_case": bull, "bear_case": bear}
    except Exception as e:
        return {"bull_case": f"Erreur : {e}", "bear_case": "Verifiez votre cle API Anthropic."}
