def calculate_dcf(data: dict, growth_rate: float = 0.08, terminal_growth: float = 0.03, wacc: float = 0.10, years: int = 5) -> dict:
    fcf = data["free_cashflow"]
    shares = data["shares_outstanding"]
    cash = data["cash"]
    debt = data["total_debt"]

    if fcf <= 0 or shares <= 0:
        return {"error": "Données insuffisantes pour le DCF"}

    projected_fcf = [fcf * (1 + growth_rate) ** i for i in range(1, years + 1)]
    discounted_fcf = [cf / (1 + wacc) ** (i + 1) for i, cf in enumerate(projected_fcf)]
    terminal_value = projected_fcf[-1] * (1 + terminal_growth) / (wacc - terminal_growth)
    discounted_terminal = terminal_value / (1 + wacc) ** years
    enterprise_value = sum(discounted_fcf) + discounted_terminal
    equity_value = enterprise_value + cash - debt
    intrinsic_price = equity_value / shares
    upside = ((intrinsic_price - data["current_price"]) / data["current_price"]) * 100

    return {
        "intrinsic_price": round(intrinsic_price, 2),
        "current_price": data["current_price"],
        "upside": round(upside, 2),
        "enterprise_value": round(enterprise_value / 1e9, 2),
        "equity_value": round(equity_value / 1e9, 2),
        "projected_fcf": [round(x / 1e9, 2) for x in projected_fcf],
        "discounted_fcf": [round(x / 1e9, 2) for x in discounted_fcf],
        "terminal_value": round(discounted_terminal / 1e9, 2),
        "wacc": wacc,
        "growth_rate": growth_rate,
        "terminal_growth": terminal_growth,
    }


def sensitivity_analysis(data: dict, terminal_growth: float, years: int) -> list:
    growth_rates = [0.04, 0.06, 0.08, 0.10, 0.12]
    waccs = [0.08, 0.09, 0.10, 0.11, 0.12]
    table = []
    for g in growth_rates:
        row = {"Croissance FCF": f"{int(g*100)}%"}
        for w in waccs:
            result = calculate_dcf(data, g, terminal_growth, w, years)
            if "error" not in result:
                row[f"WACC {int(w*100)}%"] = f"${result['intrinsic_price']}"
            else:
                row[f"WACC {int(w*100)}%"] = "N/A"
        table.append(row)
    return table