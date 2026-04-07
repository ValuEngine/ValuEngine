"""
ValuEngine — Backtest Simulator
"What if I had bought X shares of TICKER on DATE?"
Uses yfinance for historical price data.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

import yfinance as yf

logger = logging.getLogger("valuengine")


def run_backtest(
    ticker: str,
    buy_date: str,
    amount: float,
    sell_date: Optional[str] = None,
) -> dict:
    """
    Simulate buying $amount of a ticker on buy_date.

    Returns: buy_price, sell_price, shares, pnl, pnl_pct, time_held, chart_data
    """
    ticker = ticker.upper().strip()

    try:
        buy_dt = datetime.strptime(buy_date, "%Y-%m-%d")
    except ValueError:
        return {"error": "Format de date invalide (YYYY-MM-DD)"}

    if buy_dt > datetime.now():
        return {"error": "La date d'achat ne peut pas etre dans le futur"}

    if buy_dt < datetime(2000, 1, 1):
        return {"error": "Date trop ancienne (minimum 2000-01-01)"}

    # Sell date defaults to today
    if sell_date:
        try:
            sell_dt = datetime.strptime(sell_date, "%Y-%m-%d")
        except ValueError:
            return {"error": "Format de date de vente invalide"}
    else:
        sell_dt = datetime.now()

    if sell_dt <= buy_dt:
        return {"error": "La date de vente doit etre apres la date d'achat"}

    # Fetch historical data
    try:
        start = (buy_dt - timedelta(days=5)).strftime("%Y-%m-%d")
        end = (sell_dt + timedelta(days=5)).strftime("%Y-%m-%d")
        hist = yf.Ticker(ticker).history(start=start, end=end)

        if hist.empty:
            return {"error": f"Aucune donnee historique trouvee pour {ticker}"}

        # Find closest trading day for buy
        buy_prices = hist[hist.index >= buy_dt.strftime("%Y-%m-%d")]
        if buy_prices.empty:
            buy_prices = hist.tail(1)
        buy_row = buy_prices.iloc[0]
        buy_price = float(buy_row["Close"])
        actual_buy_date = buy_prices.index[0].strftime("%Y-%m-%d")

        # Find closest trading day for sell
        sell_prices = hist[hist.index <= sell_dt.strftime("%Y-%m-%d")]
        if sell_prices.empty:
            sell_prices = hist.head(1)
        sell_row = sell_prices.iloc[-1]
        sell_price = float(sell_row["Close"])
        actual_sell_date = sell_prices.index[-1].strftime("%Y-%m-%d")

    except Exception as e:
        logger.error(f"[Backtest] yfinance error for {ticker}: {e}")
        return {"error": f"Erreur lors de la recuperation des donnees pour {ticker}"}

    # Calculate results
    shares = amount / buy_price
    final_value = shares * sell_price
    pnl = final_value - amount
    pnl_pct = (pnl / amount) * 100 if amount > 0 else 0

    # Time held
    days_held = (sell_dt - buy_dt).days
    years_held = days_held / 365.25

    # Annualized return
    annualized = 0
    if years_held > 0:
        annualized = ((final_value / amount) ** (1 / years_held) - 1) * 100

    # Dividends received during holding period
    total_dividends = 0.0
    dividend_events = []
    try:
        chart_hist_div = hist[(hist.index >= actual_buy_date) & (hist.index <= actual_sell_date)]
        if "Dividends" in chart_hist_div.columns:
            for idx, row in chart_hist_div.iterrows():
                div = float(row.get("Dividends", 0))
                if div > 0:
                    total_dividends += div * shares
                    dividend_events.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "per_share": round(div, 4),
                        "total": round(div * shares, 2),
                    })
    except Exception:
        pass

    # Chart data (weekly points for performance)
    chart_data = []
    try:
        chart_hist = hist[(hist.index >= actual_buy_date) & (hist.index <= actual_sell_date)]
        # Sample at most 100 points
        step = max(1, len(chart_hist) // 100)
        for i in range(0, len(chart_hist), step):
            row = chart_hist.iloc[i]
            price = float(row["Close"])
            value_at_point = shares * price
            chart_data.append({
                "date": chart_hist.index[i].strftime("%Y-%m-%d"),
                "price": round(price, 2),
                "value": round(value_at_point, 2),
                "pnl_pct": round(((price - buy_price) / buy_price) * 100, 1),
            })
        # Ensure last point is included
        if chart_data and chart_data[-1]["date"] != actual_sell_date:
            chart_data.append({
                "date": actual_sell_date,
                "price": round(sell_price, 2),
                "value": round(final_value, 2),
                "pnl_pct": round(pnl_pct, 1),
            })
    except Exception:
        pass

    # Max drawdown & volatility from chart data
    max_drawdown = 0.0
    volatility_annual = None
    sharpe_ratio = None
    try:
        chart_hist = hist[(hist.index >= actual_buy_date) & (hist.index <= actual_sell_date)]
        if len(chart_hist) > 5:
            closes = chart_hist["Close"].values
            # Max drawdown (peak-to-trough)
            peak = closes[0]
            for price_val in closes:
                if price_val > peak:
                    peak = price_val
                dd = (price_val - peak) / peak * 100
                if dd < max_drawdown:
                    max_drawdown = dd
            # Annualized volatility (daily returns * sqrt(252))
            import numpy as np
            daily_returns = np.diff(closes) / closes[:-1]
            if len(daily_returns) > 1:
                volatility_annual = round(float(np.std(daily_returns) * np.sqrt(252) * 100), 1)
                # Sharpe ratio (assuming risk-free rate of 4%)
                mean_annual_return = float(np.mean(daily_returns) * 252)
                risk_free_rate = 0.04
                vol_annual = float(np.std(daily_returns) * np.sqrt(252))
                if vol_annual > 0:
                    sharpe_ratio = round((mean_annual_return - risk_free_rate) / vol_annual, 2)
                else:
                    sharpe_ratio = None
    except Exception:
        pass

    # Comparison with S&P 500
    sp500_pnl_pct = None
    try:
        sp_hist = yf.Ticker("^GSPC").history(start=start, end=end)
        if not sp_hist.empty:
            sp_buy = sp_hist[sp_hist.index >= buy_dt.strftime("%Y-%m-%d")]
            sp_sell = sp_hist[sp_hist.index <= sell_dt.strftime("%Y-%m-%d")]
            if not sp_buy.empty and not sp_sell.empty:
                sp_buy_price = float(sp_buy.iloc[0]["Close"])
                sp_sell_price = float(sp_sell.iloc[-1]["Close"])
                sp500_pnl_pct = round(((sp_sell_price - sp_buy_price) / sp_buy_price) * 100, 1)
    except Exception:
        pass

    return {
        "ticker": ticker,
        "buy_date": actual_buy_date,
        "sell_date": actual_sell_date,
        "buy_price": round(buy_price, 2),
        "sell_price": round(sell_price, 2),
        "amount_invested": round(amount, 2),
        "shares": round(shares, 4),
        "final_value": round(final_value, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 1),
        "days_held": days_held,
        "annualized_return": round(annualized, 1),
        "sp500_pnl_pct": sp500_pnl_pct,
        "max_drawdown": round(max_drawdown, 1),
        "volatility_annual": volatility_annual,
        "sharpe_ratio": sharpe_ratio,
        "total_dividends": round(total_dividends, 2),
        "dividend_events": dividend_events,
        "total_return_with_dividends": round(pnl + total_dividends, 2),
        "total_return_pct_with_dividends": round(((final_value + total_dividends - amount) / amount) * 100, 1) if amount > 0 else 0,
        "chart_data": chart_data,
    }
