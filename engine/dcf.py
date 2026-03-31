import numpy as np
import pandas as pd


def calculate_dcf(
    fcf: float,
    growth_rate: float,
    wacc: float,
    terminal_growth: float,
    years: int,
    shares_outstanding: float,
    net_debt: float
) -> dict:
    """
    Calcule la valeur intrinseque par action via un modele DCF.

    Parametres:
        fcf               : Free Cash Flow de base (en dollars)
        growth_rate       : Taux de croissance annuel du FCF (ex: 0.08 pour 8%)
        wacc              : Cout moyen pondere du capital (ex: 0.10 pour 10%)
        terminal_growth   : Taux de croissance terminale (ex: 0.03 pour 3%)
        years             : Horizon de projection (3, 5, 7 ou 10 ans)
        shares_outstanding: Nombre d'actions en circulation
        net_debt          : Dette nette (dette totale - cash)

    Retourne un dict avec:
        - enterprise_value           : Valeur d'entreprise totale
        - equity_value               : Valeur des fonds propres
        - intrinsic_value_per_share  : Valeur intrinseque par action
        - terminal_value_pv          : Valeur terminale actualisee
        - fcf_projections            : Liste des FCF projetes par annee
        - pv_fcfs                    : Liste des FCF actualises par annee
    """
    if fcf <= 0:
        fcf = max(fcf, 1)

    if wacc <= terminal_growth:
        terminal_growth = wacc - 0.01

    # Projections FCF
    fcf_projections = []
    pv_fcfs = []

    for i in range(1, years + 1):
        projected_fcf = fcf * ((1 + growth_rate) ** i)
        discount_factor = (1 + wacc) ** i
        pv = projected_fcf / discount_factor
        fcf_projections.append(projected_fcf)
        pv_fcfs.append(pv)

    # Valeur terminale (Gordon Growth Model)
    last_fcf = fcf_projections[-1]
    terminal_value = last_fcf * (1 + terminal_growth) / (wacc - terminal_growth)
    terminal_value_pv = terminal_value / ((1 + wacc) ** years)

    # Valeur d'entreprise = somme des FCF actualises + valeur terminale actualisee
    enterprise_value = sum(pv_fcfs) + terminal_value_pv

    # Valeur des fonds propres = EV - dette nette
    equity_value = enterprise_value - net_debt

    # Valeur par action
    if shares_outstanding and shares_outstanding > 0:
        intrinsic_value_per_share = equity_value / shares_outstanding
    else:
        intrinsic_value_per_share = 0.0

    return {
        "enterprise_value": enterprise_value,
        "equity_value": equity_value,
        "intrinsic_value_per_share": intrinsic_value_per_share,
        "terminal_value_pv": terminal_value_pv,
        "fcf_projections": fcf_projections,
        "pv_fcfs": pv_fcfs,
    }


def sensitivity_analysis(
    fcf: float,
    base_growth: float,
    base_wacc: float,
    terminal_growth: float,
    years: int,
    shares_outstanding: float,
    net_debt: float
) -> pd.DataFrame:
    """
    Genere une matrice de sensibilite 5x5 du prix intrinseque
    en faisant varier le taux de croissance FCF et le WACC.

    Retourne un DataFrame pandas avec:
        - Index   : taux de croissance FCF (lignes)
        - Colonnes: WACC (colonnes)
        - Valeurs : prix intrinseque par action ($)
    """
    growth_range = [
        base_growth - 0.04,
        base_growth - 0.02,
        base_growth,
        base_growth + 0.02,
        base_growth + 0.04,
    ]
    wacc_range = [
        base_wacc - 0.02,
        base_wacc - 0.01,
        base_wacc,
        base_wacc + 0.01,
        base_wacc + 0.02,
    ]

    # Garde les valeurs positives et coherentes
    growth_range = [max(0.01, g) for g in growth_range]
    wacc_range   = [max(0.01, w) for w in wacc_range]

    results = {}

    for w in wacc_range:
        col_label = f"{w*100:.0f}%"
        col_data = {}
        for g in growth_range:
            row_label = f"{g*100:.0f}%"
            term_g = min(terminal_growth, w - 0.005)
            try:
                res = calculate_dcf(
                    fcf=fcf,
                    growth_rate=g,
                    wacc=w,
                    terminal_growth=term_g,
                    years=years,
                    shares_outstanding=shares_outstanding,
                    net_debt=net_debt
                )
                col_data[row_label] = round(res["intrinsic_value_per_share"], 2)
            except Exception:
                col_data[row_label] = 0.0
        results[col_label] = col_data

    df = pd.DataFrame(results)
    return df
