import os
import streamlit as st
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

def get_client():
    try:
        api_key = st.secrets["ANTHROPIC_API_KEY"]
    except:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
    return Anthropic(api_key=api_key)

def generate_analysis(data: dict, dcf_result: dict) -> dict:
    client = get_client()
    prompt = f"""
Tu es un analyste financier sell-side senior. Analyse cette entreprise et fournis une analyse structurée.

DONNÉES FINANCIÈRES :
- Entreprise : {data['name']} ({data['sector']})
- Prix actuel : ${data['current_price']}
- Valeur intrinsèque DCF : ${dcf_result['intrinsic_price']}
- Potentiel : {dcf_result['upside']}%
- Market Cap : ${data['market_cap']/1e9:.1f}B
- Chiffre d'affaires : ${data['revenue']/1e9:.1f}B
- EBIT : ${data['ebit']/1e9:.1f}B
- Résultat net : ${data['net_income']/1e9:.1f}B
- Free Cash Flow : ${data['free_cashflow']/1e9:.1f}B
- Dette nette : ${(data['total_debt']-data['cash'])/1e9:.1f}B
- P/E : {data['pe_ratio']:.1f}x
- EV/EBITDA : {data['ev_ebitda']:.1f}x
- WACC utilisé : {dcf_result['wacc']*100:.1f}%
- Taux de croissance FCF : {dcf_result['growth_rate']*100:.1f}%

Réponds EXACTEMENT dans ce format :

THÈSE D'INVESTISSEMENT
[2-3 phrases résumant la situation de l'entreprise et son attractivité]

BULL CASE 🟢
- [Argument haussier 1 — précis et chiffré si possible]
- [Argument haussier 2 — précis et chiffré si possible]
- [Argument haussier 3 — précis et chiffré si possible]

BEAR CASE 🔴
- [Risque baissier 1 — précis et concret]
- [Risque baissier 2 — précis et concret]
- [Risque baissier 3 — précis et concret]

CONCLUSION
[1 phrase de verdict clair et actionnable]
"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    return {"analysis": message.content[0].text}