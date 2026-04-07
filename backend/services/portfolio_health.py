"""
ValuEngine — Portfolio Health Score (0-100)
Calculates a deterministic health score from portfolio metrics,
then enriches with AI recommendations.
"""
from __future__ import annotations

import logging
import math
from typing import Optional

logger = logging.getLogger("valuengine")


def calculate_health_score(positions: list[dict]) -> dict:
    """
    Calculate a deterministic Portfolio Health Score (0-100).

    Input positions: [{ ticker, shares, avg_price, current_price, current_value, pnl_pct, sector? }]

    Score components (total 100):
    - Diversification (30pts): sector count, concentration (HHI), position count
    - Performance (25pts): overall P&L, % of winning positions
    - Risk (25pts): max single position weight, max drawdown, volatility proxy
    - Balance (20pts): sector balance, geographic mix
    """
    if not positions or len(positions) == 0:
        return _empty_score()

    n = len(positions)
    total_value = sum(p.get("current_value", 0) for p in positions)
    if total_value <= 0:
        return _empty_score()

    # ── Weights ──
    weights = [(p.get("current_value", 0) / total_value) for p in positions]

    # ── 1. Diversification Score (30pts) ──
    # Position count score (0-10): 1 pos = 0, 5 = 5, 10+ = 10
    pos_count_score = min(n / 10, 1.0) * 10

    # HHI (Herfindahl-Hirschman Index): lower = more diversified
    hhi = sum(w ** 2 for w in weights)
    # Perfect = 1/n, worst = 1.0. Normalize to 0-10
    hhi_score = max(0, (1 - hhi) / (1 - 1 / max(n, 1))) * 10 if n > 1 else 0

    # Sector diversity (0-10): unique sectors
    sectors = set(p.get("sector", "Unknown") for p in positions)
    sectors.discard("Unknown")
    sectors.discard("Autre")
    sector_count = len(sectors)
    sector_score = min(sector_count / 6, 1.0) * 10

    diversification = pos_count_score + hhi_score + sector_score  # max 30

    # ── 2. Performance Score (25pts) ──
    total_cost = sum(p.get("shares", 0) * p.get("avg_price", 0) for p in positions)
    total_pnl_pct = ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0

    # Overall P&L score (0-15): -20% = 0, 0% = 7.5, +20% = 15
    pnl_score = min(max((total_pnl_pct + 20) / 40, 0), 1.0) * 15

    # Win rate (0-10): % of positions in profit
    winners = sum(1 for p in positions if p.get("pnl_pct", 0) > 0)
    win_rate = winners / n if n > 0 else 0
    win_score = win_rate * 10

    performance = pnl_score + win_score  # max 25

    # ── 3. Risk Score (25pts) ──
    max_weight = max(weights)
    # Max concentration penalty (0-15): <10% = 15, >50% = 0
    concentration_score = max(0, (0.5 - max_weight) / 0.4) * 15

    # Max single loss (0-10): worst pnl_pct
    worst_pnl = min(p.get("pnl_pct", 0) for p in positions)
    # -50% or worse = 0, 0% or better = 10
    loss_score = min(max((worst_pnl + 50) / 50, 0), 1.0) * 10

    risk = concentration_score + loss_score  # max 25

    # ── 4. Balance Score (20pts) ──
    # Sector balance via entropy (0-10)
    sector_weights: dict[str, float] = {}
    for p, w in zip(positions, weights):
        s = p.get("sector", "Unknown")
        sector_weights[s] = sector_weights.get(s, 0) + w

    entropy = 0
    for sw in sector_weights.values():
        if sw > 0:
            entropy -= sw * math.log(sw)
    max_entropy = math.log(max(len(sector_weights), 1)) if len(sector_weights) > 1 else 1
    entropy_score = (entropy / max_entropy) * 10 if max_entropy > 0 else 0

    # Position size balance (0-10): stdev of weights
    avg_weight = 1 / n if n > 0 else 0
    weight_variance = sum((w - avg_weight) ** 2 for w in weights) / n if n > 0 else 0
    weight_std = math.sqrt(weight_variance)
    # Lower std = more balanced. std of 0.3+ is bad
    balance_pos_score = max(0, (0.3 - weight_std) / 0.3) * 10

    balance = entropy_score + balance_pos_score  # max 20

    # ── Total Score ──
    total_score = round(diversification + performance + risk + balance)
    total_score = max(0, min(100, total_score))

    # ── Grade ──
    if total_score >= 80:
        grade = "A"
        grade_label = "Excellent"
        grade_color = "#00d4aa"
    elif total_score >= 65:
        grade = "B"
        grade_label = "Bon"
        grade_color = "#C9A84C"
    elif total_score >= 45:
        grade = "C"
        grade_label = "Moyen"
        grade_color = "#fb923c"
    elif total_score >= 25:
        grade = "D"
        grade_label = "Faible"
        grade_color = "#ff4d6d"
    else:
        grade = "F"
        grade_label = "Critique"
        grade_color = "#ef4444"

    # ── Detail breakdown ──
    breakdown = {
        "diversification": {"score": round(diversification, 1), "max": 30, "details": {
            "positions": n,
            "sectors": sector_count,
            "hhi": round(hhi, 4),
        }},
        "performance": {"score": round(performance, 1), "max": 25, "details": {
            "total_pnl_pct": round(total_pnl_pct, 1),
            "win_rate": round(win_rate * 100, 1),
            "winners": winners,
            "losers": n - winners,
        }},
        "risk": {"score": round(risk, 1), "max": 25, "details": {
            "max_weight_pct": round(max_weight * 100, 1),
            "worst_position_pnl_pct": round(worst_pnl, 1),
        }},
        "balance": {"score": round(balance, 1), "max": 20, "details": {
            "sector_count": len(sector_weights),
            "entropy_normalized": round(entropy / max_entropy, 2) if max_entropy > 0 else 0,
        }},
    }

    # ── Top issues ──
    issues = []
    if n < 5:
        issues.append({"severity": "warning", "message": f"Seulement {n} position(s) — diversifie davantage"})
    if max_weight > 0.3:
        top_ticker = positions[weights.index(max_weight)].get("ticker", "?")
        issues.append({"severity": "warning", "message": f"{top_ticker} represente {max_weight*100:.0f}% du portefeuille"})
    if sector_count <= 2 and n >= 3:
        issues.append({"severity": "warning", "message": "Trop peu de secteurs representes"})
    if worst_pnl < -30:
        worst_ticker = min(positions, key=lambda p: p.get("pnl_pct", 0)).get("ticker", "?")
        issues.append({"severity": "danger", "message": f"{worst_ticker} est en perte de {worst_pnl:.0f}%"})
    if win_rate < 0.4 and n >= 3:
        issues.append({"severity": "warning", "message": f"Seulement {winners}/{n} positions en profit"})

    # Note: correlation data should be passed separately via calculate_correlation_matrix()
    # and merged in the endpoint. This keeps health_score calculation fast & deterministic.

    return {
        "score": total_score,
        "grade": grade,
        "grade_label": grade_label,
        "grade_color": grade_color,
        "breakdown": breakdown,
        "issues": issues[:5],
        "positions_count": n,
        "total_value": round(total_value, 2),
    }


def build_health_ai_prompt(score_data: dict, positions: list[dict]) -> str:
    """Build a prompt for AI recommendations based on the health score."""
    import json
    return f"""Tu es un conseiller en gestion de portefeuille pour investisseurs francais.

Voici le score de sante d'un portefeuille (0-100) :
Score global: {score_data['score']}/100 (Grade: {score_data['grade']})

Decomposition:
- Diversification: {score_data['breakdown']['diversification']['score']}/30
- Performance: {score_data['breakdown']['performance']['score']}/25
- Risque: {score_data['breakdown']['risk']['score']}/25
- Equilibre: {score_data['breakdown']['balance']['score']}/20

Problemes detectes: {json.dumps(score_data['issues'], ensure_ascii=False)}

Positions: {json.dumps(positions[:20], ensure_ascii=False)}

Retourne un JSON avec exactement cette structure :
{{
  "analyse": "2-3 phrases d'analyse globale du portefeuille",
  "recommandations": [
    "recommandation concrete 1",
    "recommandation concrete 2",
    "recommandation concrete 3"
  ],
  "actions_prioritaires": [
    "action immediate 1",
    "action immediate 2"
  ]
}}

Sois concret et actionnable. En francais. Retourne UNIQUEMENT du JSON valide."""


def calculate_correlation_matrix(tickers: list[str], period: str = "1y") -> dict:
    """
    Calculate pairwise correlation matrix for a list of tickers using yfinance.
    Returns correlation matrix, portfolio variance info, and high-correlation alerts.
    """
    import numpy as np

    if len(tickers) < 2:
        return {"matrix": {}, "high_correlations": [], "portfolio_diversification_score": 100}

    try:
        import yfinance as yf
        # Download all tickers at once
        data = yf.download(tickers, period=period, auto_adjust=True, progress=False)

        if data.empty:
            return {"matrix": {}, "high_correlations": [], "portfolio_diversification_score": 100}

        # Extract close prices
        if len(tickers) == 1:
            closes = data[["Close"]]
            closes.columns = tickers
        else:
            closes = data["Close"]

        # Drop tickers with insufficient data
        closes = closes.dropna(axis=1, thresh=int(len(closes) * 0.5))
        valid_tickers = list(closes.columns)

        if len(valid_tickers) < 2:
            return {"matrix": {}, "high_correlations": [], "portfolio_diversification_score": 100}

        # Daily returns
        returns = closes.pct_change().dropna()

        if len(returns) < 20:
            return {"matrix": {}, "high_correlations": [], "portfolio_diversification_score": 100}

        # Correlation matrix
        corr = returns.corr()

        # Convert to serializable dict
        corr_dict = {}
        for t1 in valid_tickers:
            corr_dict[t1] = {}
            for t2 in valid_tickers:
                corr_dict[t1][t2] = round(float(corr.loc[t1, t2]), 3)

        # Find high correlations (>0.8)
        high_correlations = []
        seen = set()
        for i, t1 in enumerate(valid_tickers):
            for j, t2 in enumerate(valid_tickers):
                if i < j:
                    c = float(corr.loc[t1, t2])
                    pair = tuple(sorted([t1, t2]))
                    if pair not in seen and abs(c) > 0.8:
                        seen.add(pair)
                        high_correlations.append({
                            "pair": [t1, t2],
                            "correlation": round(c, 3),
                            "warning": f"{t1} et {t2} sont très corrélés ({c:.0%})"
                        })

        # Average correlation as diversification metric
        n = len(valid_tickers)
        total_corr = 0
        count = 0
        for i in range(n):
            for j in range(i + 1, n):
                total_corr += abs(float(corr.iloc[i, j]))
                count += 1
        avg_corr = total_corr / count if count > 0 else 0

        # Diversification score: 100 = perfectly uncorrelated, 0 = perfectly correlated
        diversification_score = round(max(0, (1 - avg_corr)) * 100)

        # Annualized volatility per ticker
        volatilities = {}
        for t in valid_tickers:
            vol = float(returns[t].std() * np.sqrt(252) * 100)
            volatilities[t] = round(vol, 1)

        return {
            "matrix": corr_dict,
            "high_correlations": high_correlations,
            "portfolio_diversification_score": diversification_score,
            "avg_correlation": round(avg_corr, 3),
            "volatilities": volatilities,
            "tickers_analyzed": valid_tickers,
        }

    except Exception as e:
        logger.error(f"[Correlation] Error: {e}")
        return {"matrix": {}, "high_correlations": [], "portfolio_diversification_score": 100}


def _empty_score() -> dict:
    return {
        "score": 0,
        "grade": "F",
        "grade_label": "Aucune donnee",
        "grade_color": "#71717a",
        "breakdown": {
            "diversification": {"score": 0, "max": 30, "details": {}},
            "performance": {"score": 0, "max": 25, "details": {}},
            "risk": {"score": 0, "max": 25, "details": {}},
            "balance": {"score": 0, "max": 20, "details": {}},
        },
        "issues": [],
        "positions_count": 0,
        "total_value": 0,
    }
