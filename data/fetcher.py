import yfinance as yf

SECTOR_PEERS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "META", "NVDA"],
    "Consumer Cyclical": ["AMZN", "TSLA", "NKE", "MCD", "SBUX"],
    "Financial Services": ["JPM", "BAC", "GS", "MS", "BLK"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "MRK"],
    "Energy": ["XOM", "CVX", "TTE", "BP", "SHEL"],
    "Industrials": ["BA", "CAT", "GE", "HON", "MMM"],
    "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "T"],
    "Consumer Defensive": ["PG", "KO", "PEP", "WMT", "COST"],
    "Basic Materials": ["LIN", "APD", "ECL", "DD", "NEM"],
    "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "PSA"],
    "Utilities": ["NEE", "DUK", "SO", "D", "AEP"],
}

def get_company_data(ticker: str) -> dict:
    stock = yf.Ticker(ticker)
    info = stock.info
    financials = stock.financials
    cashflow = stock.cashflow
    balance = stock.balance_sheet

    return {
        "name": info.get("longName", ticker),
        "sector": info.get("sector", "N/A"),
        "market_cap": info.get("marketCap", 0),
        "current_price": info.get("currentPrice", 0),
        "revenue": financials.loc["Total Revenue"].iloc[0] if "Total Revenue" in financials.index else 0,
        "ebit": financials.loc["EBIT"].iloc[0] if "EBIT" in financials.index else 0,
        "net_income": financials.loc["Net Income"].iloc[0] if "Net Income" in financials.index else 0,
        "free_cashflow": cashflow.loc["Free Cash Flow"].iloc[0] if "Free Cash Flow" in cashflow.index else 0,
        "total_debt": balance.loc["Total Debt"].iloc[0] if "Total Debt" in balance.index else 0,
        "cash": balance.loc["Cash And Cash Equivalents"].iloc[0] if "Cash And Cash Equivalents" in balance.index else 0,
        "shares_outstanding": info.get("sharesOutstanding", 0),
        "beta": info.get("beta", 1.0),
        "pe_ratio": info.get("trailingPE", 0),
        "ev_ebitda": info.get("enterpriseToEbitda", 0),
        "price_to_book": info.get("priceToBook", 0),
        "revenue_growth": info.get("revenueGrowth", 0),
        "profit_margins": info.get("profitMargins", 0),
    }

def get_peers_data(sector: str, exclude_ticker: str) -> list:
    peers = SECTOR_PEERS.get(sector, [])
    peers = [p for p in peers if p != exclude_ticker][:4]
    results = []
    for peer in peers:
        try:
            info = yf.Ticker(peer).info
            results.append({
                "Ticker": peer,
                "Nom": info.get("shortName", peer),
                "Prix": f"${info.get('currentPrice', 0):.2f}",
                "Market Cap": f"${info.get('marketCap', 0)/1e9:.1f}B",
                "P/E": f"{info.get('trailingPE', 0):.1f}x" if info.get('trailingPE') else "N/A",
                "EV/EBITDA": f"{info.get('enterpriseToEbitda', 0):.1f}x" if info.get('enterpriseToEbitda') else "N/A",
                "Marge nette": f"{info.get('profitMargins', 0)*100:.1f}%" if info.get('profitMargins') else "N/A",
                "Croissance CA": f"{info.get('revenueGrowth', 0)*100:.1f}%" if info.get('revenueGrowth') else "N/A",
            })
        except:
            continue
    return results