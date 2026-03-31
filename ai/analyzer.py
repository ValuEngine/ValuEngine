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
    """
    Genere un Bull Case et un Bear Case via Claude AI.
    Retourne un dict avec les cles 'bull_case' et 'bear_case'.
    """
    try:
        client = get_client()

        ticker        = data.get("ticker", "N/A")
        name          = data.get("name", ticker)
        sector        = data.get("sector", "N/A")
        price         = data.get("price", 0)
        revenue       = data.get("revenue", 0)
        net_income    = data.get("netIncome", 0)
        fcf           = data.get("freeCashFlow", 0)
        rev_growth    = data.get("revenueGrowth", 0)
        pe            = data.get("peRatio", 0)
        ev_ebitda     = data.get("evToEbitda", 0)
        roe           = data.get("roe", 0)
        debt          = data.get("totalDebt", 0)
        cash          = data.get("cashAndEquivalents", 0)
        mkt_cap       = data.get("mktCap", 0)
        intrinsic     = dcf_result.get("intrinsic_value_per_share", 0)
        upside        = ((intrinsic - price) / price * 100) if price else 0

        prompt = f"""Tu es un analyste financier senior specialise dans l'analyse fondamentale des actions.

Analyse l'action {name} ({ticker}) du secteur {sector} et genere:
1. Un BULL CASE (scenario haussier) de 3-4 arguments solides pourquoi l'action pourrait surperformer
2. Un BEAR CASE (scenario baissier) de 3-4 risques concrets qui pourraient faire baisser l'action

Donnees financieres cles:
- Prix actuel: ${price:,.2f}
- Valeur intrinseque DCF: ${intrinsic:,.2f} ({upside:+.1f}% de potentiel)
- Market Cap: ${mkt_cap/1e9:.1f}B
- Chiffre d'affaires: ${revenue/1e9:.1f}B
- Resultat net: ${net_income/1e9:.1f}B
- Free Cash Flow: ${fcf/1e9:.1f}B
- Croissance CA: {rev_growth*100:.1f}%
- P/E: {pe:.1f}x
- EV/EBITDA: {ev_ebitda:.1f}x
- ROE: {roe*100:.1f}%
- Dette nette: ${(debt-cash)/1e9:.1f}B

FORMAT REQUIS (reponds exactement comme ca):
BULL_CASE:
[Tes 3-4 arguments haussiers ici, en francais, concis et percutants]

BEAR_CASE:
[Tes 3-4 risques baissiers ici, en francais, concis et percutants]"""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        response = message.content[0].text

        bull_case = ""
        bear_case = ""

        if "BULL_CASE:" in response and "BEAR_CASE:" in response:
            parts = response.split("BEAR_CASE:")
            bull_part = parts[0].replace("BULL_CASE:", "").strip()
            bear_part = parts[1].strip() if len(parts) > 1 else ""
            bull_case = bull_part
            bear_case = bear_part
        else:
            # Fallback si le format n'est pas respecte
            half = len(response) // 2
            bull_case = response[:half].strip()
            bear_case = response[half:].strip()

        return {
            "bull_case": bull_case,
            "bear_case": bear_case
        }

    except Exception as e:
        return {
            "bull_case": f"Erreur lors de la generation de l'analyse : {str(e)}",
            "bear_case": f"Verifiez votre cle API Anthropic dans les secrets Streamlit."
        }
