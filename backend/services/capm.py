"""
ValuEngine — CAPM-based WACC Calculator
Estimates WACC from beta, capital structure, and market parameters.
"""


def calculate_capm_wacc(
    beta: float | None,
    market_cap: float,
    total_debt: float,
    total_cash: float,
    risk_free_rate: float = 0.045,
    market_risk_premium: float = 0.055,
    tax_rate: float = 0.25,
    cost_of_debt: float = 0.05,
) -> dict:
    beta_used = beta if beta and beta > 0 else 1.0

    # Cost of equity via CAPM
    cost_of_equity = risk_free_rate + beta_used * market_risk_premium

    # Capital structure
    net_debt = total_debt - total_cash
    if net_debt <= 0 or market_cap <= 0:
        # Cash-rich company: 100% equity financed
        equity_weight = 1.0
        debt_weight = 0.0
    else:
        total_value = market_cap + net_debt
        equity_weight = market_cap / total_value
        debt_weight = net_debt / total_value

    # WACC
    wacc = equity_weight * cost_of_equity + debt_weight * cost_of_debt * (1 - tax_rate)

    # Clamp to reasonable range [3%, 25%]
    wacc = max(0.03, min(wacc, 0.25))

    return {
        "suggested_wacc": round(wacc, 4),
        "cost_of_equity": round(cost_of_equity, 4),
        "cost_of_debt": round(cost_of_debt, 4),
        "equity_weight": round(equity_weight, 4),
        "debt_weight": round(debt_weight, 4),
        "beta_used": round(beta_used, 2),
        "risk_free_rate": risk_free_rate,
        "market_risk_premium": market_risk_premium,
    }
