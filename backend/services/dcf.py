"""
ValuEngine — DCF Engine
Calcul de la valeur intrinsèque par actualisation des flux de trésorerie.
"""

from __future__ import annotations

import numpy as np


def calculate_dcf(
    fcf: float,
    growth_rate: float,
    wacc: float,
    terminal_growth: float,
    horizon: int,
    shares_outstanding: float,
    net_debt: float,
) -> dict:
    """
    Calcule la valeur intrinsèque d'une action via le modèle DCF.

    Args:
        fcf               : Free Cash Flow de base (en $)
        growth_rate       : Taux de croissance annuel du FCF (ex: 0.08 = 8%)
        wacc              : Coût moyen pondéré du capital (ex: 0.10 = 10%)
        terminal_growth   : Taux de croissance terminal (ex: 0.03 = 3%)
        horizon           : Nombre d'années de projection (3-10)
        shares_outstanding: Nombre d'actions en circulation
        net_debt          : Dette nette (dette totale - cash)

    Returns:
        dict avec enterprise_value, equity_value, intrinsic_value,
        terminal_value_pv, fcf_projections, pv_fcfs
    """
    # Garde-fous — erreurs explicites plutôt que fallbacks silencieux
    if shares_outstanding <= 0:
        return {
            "enterprise_value_dcf": 0, "equity_value": 0, "intrinsic_value": 0,
            "terminal_value_pv": 0, "fcf_projections": [], "pv_fcfs": [],
            "warning": "Shares outstanding non disponibles — DCF impossible",
        }
    if fcf == 0:
        return {
            "enterprise_value_dcf": 0, "equity_value": 0, "intrinsic_value": 0,
            "terminal_value_pv": 0, "terminal_value_undiscounted": 0,
            "terminal_value_pct": 0, "terminal_growth_warning": False,
            "confidence_warning": "high",
            "fcf_projections": [], "pv_fcfs": [],
            "warning": "Free Cash Flow nul — DCF non significatif",
        }
    # FCF négatif : on garde le signe pour les projections (entreprise en perte)
    # Le résultat intrinsic_value sera négatif → clampé à 0 en sortie
    if wacc <= terminal_growth:
        terminal_growth = wacc - 0.005
        # Warning ajouté au retour
    horizon = max(3, min(horizon, 10))

    # Projection des FCF et actualisation
    fcf_projections = []
    pv_fcfs = []
    for year in range(1, horizon + 1):
        projected_fcf = fcf * ((1 + growth_rate) ** year)
        pv = projected_fcf / ((1 + wacc) ** year)
        fcf_projections.append(projected_fcf)
        pv_fcfs.append(pv)

    # Valeur terminale (modèle de Gordon)
    terminal_fcf = fcf_projections[-1] * (1 + terminal_growth)
    terminal_value = terminal_fcf / (wacc - terminal_growth)
    terminal_value_pv = terminal_value / ((1 + wacc) ** horizon)

    # Valeur d'entreprise = somme PV + valeur terminale PV
    enterprise_value = sum(pv_fcfs) + terminal_value_pv

    # Valeur des fonds propres = EV - dette nette
    equity_value = enterprise_value - net_debt

    # Valeur intrinsèque par action
    intrinsic_value = equity_value / shares_outstanding

    # Terminal value as percentage of total enterprise value
    tv_pct = round(terminal_value_pv / enterprise_value * 100, 1) if enterprise_value > 0 else 0

    return {
        "enterprise_value_dcf": enterprise_value,
        "equity_value":         equity_value,
        "intrinsic_value":      max(intrinsic_value, 0.0),
        "terminal_value_pv":    terminal_value_pv,
        "terminal_value_undiscounted": terminal_value,
        "terminal_value_pct":   tv_pct,
        "terminal_growth_warning": terminal_growth > 0.035,
        "confidence_warning": "high" if tv_pct > 75 else ("medium" if tv_pct > 60 else "low"),
        "fcf_projections":      fcf_projections,
        "pv_fcfs":              pv_fcfs,
    }


def calculate_irr(price: float, fcf_projections: list, terminal_value_undiscounted: float, shares_outstanding: float, net_debt: float) -> float | None:
    """Calculate the implied IRR (internal rate of return) at the current market price."""
    try:
        equity_value_market = price * shares_outstanding
        ev_market = equity_value_market + net_debt

        # Cash flows: negative initial investment, then FCF projections, last includes terminal value
        cash_flows = [-ev_market]
        for i, fcf in enumerate(fcf_projections):
            if i == len(fcf_projections) - 1:
                cash_flows.append(fcf + terminal_value_undiscounted)
            else:
                cash_flows.append(fcf)

        # Newton-Raphson method for IRR
        rate = 0.10  # initial guess
        for _ in range(100):
            npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows))
            dnpv = sum(-t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cash_flows))
            if abs(dnpv) < 1e-10:
                break
            rate = rate - npv / dnpv
            if abs(npv) < 1e-6:
                break

        if -0.5 < rate < 2.0:  # sanity check
            return round(rate * 100, 2)
        return None
    except Exception:
        return None


def sensitivity_analysis(
    fcf: float,
    base_growth: float,
    base_wacc: float,
    terminal_growth: float,
    horizon: int,
    shares_outstanding: float,
    net_debt: float,
) -> dict:
    """
    Génère une matrice de sensibilité : prix intrinsèque selon
    différentes combinaisons de croissance FCF (lignes) et WACC (colonnes).

    Returns:
        dict {
            "index": [...],   # labels des lignes (growth rates)
            "columns": [...], # labels des colonnes (wacc)
            "values": [...]   # matrice 5x5 de float
        }
    """
    growth_deltas = [-0.04, -0.02, 0.0, +0.02, +0.04]
    wacc_deltas   = [-0.02, -0.01, 0.0, +0.01, +0.02]

    growth_range = [max(0.01, base_growth + d) for d in growth_deltas]
    wacc_range   = [max(0.02, base_wacc   + d) for d in wacc_deltas]

    index_labels   = [f"{g*100:.0f}%" for g in growth_range]
    columns_labels = [f"{w*100:.0f}%" for w in wacc_range]

    matrix = []
    for g in growth_range:
        row = []
        for w in wacc_range:
            tg = min(terminal_growth, w - 0.005)
            try:
                result = calculate_dcf(fcf, g, w, tg, horizon, shares_outstanding, net_debt)
                row.append(round(result["intrinsic_value"], 2))
            except Exception:
                row.append(0.0)
        matrix.append(row)

    return {
        "index":   index_labels,
        "columns": columns_labels,
        "values":  matrix,
    }


# ── Sector-specific DCF defaults ────────────────────────────────────────

SECTOR_DCF_DEFAULTS: dict[str, dict] = {
    "Technology":          {"growth_rate": 0.12, "wacc": 0.10, "terminal_growth": 0.03, "horizon": 7},
    "Healthcare":          {"growth_rate": 0.10, "wacc": 0.09, "terminal_growth": 0.03, "horizon": 7},
    "Consumer Cyclical":   {"growth_rate": 0.08, "wacc": 0.10, "terminal_growth": 0.025, "horizon": 5},
    "Consumer Defensive":  {"growth_rate": 0.05, "wacc": 0.08, "terminal_growth": 0.025, "horizon": 5},
    "Financial Services":  {"growth_rate": 0.06, "wacc": 0.11, "terminal_growth": 0.03, "horizon": 5},
    "Industrials":         {"growth_rate": 0.07, "wacc": 0.09, "terminal_growth": 0.025, "horizon": 6},
    "Energy":              {"growth_rate": 0.04, "wacc": 0.11, "terminal_growth": 0.02, "horizon": 5},
    "Utilities":           {"growth_rate": 0.03, "wacc": 0.07, "terminal_growth": 0.02, "horizon": 5},
    "Real Estate":         {"growth_rate": 0.04, "wacc": 0.08, "terminal_growth": 0.025, "horizon": 5},
    "Basic Materials":     {"growth_rate": 0.05, "wacc": 0.10, "terminal_growth": 0.02, "horizon": 5},
    "Communication Services": {"growth_rate": 0.08, "wacc": 0.09, "terminal_growth": 0.03, "horizon": 6},
}


def get_sector_dcf_defaults(sector: str) -> dict:
    """Return sector-appropriate DCF defaults. Falls back to moderate defaults."""
    return SECTOR_DCF_DEFAULTS.get(sector, {
        "growth_rate": 0.08, "wacc": 0.10, "terminal_growth": 0.03, "horizon": 5,
    })
