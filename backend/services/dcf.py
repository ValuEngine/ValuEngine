"""
ValuEngine — DCF Engine
Calcul de la valeur intrinsèque par actualisation des flux de trésorerie.
"""

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
    # Garde-fous
    if fcf <= 0:
        fcf = abs(fcf) if fcf != 0 else 1_000_000
    if wacc <= terminal_growth:
        terminal_growth = wacc - 0.005
    if shares_outstanding <= 0:
        shares_outstanding = 1.0
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

    return {
        "enterprise_value_dcf": enterprise_value,
        "equity_value":         equity_value,
        "intrinsic_value":      max(intrinsic_value, 0.0),
        "terminal_value_pv":    terminal_value_pv,
        "fcf_projections":      fcf_projections,
        "pv_fcfs":              pv_fcfs,
    }


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
