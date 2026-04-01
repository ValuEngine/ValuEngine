"""
ValuEngine — AI Analyst Service
Génère une analyse Bull/Bear contextualisée via Claude (Anthropic).
"""

import os
from anthropic import Anthropic


def _fmt_b(value: float) -> str:
    """Formate un grand nombre en milliards."""
    if abs(value) >= 1e12:
        return f"${value/1e12:.2f}T"
    if abs(value) >= 1e9:
        return f"${value/1e9:.1f}B"
    if abs(value) >= 1e6:
        return f"${value/1e6:.0f}M"
    return f"${value:,.0f}"


def get_bull_bear_analysis(company: dict, dcf: dict) -> dict:
    """
    Génère une analyse Bull Case / Bear Case via Claude Haiku.

    Args:
        company : données de l'entreprise (dict issu de market_data.py)
        dcf     : résultat DCF (dict issu de dcf.py)

    Returns:
        {"bull_case": str, "bear_case": str}
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {
            "bull_case": "Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans les variables d'environnement.",
            "bear_case": "Clé API Anthropic manquante.",
        }

    client = Anthropic(api_key=api_key)

    # Données clés formatées
    name         = company.get("name", "N/A")
    ticker       = company.get("ticker", "N/A")
    sector       = company.get("sector", "N/A")
    price        = company.get("price", 0)
    intr         = dcf.get("intrinsic_value", 0)
    upside       = ((intr - price) / price * 100) if price else 0
    mktcap       = company.get("market_cap", 0)
    revenue      = company.get("revenue", 0)
    net_income   = company.get("net_income", 0)
    fcf          = company.get("free_cash_flow", 0)
    rev_growth   = (company.get("revenue_growth") or 0) * 100
    pe           = company.get("pe_ratio") or 0
    ev_ebitda    = company.get("ev_ebitda") or 0
    roe          = (company.get("roe") or 0) * 100
    net_debt     = company.get("net_debt", 0)
    profit_m     = (company.get("profit_margin") or 0) * 100

    prompt = (
        f"Tu es un analyste financier senior de Wall Street spécialisé dans le secteur {sector}.\n"
        f"Analyse {name} ({ticker}) de façon professionnelle et percutante.\n\n"
        f"DONNÉES FINANCIÈRES CLÉS :\n"
        f"• Prix actuel : ${price:.2f} | Valeur intrinsèque DCF : ${intr:.2f} ({upside:+.1f}%)\n"
        f"• Market Cap : {_fmt_b(mktcap)} | CA : {_fmt_b(revenue)} | Résultat net : {_fmt_b(net_income)}\n"
        f"• FCF : {_fmt_b(fcf)} | Croissance CA : {rev_growth:.1f}% | Marge nette : {profit_m:.1f}%\n"
        f"• P/E : {pe:.1f}x | EV/EBITDA : {ev_ebitda:.1f}x | ROE : {roe:.1f}% | Dette nette : {_fmt_b(net_debt)}\n\n"
        f"Réponds UNIQUEMENT dans ce format exact, sans rien d'autre :\n\n"
        f"BULL_CASE:\n"
        f"[3 arguments haussiers percutants, chacun sur une ligne, commençant par • ]\n\n"
        f"BEAR_CASE:\n"
        f"[3 risques baissiers concrets, chacun sur une ligne, commençant par • ]\n\n"
        f"Sois direct, factuel, ancré dans les chiffres. En français. Maximum 25 mots par argument."
    )

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        response = msg.content[0].text.strip()

        # Parsing robuste
        if "BULL_CASE:" in response and "BEAR_CASE:" in response:
            parts = response.split("BEAR_CASE:")
            bull = parts[0].replace("BULL_CASE:", "").strip()
            bear = parts[1].strip() if len(parts) > 1 else ""
        else:
            mid = len(response) // 2
            bull = response[:mid].strip()
            bear = response[mid:].strip()

        return {"bull_case": bull, "bear_case": bear}

    except Exception as e:
        return {
            "bull_case": f"Erreur lors de la génération de l'analyse : {e}",
            "bear_case": "Vérifiez votre clé API Anthropic.",
        }


def get_swot_analysis(company_data: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    client = Anthropic(api_key=api_key)

    prompt = f"""Tu es un analyste financier expert. Génère une analyse SWOT concise pour {company_data.get('name', '')} ({company_data.get('ticker', '')}).

Données clés:
- Secteur: {company_data.get('sector', 'N/A')}
- CA: ${company_data.get('revenue', 0)/1e9:.1f}B
- Marge nette: {company_data.get('profit_margin', 0)*100:.1f}%
- Croissance CA: {company_data.get('revenue_growth', 0)*100:.1f}%
- FCF: ${company_data.get('free_cash_flow', 0)/1e9:.1f}B
- P/E: {company_data.get('pe_ratio', 'N/A')}
- Beta: {company_data.get('beta', 'N/A')}

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{{"strengths": ["point1", "point2", "point3"], "weaknesses": ["point1", "point2", "point3"], "opportunities": ["point1", "point2", "point3"], "threats": ["point1", "point2", "point3"]}}

Chaque point: 1 phrase concise en français, ancrée dans les données financières."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}]
    )
    import json, re
    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def get_pestle_analysis(company_data: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    client = Anthropic(api_key=api_key)

    prompt = f"""Tu es un analyste financier expert. Génère une analyse PESTLE concise pour {company_data.get('name', '')} ({company_data.get('ticker', '')}).

Données clés:
- Secteur: {company_data.get('sector', 'N/A')}, Industrie: {company_data.get('industry', 'N/A')}
- Market Cap: ${company_data.get('market_cap', 0)/1e9:.0f}B
- Pays: USA (coté NYSE/NASDAQ)
- CA: ${company_data.get('revenue', 0)/1e9:.1f}B

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{{"political": "2-3 phrases", "economic": "2-3 phrases", "social": "2-3 phrases", "technological": "2-3 phrases", "legal": "2-3 phrases", "environmental": "2-3 phrases"}}

En français, factuel, ancré dans le secteur de l'entreprise."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}]
    )
    import json, re
    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)
