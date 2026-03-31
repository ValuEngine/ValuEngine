import pandas as pd

def calculate_dcf(fcf, growth_rate, wacc, terminal_growth, years, shares_outstanding, net_debt):
    if fcf <= 0:
        fcf = max(fcf, 1)
    if wacc <= terminal_growth:
        terminal_growth = wacc - 0.01
    fcf_projections = []
    pv_fcfs = []
    for i in range(1, years + 1):
        projected = fcf * ((1 + growth_rate) ** i)
        pv = projected / ((1 + wacc) ** i)
        fcf_projections.append(projected)
        pv_fcfs.append(pv)
    last_fcf = fcf_projections[-1]
    terminal_value = last_fcf * (1 + terminal_growth) / (wacc - terminal_growth)
    terminal_value_pv = terminal_value / ((1 + wacc) ** years)
    enterprise_value = sum(pv_fcfs) + terminal_value_pv
    equity_value = enterprise_value - net_debt
    intrinsic = equity_value / shares_outstanding if shares_outstanding > 0 else 0
    return {
        "enterprise_value": enterprise_value,
        "equity_value": equity_value,
        "intrinsic_value_per_share": intrinsic,
        "terminal_value_pv": terminal_value_pv,
        "fcf_projections": fcf_projections,
        "pv_fcfs": pv_fcfs,
    }

def sensitivity_analysis(fcf, base_growth, base_wacc, terminal_growth, years, shares_outstanding, net_debt):
    growth_range = [max(0.01, base_growth + d) for d in [-0.04, -0.02, 0, 0.02, 0.04]]
    wacc_range   = [max(0.01, base_wacc + d)   for d in [-0.02, -0.01, 0, 0.01, 0.02]]
    results = {}
    for w in wacc_range:
        col = f"{w*100:.0f}%"
        col_data = {}
        for g in growth_range:
            row = f"{g*100:.0f}%"
            tg = min(terminal_growth, w - 0.005)
            try:
                res = calculate_dcf(fcf, g, w, tg, years, shares_outstanding, net_debt)
                col_data[row] = round(res["intrinsic_value_per_share"], 2)
            except Exception:
                col_data[row] = 0.0
        results[col] = col_data
    return pd.DataFrame(results)
