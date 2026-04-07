"""
ValuEngine — CAPM-based WACC Calculator
Estimates WACC from beta, capital structure, and market parameters.
"""

import numpy as np


def calculate_dynamic_beta(ticker: str, benchmark: str = "^GSPC", period_years: int = 2) -> dict:
    """Calculate beta via OLS regression on weekly returns."""
    try:
        import yfinance as yf
        from datetime import datetime, timedelta

        end = datetime.now()
        start = end - timedelta(days=period_years * 365)

        stock = yf.Ticker(ticker)
        bench = yf.Ticker(benchmark)

        stock_hist = stock.history(start=start, end=end, interval="1wk")
        bench_hist = bench.history(start=start, end=end, interval="1wk")

        if len(stock_hist) < 20 or len(bench_hist) < 20:
            return {"beta": None, "r_squared": None, "source": "insufficient_data", "period": None}

        # Align dates
        common_dates = stock_hist.index.intersection(bench_hist.index)
        if len(common_dates) < 20:
            return {"beta": None, "r_squared": None, "source": "insufficient_data", "period": None}

        stock_prices = stock_hist.loc[common_dates]["Close"].values
        bench_prices = bench_hist.loc[common_dates]["Close"].values

        stock_returns = np.diff(stock_prices) / stock_prices[:-1]
        bench_returns = np.diff(bench_prices) / bench_prices[:-1]

        # OLS regression: stock_return = alpha + beta * bench_return
        cov = np.cov(stock_returns, bench_returns)
        beta = cov[0, 1] / cov[1, 1] if cov[1, 1] != 0 else 1.0

        # R-squared
        correlation = np.corrcoef(stock_returns, bench_returns)[0, 1]
        r_squared = correlation ** 2

        # Determine benchmark used
        benchmark_name = "S&P 500" if benchmark == "^GSPC" else benchmark

        return {
            "beta": round(float(beta), 3),
            "r_squared": round(float(r_squared), 3),
            "source": "regression",
            "period": f"{period_years}Y weekly",
            "data_points": len(common_dates) - 1,
            "benchmark": benchmark_name,
        }
    except Exception:
        return {"beta": None, "r_squared": None, "source": "error", "period": None}


def get_risk_free_rate(ticker: str) -> tuple[float, str]:
    """Return (rate, source) based on ticker region."""
    # European tickers (.PA, .DE, .AS, .BR, .MI, .MC, .LS)
    eu_suffixes = ('.PA', '.DE', '.AS', '.BR', '.MI', '.MC', '.LS', '.SW', '.CO', '.HE', '.ST', '.OL')
    if any(ticker.upper().endswith(s) for s in eu_suffixes):
        return (0.035, "OAT 10 ans (proxy)")  # ~3.5% for eurozone
    # US / default
    return (0.045, "US Treasury 10Y (proxy)")


def calculate_cost_of_debt(interest_expense: float, total_debt: float, fallback: float = 0.05) -> tuple[float, str]:
    """Calculate Kd from financials. Returns (rate, source)."""
    if total_debt > 0 and interest_expense > 0:
        kd = interest_expense / total_debt
        kd = max(0.01, min(kd, 0.20))  # Clamp to 1-20%
        return (round(kd, 4), "interest_expense/total_debt")
    return (fallback, "estimate (5%)")


def calculate_capm_wacc(
    beta: float | None,
    market_cap: float,
    total_debt: float,
    total_cash: float,
    risk_free_rate: float = 0.045,
    market_risk_premium: float = 0.055,
    tax_rate: float = 0.25,
    cost_of_debt: float = 0.05,
    ticker: str | None = None,
    interest_expense: float = 0,
    beta_info: dict | None = None,
) -> dict:
    # Use dynamic beta if available
    if beta_info and beta_info.get("beta"):
        beta_used = beta_info["beta"]
    else:
        beta_used = beta if beta and beta > 0 else 1.0

    # Region-specific risk-free rate
    risk_free_source = "parameter"
    if ticker:
        risk_free_rate, risk_free_source = get_risk_free_rate(ticker)

    # Real cost of debt
    kd_source = "parameter"
    if interest_expense > 0 and total_debt > 0:
        cost_of_debt, kd_source = calculate_cost_of_debt(interest_expense, total_debt, fallback=cost_of_debt)

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
        "risk_free_source": risk_free_source,
        "kd_source": kd_source,
        "market_risk_premium": market_risk_premium,
        "beta_info": beta_info,
    }
