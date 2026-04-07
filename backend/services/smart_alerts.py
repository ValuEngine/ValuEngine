"""
ValuEngine — Smart Contextual Alerts
AI-powered alerts that cross portfolio positions with fundamentals + market context.
Generates actionable insights like "AAPL is approaching your target price" or
"Your tech allocation is above 60% after NVDA rally".
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("valuengine")


def generate_smart_alerts(positions: list[dict], market_context: Optional[dict] = None) -> list[dict]:
    """
    Generate deterministic smart alerts from portfolio data.

    Input positions: [{ ticker, shares, avg_price, current_price, current_value, pnl_pct, sector? }]

    Returns list of alerts with severity, type, message, and action.
    """
    if not positions:
        return []

    alerts = []
    total_value = sum(p.get("current_value", 0) for p in positions)
    if total_value <= 0:
        return []

    # ── 1. Big movers (>5% daily or >15% from avg_price) ──
    for p in positions:
        pnl_pct = p.get("pnl_pct", 0)
        ticker = p.get("ticker", "?")

        if pnl_pct > 30:
            alerts.append({
                "type": "take_profit",
                "severity": "info",
                "ticker": ticker,
                "title": f"{ticker} est en hausse de +{pnl_pct:.0f}%",
                "message": f"Ta position {ticker} a gagne {pnl_pct:.0f}% depuis ton achat. Envisage de securiser une partie de tes gains.",
                "action": "Analyser",
                "action_url": f"/analyze?ticker={ticker}",
            })
        elif pnl_pct < -20:
            alerts.append({
                "type": "stop_loss",
                "severity": "warning",
                "ticker": ticker,
                "title": f"{ticker} est en baisse de {pnl_pct:.0f}%",
                "message": f"Ta position {ticker} a perdu {abs(pnl_pct):.0f}%. Verifie si ta these d'investissement est toujours valide.",
                "action": "Analyser",
                "action_url": f"/analyze?ticker={ticker}",
            })

    # ── 2. Concentration alerts ──
    for p in positions:
        weight = p.get("current_value", 0) / total_value if total_value > 0 else 0
        if weight > 0.35:
            alerts.append({
                "type": "concentration",
                "severity": "warning",
                "ticker": p.get("ticker", "?"),
                "title": f"{p.get('ticker', '?')} represente {weight*100:.0f}% du portefeuille",
                "message": f"Forte concentration sur une seule position. Diversifie pour reduire le risque.",
                "action": "Voir portefeuille",
                "action_url": "/portfolio",
            })

    # ── 3. Sector concentration ──
    sector_weights: dict[str, float] = {}
    for p in positions:
        sector = p.get("sector", "Unknown")
        w = p.get("current_value", 0) / total_value if total_value > 0 else 0
        sector_weights[sector] = sector_weights.get(sector, 0) + w

    for sector, sw in sector_weights.items():
        if sw > 0.6 and sector not in ("Unknown", "Autre") and len(positions) >= 3:
            alerts.append({
                "type": "sector_concentration",
                "severity": "warning",
                "ticker": None,
                "title": f"Secteur {sector} = {sw*100:.0f}% du portefeuille",
                "message": f"Plus de 60% de ton portefeuille est dans le secteur {sector}. Pense a diversifier.",
                "action": "Screener IA",
                "action_url": "/screener",
            })

    # ── 4. Small position alerts (< 2% of portfolio) ──
    small_positions = [p for p in positions if (p.get("current_value", 0) / total_value) < 0.02]
    if len(small_positions) >= 3:
        tickers = ", ".join(p.get("ticker", "?") for p in small_positions[:5])
        alerts.append({
            "type": "small_positions",
            "severity": "info",
            "ticker": None,
            "title": f"{len(small_positions)} micro-positions detectees",
            "message": f"Les positions {tickers} representent moins de 2% chacune. Envisage de consolider.",
            "action": "Voir portefeuille",
            "action_url": "/portfolio",
        })

    # ── 5. No diversification ──
    if len(positions) >= 5 and len([s for s in sector_weights if s not in ("Unknown", "Autre")]) <= 1:
        alerts.append({
            "type": "no_diversification",
            "severity": "danger",
            "ticker": None,
            "title": "Aucune diversification sectorielle",
            "message": "Toutes tes positions sont dans le meme secteur. C'est un risque majeur.",
            "action": "Screener IA",
            "action_url": "/screener",
        })

    # Sort by severity (danger > warning > info)
    severity_order = {"danger": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    return alerts[:10]  # Max 10 alerts


def build_smart_alerts_ai_prompt(positions: list[dict], deterministic_alerts: list[dict]) -> str:
    """Build AI prompt to generate contextual insights beyond deterministic rules."""
    import json
    pos_text = json.dumps(positions[:15], ensure_ascii=False)
    alerts_text = json.dumps(deterministic_alerts[:5], ensure_ascii=False)

    return f"""Tu es un conseiller en investissement pour investisseurs francais.

Voici un portefeuille et les alertes deja detectees :

Positions: {pos_text}
Alertes existantes: {alerts_text}

Genere 2-3 alertes contextuelles SUPPLEMENTAIRES que les regles deterministes n'ont pas detectees.
Pense a : correlations entre positions, timing de marche, risques macro, opportunites de rebalancing.

Retourne un JSON :
{{
  "ai_alerts": [
    {{
      "type": "ai_insight",
      "severity": "info"|"warning",
      "title": "titre court",
      "message": "explication en 1-2 phrases",
      "action": "texte du bouton",
      "action_url": "/analyze?ticker=XXX" ou "/portfolio"
    }}
  ]
}}

En francais. Retourne UNIQUEMENT du JSON valide."""
