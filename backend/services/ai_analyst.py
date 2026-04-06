"""
ValuEngine — AI Analyst Service
Génère une analyse Bull/Bear contextualisée via Claude (Anthropic).
+ Deep Analysis, Anomaly Detection, DCF Scenarios (Niveaux 1-3).
"""

import os
import json
import re
import logging
from anthropic import Anthropic

logger = logging.getLogger("valuengine")


def _fmt_b(value: float) -> str:
    """Formate un grand nombre en milliards."""
    if abs(value) >= 1e12:
        return f"${value/1e12:.2f}T"
    if abs(value) >= 1e9:
        return f"${value/1e9:.1f}B"
    if abs(value) >= 1e6:
        return f"${value/1e6:.0f}M"
    return f"${value:,.0f}"


def _parse_json_response(text: str) -> dict:
    """Parse JSON from Claude response, stripping markdown fences."""
    text = text.strip()
    # Remove markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    # Extract JSON object between first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]
    return json.loads(text)


def _format_analyst_targets(targets: dict | None) -> str:
    """Format analyst targets section for prompts."""
    if not targets:
        return ""
    return (
        f"═══ CONSENSUS ANALYSTES ═══\n"
        f"Prix cible consensus: ${targets.get('target_consensus', 0):.2f}\n"
        f"Fourchette: ${targets.get('target_low', 0):.2f} — ${targets.get('target_high', 0):.2f} "
        f"(médiane: ${targets.get('target_median', 0):.2f})\n"
        f"Nombre d'analystes: {targets.get('num_analysts', 'N/A')}\n"
        f"Moyenne dernier trimestre: ${targets.get('last_quarter_avg', 0):.2f}"
    )


def _format_revenue_segments(products: dict | None, geography: dict | None) -> str:
    """Format revenue segments section for prompts."""
    parts = []
    if products and products.get("segments"):
        lines = [f"  • {name}: {data.get('pct', 0):.1f}%" for name, data in products["segments"].items()]
        parts.append(f"═══ RÉPARTITION REVENUS PAR PRODUIT ({products.get('year', '')}) ═══\n" + "\n".join(lines))
    if geography and geography.get("regions"):
        lines = [f"  • {name}: {data.get('pct', 0):.1f}%" for name, data in geography["regions"].items()]
        parts.append(f"═══ RÉPARTITION GÉOGRAPHIQUE ({geography.get('year', '')}) ═══\n" + "\n".join(lines))
    return "\n\n".join(parts)


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
        logger.error(f"[BullBear] Error: {e}")
        return {
            "bull_case": "Analyse temporairement indisponible.",
            "bear_case": "Veuillez réessayer dans quelques instants.",
        }


def get_swot_analysis(company_data: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {
            "strengths": ["Analyse SWOT indisponible (clé API manquante)"],
            "weaknesses": [], "opportunities": [], "threats": [],
        }

    client = Anthropic(api_key=api_key)

    prompt = f"""Tu es un analyste financier expert. Génère une analyse SWOT concise pour {company_data.get('name', '')} ({company_data.get('ticker', '')}).

Données clés:
- Secteur: {company_data.get('sector', 'N/A')}
- CA: ${company_data.get('revenue', 0)/1e9:.1f}B
- Marge nette: {(company_data.get('profit_margin') or 0)*100:.1f}%
- Croissance CA: {(company_data.get('revenue_growth') or 0)*100:.1f}%
- FCF: ${company_data.get('free_cash_flow', 0)/1e9:.1f}B
- P/E: {company_data.get('pe_ratio', 'N/A')}
- Beta: {company_data.get('beta', 'N/A')}

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{{"strengths": ["point1", "point2", "point3"], "weaknesses": ["point1", "point2", "point3"], "opportunities": ["point1", "point2", "point3"], "threats": ["point1", "point2", "point3"]}}

Chaque point: 1 phrase concise en français, ancrée dans les données financières."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )
        return _parse_json_response(message.content[0].text)
    except Exception as e:
        logger.warning(f"[SWOT] Error: {e}")
        return {
            "strengths": ["Analyse SWOT temporairement indisponible"],
            "weaknesses": [], "opportunities": [], "threats": [],
        }


def get_pestle_analysis(company_data: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {
            "political": "Analyse PESTLE indisponible (clé API manquante).",
            "economic": "", "social": "", "technological": "", "legal": "", "environmental": "",
        }

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

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        return _parse_json_response(message.content[0].text)
    except Exception as e:
        logger.warning(f"[PESTLE] Error: {e}")
        return {
            "political": "Analyse PESTLE temporairement indisponible.",
            "economic": "", "social": "", "technological": "", "legal": "", "environmental": "",
        }


# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 1 — Analyse contextuelle profonde (Claude Haiku)
# ═══════════════════════════════════════════════════════════════════════════════

def get_deep_analysis(ticker: str, company_info: dict, financials: dict, deep_financials: dict) -> dict:
    """
    Deep analysis using real 5-year financial data via claude-sonnet-4-6.
    Returns structured bull/bear case with real figures cited.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "Clé API Anthropic manquante"}

    client = Anthropic(api_key=api_key)

    # Format data for the prompt
    df = deep_financials
    years = df.get("years", [])
    years_str = " → ".join(str(y) for y in years) if years else "N/A"

    def _fmt_list(lst, suffix="%"):
        if not lst:
            return "N/A"
        return " → ".join(f"{v}{suffix}" if v is not None else "N/A" for v in lst)

    def _fmt_money_list(lst):
        if not lst:
            return "N/A"
        return " → ".join(_fmt_b(v) if v else "N/A" for v in lst)

    # Calculate CAGR revenue
    rev = df.get("revenue_5y", [])
    cagr_rev = None
    if len(rev) >= 2 and rev[-1] and rev[0] and rev[-1] > 0:
        n_years = len(rev) - 1
        cagr_rev = ((rev[0] / rev[-1]) ** (1 / n_years) - 1) * 100

    prompt = f"""Tu es un analyste financier senior institutionnel spécialisé dans le secteur {company_info.get('sector', 'N/A')}.
Analyse {company_info.get('name', ticker)} ({ticker}) avec rigueur et profondeur.

═══ DONNÉES FINANCIÈRES RÉELLES ({years_str}) ═══

Revenus: {_fmt_money_list(rev)}
CAGR Revenus: {f'{cagr_rev:.1f}%' if cagr_rev else 'N/A'}
Croissance CA YoY: {_fmt_list(df.get('revenue_growth_5y', []))}

Marges brutes: {_fmt_list(df.get('gross_margin_5y', []))}
Marges opérationnelles: {_fmt_list(df.get('operating_margin_5y', []))}
Marges nettes: {_fmt_list(df.get('net_margin_5y', []))}

FCF: {_fmt_money_list(df.get('fcf_5y', []))}
FCF Margin: {_fmt_list(df.get('fcf_margin_5y', []))}

ROIC: {_fmt_list(df.get('roic_5y', []))}
Cash conversion (FCF/NI): {_fmt_list(df.get('cash_conversion', []), 'x')}
Dette/EBITDA: {_fmt_list(df.get('debt_to_ebitda_5y', []), 'x')}

EPS dilué: {_fmt_list(df.get('eps_5y', []), '$')}
Croissance EPS: {_fmt_list(df.get('eps_growth_5y', []))}
CapEx/Revenue: {_fmt_list(df.get('capex_intensity', []))}

═══ DONNÉES COURANTES ═══
Prix: ${company_info.get('price', 0):.2f}
Market Cap: {_fmt_b(company_info.get('market_cap', 0))}
P/E: {company_info.get('pe_ratio', 'N/A')}
EV/EBITDA: {company_info.get('ev_ebitda', 'N/A')}

{_format_analyst_targets(df.get('analyst_targets'))}
{_format_revenue_segments(df.get('revenue_segments'), df.get('geographic_segments'))}

═══ CONSIGNES ═══
1. Chaque argument DOIT citer des CHIFFRES RÉELS tirés des données ci-dessus
2. Pas de généralités — uniquement des faits quantifiés
3. Ton analytique professionnel, en français
4. Retourne UNIQUEMENT du JSON valide, sans texte autour

Format JSON attendu:
{{
  "bull_case": {{
    "titre": "string (5-8 mots accrocheur)",
    "score_confiance": number (0-100),
    "arguments": [
      {{
        "titre": "string court",
        "detail": "string (2-3 phrases avec CHIFFRES RÉELS)",
        "chiffre_cle": "string ex: 'FCF margin: 28.3%'"
      }},
      {{
        "titre": "string",
        "detail": "string",
        "chiffre_cle": "string"
      }},
      {{
        "titre": "string",
        "detail": "string",
        "chiffre_cle": "string"
      }}
    ]
  }},
  "bear_case": {{
    "titre": "string",
    "score_confiance": number (0-100),
    "arguments": [
      {{
        "titre": "string",
        "detail": "string (2-3 phrases avec chiffres réels)",
        "chiffre_cle": "string"
      }},
      {{
        "titre": "string",
        "detail": "string",
        "chiffre_cle": "string"
      }},
      {{
        "titre": "string",
        "detail": "string",
        "chiffre_cle": "string"
      }}
    ]
  }},
  "synthese": "string (2-3 phrases de conclusion analytique avec position nette)",
  "catalyseurs_positifs": ["string", "string", "string"],
  "risques_majeurs": ["string", "string", "string"]
}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        result = _parse_json_response(msg.content[0].text)

        # ── Structural validation ──
        warnings = []
        for case in ["bull_case", "bear_case"]:
            if case not in result:
                warnings.append(f"{case} manquant dans la réponse IA")
            elif not isinstance(result[case].get("arguments"), list):
                warnings.append(f"{case}.arguments n'est pas une liste")
        if "synthese" not in result:
            warnings.append("synthese manquante")
        if warnings:
            result["_data_warnings"] = warnings
            logger.warning(f"[DeepAnalysis] Validation warnings: {warnings}")

        return result
    except json.JSONDecodeError as e:
        logger.error(f"[DeepAnalysis] JSON parse error: {e}\nRaw text: {msg.content[0].text[:500]}")
        return {"error": "Erreur lors de l'analyse. Veuillez réessayer."}
    except Exception as e:
        logger.error(f"[DeepAnalysis] Error: {e}")
        return {"error": "Analyse temporairement indisponible."}


# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 2 — Détection d'anomalies (logique Python pure, pas d'IA)
# ═══════════════════════════════════════════════════════════════════════════════

def detect_anomalies(
    ticker: str,
    company_data: dict,
    deep_financials: dict,
    sector_benchmarks: dict,
) -> list:
    """
    Detect financial anomalies by comparing company metrics to sector benchmarks.
    Pure Python logic — no AI call.
    """
    anomalies = []
    df = deep_financials
    bench = sector_benchmarks

    # Helper
    def _first(lst):
        """Get most recent value from a list."""
        if not lst:
            return None
        for v in lst:
            if v is not None:
                return v
        return None

    pe_ratio = company_data.get("pe_ratio")
    median_pe = bench.get("median_pe")

    # ── 1. VALORISATION ──
    if pe_ratio and median_pe and median_pe > 0:
        premium = (pe_ratio - median_pe) / median_pe * 100
        if premium > 50:
            anomalies.append({
                "type": "VALORISATION",
                "signal": "ATTENTION",
                "titre": "Prime de valorisation élevée",
                "detail": f"P/E de {pe_ratio:.1f}x vs médiane sectorielle {median_pe:.1f}x (+{premium:.0f}% de prime)",
                "impact": "baissier",
            })
        elif premium < -30:
            anomalies.append({
                "type": "VALORISATION",
                "signal": "OPPORTUNITE",
                "titre": "Décote de valorisation significative",
                "detail": f"P/E de {pe_ratio:.1f}x vs médiane sectorielle {median_pe:.1f}x ({premium:.0f}% de décote)",
                "impact": "haussier",
            })

    # ── 2. LEVIER FINANCIER ──
    debt_ebitda = _first(df.get("debt_to_ebitda_5y", []))
    if debt_ebitda is not None and debt_ebitda > 4.0:
        anomalies.append({
            "type": "BILAN",
            "signal": "RISQUE",
            "titre": "Endettement excessif",
            "detail": f"Dette/EBITDA de {debt_ebitda:.1f}x — niveau critique (seuil d'alerte: 4x)",
            "impact": "baissier",
        })

    # ── 3. QUALITÉ DES EARNINGS ──
    cash_conv = _first(df.get("cash_conversion", []))
    if cash_conv is not None:
        if cash_conv < 0.7:
            anomalies.append({
                "type": "EARNINGS",
                "signal": "ATTENTION",
                "titre": "Qualité des bénéfices faible",
                "detail": f"Cash conversion de {cash_conv:.0%} — les bénéfices comptables ne se transforment pas bien en cash",
                "impact": "baissier",
            })
        elif cash_conv > 1.2:
            anomalies.append({
                "type": "EARNINGS",
                "signal": "POSITIF",
                "titre": "Excellente qualité des bénéfices",
                "detail": f"Cash conversion de {cash_conv:.0%} — les bénéfices sont fortement soutenus par le cash",
                "impact": "haussier",
            })

    # ── 4. MARGES vs SECTEUR ──
    gross_margin = _first(df.get("gross_margin_5y", []))
    median_gm = bench.get("median_gross_margin")
    if gross_margin is not None and median_gm is not None:
        diff = gross_margin - median_gm
        if diff > 15:
            anomalies.append({
                "type": "RENTABILITE",
                "signal": "POSITIF",
                "titre": "Avantage concurrentiel sur les marges",
                "detail": f"Marge brute {gross_margin:.1f}% vs {median_gm:.1f}% médiane secteur (+{diff:.1f}pts) — pricing power élevé",
                "impact": "haussier",
            })
        elif diff < -10:
            anomalies.append({
                "type": "RENTABILITE",
                "signal": "ATTENTION",
                "titre": "Marges sous la moyenne sectorielle",
                "detail": f"Marge brute {gross_margin:.1f}% vs {median_gm:.1f}% médiane secteur ({diff:.1f}pts) — pression concurrentielle",
                "impact": "baissier",
            })

    # ── 5. CRÉATION DE VALEUR (ROIC) ──
    roic_current = _first(df.get("roic_5y", []))
    median_roe = bench.get("median_roe")
    if roic_current is not None and median_roe is not None and median_roe > 0:
        if roic_current > median_roe * 1.5:
            anomalies.append({
                "type": "CREATION_VALEUR",
                "signal": "POSITIF",
                "titre": "Création de valeur supérieure au secteur",
                "detail": f"ROIC de {roic_current:.1f}% vs {median_roe:.1f}% ROE médian secteur — allocation du capital excellente",
                "impact": "haussier",
            })

    # ── 6. TENDANCE FCF ──
    fcf_5y = df.get("fcf_5y", [])
    if len(fcf_5y) >= 3 and fcf_5y[0] and fcf_5y[2] and fcf_5y[2] != 0:
        recent_fcf_trend = (fcf_5y[0] - fcf_5y[2]) / abs(fcf_5y[2])
        if recent_fcf_trend < -0.3:
            anomalies.append({
                "type": "FCF",
                "signal": "RISQUE",
                "titre": "Détérioration du Free Cash Flow",
                "detail": f"FCF en baisse de {abs(recent_fcf_trend):.0%} sur 3 ans — surveiller la consommation de trésorerie",
                "impact": "baissier",
            })
        elif recent_fcf_trend > 0.5:
            anomalies.append({
                "type": "FCF",
                "signal": "POSITIF",
                "titre": "Forte croissance du Free Cash Flow",
                "detail": f"FCF en hausse de {recent_fcf_trend:.0%} sur 3 ans — génération de trésorerie en accélération",
                "impact": "haussier",
            })

    return anomalies


# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 3 — 3 Scénarios DCF avec narratif IA
# ═══════════════════════════════════════════════════════════════════════════════

def _calculate_scenario_ev(fcf_base: float, growth_rate: float, wacc: float, terminal_growth: float, horizon: int = 5) -> float:
    """Calculate enterprise value for a single DCF scenario."""
    if fcf_base <= 0:
        fcf_base = abs(fcf_base) if fcf_base != 0 else 1_000_000
    if wacc <= terminal_growth:
        terminal_growth = wacc - 0.005

    fcf_projections = []
    fcf = fcf_base
    for year in range(1, horizon + 1):
        fcf *= (1 + growth_rate)
        fcf_projections.append(fcf)

    # Terminal value (Gordon-Shapiro)
    terminal_value = fcf_projections[-1] * (1 + terminal_growth) / (wacc - terminal_growth)

    # Discount to present value
    pv_fcf = sum(f / (1 + wacc) ** i for i, f in enumerate(fcf_projections, 1))
    pv_terminal = terminal_value / (1 + wacc) ** horizon

    return pv_fcf + pv_terminal


def get_dcf_scenarios(ticker: str, company_info: dict, financials: dict, deep_financials: dict) -> dict:
    """
    Generate 3 DCF scenarios (bull/base/bear) with AI-generated narratives.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "Clé API Anthropic manquante"}

    df = deep_financials
    fcf_5y = df.get("fcf_5y", [])
    fcf_base = fcf_5y[0] if fcf_5y and fcf_5y[0] else company_info.get("free_cash_flow", 0)

    shares = company_info.get("shares_outstanding", 1)
    net_debt = company_info.get("net_debt", 0)
    price = company_info.get("price", 0)

    if shares <= 0:
        shares = 1

    # ── Calculate 3 scenarios ──
    scenarios_params = {
        "bull": {"growth_rate": 0.15, "wacc": 0.08, "terminal_growth": 0.04},
        "base": {"growth_rate": 0.08, "wacc": 0.10, "terminal_growth": 0.025},
        "bear": {"growth_rate": 0.02, "wacc": 0.12, "terminal_growth": 0.01},
    }

    scenarios = {}
    for name, params in scenarios_params.items():
        ev = _calculate_scenario_ev(fcf_base, **params)
        equity = ev - net_debt
        prix_cible = max(equity / shares, 0)
        upside = ((prix_cible - price) / price * 100) if price > 0 else 0
        scenarios[name] = {
            "prix_cible": round(prix_cible, 2),
            "upside_pct": round(upside, 1),
            "params": params,
        }

    # ── Ask Claude for narratives + probabilities ──
    client = Anthropic(api_key=api_key)

    def _fmt_money_list(lst):
        return " → ".join(_fmt_b(v) if v else "N/A" for v in (lst or []))

    prompt = f"""Tu es un analyste financier institutionnel. Génère les narratifs pour 3 scénarios DCF de {company_info.get('name', ticker)} ({ticker}).

═══ RÉSULTATS DES SCÉNARIOS DCF ═══
Bull: Prix cible ${scenarios['bull']['prix_cible']:.2f} ({scenarios['bull']['upside_pct']:+.1f}% vs cours actuel ${price:.2f})
  → Params: croissance FCF 15%, WACC 8%, terminal 4%
Base: Prix cible ${scenarios['base']['prix_cible']:.2f} ({scenarios['base']['upside_pct']:+.1f}%)
  → Params: croissance FCF 8%, WACC 10%, terminal 2.5%
Bear: Prix cible ${scenarios['bear']['prix_cible']:.2f} ({scenarios['bear']['upside_pct']:+.1f}%)
  → Params: croissance FCF 2%, WACC 12%, terminal 1%

═══ DONNÉES FINANCIÈRES ═══
FCF 5 ans: {_fmt_money_list(fcf_5y)}
Revenus 5 ans: {_fmt_money_list(df.get('revenue_5y', []))}
Marges nettes: {' → '.join(str(v) + '%' if v else 'N/A' for v in df.get('net_margin_5y', []))}
ROIC: {' → '.join(str(v) + '%' if v else 'N/A' for v in df.get('roic_5y', []))}
Secteur: {company_info.get('sector', 'N/A')}

{_format_analyst_targets(df.get('analyst_targets'))}

═══ CONSIGNES ═══
1. Les probabilités bull + base + bear doivent sommer à 100%
2. Chaque narratif: 3-4 phrases, catalyseurs PRÉCIS, pas de généralités
3. En français, ton professionnel
4. Retourne UNIQUEMENT du JSON valide

Format attendu:
{{
  "bull": {{
    "probabilite": number,
    "titre": "string (sous-titre accrocheur 5-8 mots)",
    "narratif": "string (3-4 phrases avec catalyseurs précis)",
    "hypotheses": ["string", "string", "string"]
  }},
  "base": {{
    "probabilite": number,
    "titre": "string",
    "narratif": "string",
    "hypotheses": ["string", "string", "string"]
  }},
  "bear": {{
    "probabilite": number,
    "titre": "string",
    "narratif": "string",
    "hypotheses": ["string", "string", "string"]
  }},
  "conclusion": "string (1-2 phrases — scénario le plus probable et pourquoi)"
}}"""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        ai_result = _parse_json_response(msg.content[0].text)

        # Merge AI narratives with calculated values
        result = {"prix_actuel": price}
        for name in ["bull", "base", "bear"]:
            ai_scenario = ai_result.get(name, {})
            result[name] = {
                "prix_cible": scenarios[name]["prix_cible"],
                "upside_pct": scenarios[name]["upside_pct"],
                "probabilite": ai_scenario.get("probabilite", 33),
                "titre": ai_scenario.get("titre", ""),
                "narratif": ai_scenario.get("narratif", ""),
                "hypotheses": ai_scenario.get("hypotheses", []),
            }
        result["conclusion"] = ai_result.get("conclusion", "")

        # Validate probabilities sum to ~100%
        total_prob = sum(result[s].get("probabilite", 0) for s in ["bull", "base", "bear"])
        if total_prob < 90 or total_prob > 110:
            logger.warning(f"[DCFScenarios] Probabilités somment à {total_prob}%, normalisation")
            if total_prob > 0:
                for s in ["bull", "base", "bear"]:
                    result[s]["probabilite"] = round(result[s]["probabilite"] / total_prob * 100)

        return result

    except json.JSONDecodeError as e:
        logger.error(f"[DCFScenarios] JSON parse error: {e}")
        # Return raw calculated scenarios without narratives
        return {
            "prix_actuel": price,
            "bull": {**scenarios["bull"], "probabilite": 25, "titre": "Scénario optimiste", "narratif": "", "hypotheses": []},
            "base": {**scenarios["base"], "probabilite": 50, "titre": "Scénario central", "narratif": "", "hypotheses": []},
            "bear": {**scenarios["bear"], "probabilite": 25, "titre": "Scénario pessimiste", "narratif": "", "hypotheses": []},
            "conclusion": "",
        }
    except Exception as e:
        logger.error(f"[DCFScenarios] Error: {e}")
        return {"error": "Scénarios DCF temporairement indisponibles."}


# ═══════════════════════════════════════════════════════════════════════════════
# SCREENER IA — Recherche en langage naturel
# ═══════════════════════════════════════════════════════════════════════════════

def ai_screen_stocks(user_query: str, universe: list) -> dict:
    """
    Use Claude to screen stocks based on a natural language query.
    Returns structured results with scores and reasoning.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "Cle API Anthropic manquante"}

    client = Anthropic(api_key=api_key)

    # Compact universe data for the prompt — include real financial data
    universe_compact = json.dumps([
        {"s": s.get("symbol"), "n": s.get("name"), "sec": s.get("sector", ""),
         "ind": s.get("industry", ""), "mc": s.get("marketCap", 0),
         "pe": s.get("pe"), "beta": s.get("beta"), "co": s.get("country", ""),
         "px": s.get("price", 0), "chg": s.get("change_pct")}
        for s in universe[:200]
    ], ensure_ascii=False)

    actual_count = len(universe)

    prompt = f"""Tu es un analyste financier expert specialise dans le stock screening.

L'utilisateur cherche : "{user_query}"

Voici l'univers de {actual_count} actions disponibles avec leurs donnees financieres reelles (format compact : s=symbol, n=nom, sec=secteur, mc=market cap, pe=P/E ratio, beta=beta, px=prix actuel, chg=variation %) :
{universe_compact}

CONSIGNES :
1. Selectionne les 5 a 8 actions qui correspondent LE MIEUX a la recherche de l'utilisateur
2. Minimum 3 resultats, maximum 8
3. Score de 0 a 100 basee sur la pertinence par rapport a la requete
4. Sois factuel et precis dans tes raisons
5. Retourne UNIQUEMENT du JSON valide, sans texte autour

Format JSON attendu :
{{
  "resultats": [
    {{
      "ticker": "string",
      "nom": "string",
      "score_match": number (0-100),
      "raison": "2-3 phrases expliquant pourquoi cette action correspond a la recherche",
      "points_forts": ["string", "string"],
      "point_vigilance": "string",
      "secteur": "string",
      "capitalisation": "Large Cap | Mid Cap | Small Cap"
    }}
  ],
  "interpretation_requete": "Comment tu as compris la recherche de l'utilisateur",
  "nb_actions_analysees": {actual_count}
}}

Classe les resultats par score_match decroissant."""

    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        result = _parse_json_response(msg.content[0].text)

        # Validate structure
        if "resultats" not in result:
            result["resultats"] = []
        if not isinstance(result["resultats"], list):
            result["resultats"] = []

        # Ensure 3-8 results
        result["resultats"] = result["resultats"][:8]

        # Sort by score
        result["resultats"].sort(key=lambda x: x.get("score_match", 0), reverse=True)

        return result

    except json.JSONDecodeError as e:
        logger.error(f"[AIScreener] JSON parse error: {e}")
        return {"error": "Erreur lors de l'analyse. Veuillez réessayer.", "resultats": []}
    except Exception as e:
        logger.error(f"[AIScreener] Error: {e}")
        return {"error": "Screener temporairement indisponible.", "resultats": []}


# ═══════════════════════════════════════════════════════════════════════════════
# COMPARAISON IA — Analyse comparative de deux actions
# ═══════════════════════════════════════════════════════════════════════════════

def get_comparison_analysis(ticker1_data: dict, ticker2_data: dict) -> str:
    """
    Compare deux entreprises en 3-4 phrases via Claude Sonnet.
    Returns a plain text string (not JSON).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Analyse comparative indisponible (clé API manquante)."

    client = Anthropic(api_key=api_key)

    def _summarize(d: dict) -> str:
        # Accepts flat dict from main.py build_company() — keys at top level
        return (
            f"{d.get('ticker', '?')} ({d.get('name', '?')}) — "
            f"Prix: ${d.get('price', 0):.2f}, "
            f"Valeur intrinsèque DCF: ${d.get('intrinsic_value', 0):.2f}, "
            f"Upside: {d.get('upside_pct', 0):.1f}%, "
            f"Verdict: {d.get('verdict', 'N/A')}, "
            f"P/E: {d.get('pe_ratio') or 'N/A'}, "
            f"EV/EBITDA: {d.get('ev_ebitda') or 'N/A'}, "
            f"Marge nette: {(d.get('profit_margin') or 0) * 100:.1f}%, "
            f"Croissance CA: {(d.get('revenue_growth') or 0) * 100:.1f}%, "
            f"FCF: {d.get('free_cash_flow', 'N/A')}"
        )

    prompt = f"""Compare ces deux entreprises en 3-4 phrases concises en français.
Cite des chiffres réels de la comparaison. Conclus sur laquelle représente
la meilleure opportunité d'investissement et pourquoi.

ENTREPRISE 1: {_summarize(ticker1_data)}

ENTREPRISE 2: {_summarize(ticker2_data)}

Réponds UNIQUEMENT avec le texte de l'analyse comparative (pas de JSON, pas de titres)."""

    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        logger.error(f"[CompareAI] Error: {e}")
        return "Analyse comparative temporairement indisponible."
