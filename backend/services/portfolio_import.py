"""
ValuEngine — Portfolio CSV Import Service
Supports Boursorama, Degiro, Trade Republic, Interactive Brokers.
Auto-detects broker format from CSV headers.
"""

import csv
import io
import re
import logging
from typing import Optional

import httpx

logger = logging.getLogger("valuengine")

BROKER_FORMATS = {
    "boursorama": {
        "delimiter": ";",
        "encoding": "latin-1",
        "ticker_col": ["Code ISIN", "ISIN", "Code"],
        "name_col": ["Libellé", "Nom", "Libelle"],
        "shares_col": ["Quantité", "Qté", "Quantite", "Qte"],
        "avg_price_col": ["PRU", "Prix de revient", "Cours moyen"],
    },
    "degiro": {
        "delimiter": ",",
        "encoding": "utf-8",
        "ticker_col": ["Symbol", "Symbole", "Ticker"],
        "name_col": ["Product", "Produit"],
        "shares_col": ["Quantity", "Quantité", "Nombre", "Quantite"],
        "avg_price_col": ["Average Price", "Prix moyen", "Break-even price"],
    },
    "trade_republic": {
        "delimiter": ",",
        "encoding": "utf-8",
        "ticker_col": ["ISIN", "Instrument"],
        "name_col": ["Name", "Nom"],
        "shares_col": ["Shares", "Quantité", "Quantite"],
        "avg_price_col": ["Average cost", "PRU"],
    },
    "interactive_brokers": {
        "delimiter": ",",
        "encoding": "utf-8",
        "ticker_col": ["Symbol"],
        "name_col": ["Description", "Financial Instrument Description"],
        "shares_col": ["Position", "Quantity"],
        "avg_price_col": ["Avg Cost", "Cost Basis Per Share"],
    },
    "generic": {
        "delimiter": ",",
        "encoding": "utf-8",
        "ticker_col": ["Ticker", "Symbol", "ticker", "symbol", "ISIN", "Code"],
        "name_col": ["Name", "Nom", "name", "Company", "Description"],
        "shares_col": ["Shares", "Quantity", "Quantité", "shares", "quantity", "Qté", "Quantite", "Qte"],
        "avg_price_col": ["Avg Price", "Average Price", "PRU", "avg_price", "Price", "Cost"],
    },
}


def _find_col(headers: list, candidates: list) -> Optional[int]:
    """Find the first matching column index from candidates."""
    headers_lower = [h.strip().lower() for h in headers]
    for candidate in candidates:
        candidate_lower = candidate.lower()
        for i, h in enumerate(headers_lower):
            if h == candidate_lower:
                return i
    return None


def _parse_number(val: str) -> Optional[float]:
    """Parse a number string, handling commas and spaces."""
    if not val:
        return None
    val = val.strip().replace(" ", "").replace("\xa0", "")
    # Handle European format: 1.234,56 → 1234.56
    if "," in val and "." in val:
        if val.rindex(",") > val.rindex("."):
            val = val.replace(".", "").replace(",", ".")
        else:
            val = val.replace(",", "")
    elif "," in val:
        val = val.replace(",", ".")
    # Remove currency symbols
    val = re.sub(r"[€$£]", "", val).strip()
    try:
        return float(val)
    except ValueError:
        return None


def _is_isin(value: str) -> bool:
    """Check if value looks like an ISIN code."""
    return bool(re.match(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$", value.strip()))


def isin_to_ticker(isin: str) -> Optional[str]:
    """Convert ISIN to ticker symbol via FMP search."""
    import os
    fmp_key = os.environ.get("FMP_API_KEY", "")
    if not fmp_key:
        return None
    try:
        url = f"https://financialmodelingprep.com/stable/search?query={isin}&apikey={fmp_key}"
        resp = httpx.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        if data and isinstance(data, list) and len(data) > 0:
            return data[0].get("symbol", None)
    except Exception as e:
        logger.warning(f"[PortfolioImport] ISIN→ticker failed for {isin}: {e}")
    return None


def detect_broker_format(content: str) -> str:
    """Auto-detect broker format from CSV headers."""
    # Try semicolon first (Boursorama)
    for delimiter in [";", ",", "\t"]:
        reader = csv.reader(io.StringIO(content), delimiter=delimiter)
        try:
            headers = next(reader)
        except StopIteration:
            continue

        if len(headers) < 2:
            continue

        headers_lower = set(h.strip().lower() for h in headers)

        # Check each broker format
        for broker_name, fmt in BROKER_FORMATS.items():
            if broker_name == "generic":
                continue
            ticker_cols_lower = set(c.lower() for c in fmt["ticker_col"])
            if ticker_cols_lower & headers_lower:
                return broker_name

    return "generic"


def parse_portfolio_csv(content: str, broker: str = "auto") -> dict:
    """
    Parse CSV content and return detected positions.
    Returns: { broker_detected, positions, errors, summary }
    """
    if broker == "auto":
        broker = detect_broker_format(content)

    fmt = BROKER_FORMATS.get(broker, BROKER_FORMATS["generic"])
    delimiter = fmt["delimiter"]

    # Try different delimiters if the detected one doesn't work
    for delim in [delimiter, ",", ";", "\t"]:
        reader = csv.reader(io.StringIO(content), delimiter=delim)
        try:
            headers = next(reader)
            if len(headers) >= 2:
                delimiter = delim
                break
        except StopIteration:
            continue
    else:
        return {
            "broker_detected": broker,
            "positions": [],
            "errors": [{"row": 0, "reason": "Fichier CSV vide ou invalide", "raw_data": ""}],
            "summary": {"total_positions": 0, "positions_imported": 0, "positions_failed": 0, "total_invested": 0},
        }

    # Re-read with correct delimiter
    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    headers = next(reader)

    # Find column indices — try broker-specific first, then generic fallback
    ticker_idx = _find_col(headers, fmt["ticker_col"])
    name_idx = _find_col(headers, fmt["name_col"])
    shares_idx = _find_col(headers, fmt["shares_col"])
    price_idx = _find_col(headers, fmt["avg_price_col"])

    # Fallback to generic if broker-specific columns not found
    if ticker_idx is None:
        ticker_idx = _find_col(headers, BROKER_FORMATS["generic"]["ticker_col"])
    if shares_idx is None:
        shares_idx = _find_col(headers, BROKER_FORMATS["generic"]["shares_col"])
    if price_idx is None:
        price_idx = _find_col(headers, BROKER_FORMATS["generic"]["avg_price_col"])

    if ticker_idx is None:
        return {
            "broker_detected": broker,
            "positions": [],
            "errors": [{"row": 0, "reason": "Colonne ticker/ISIN non trouvée dans le CSV", "raw_data": str(headers)}],
            "summary": {"total_positions": 0, "positions_imported": 0, "positions_failed": 0, "total_invested": 0},
        }

    positions = []
    errors = []
    total_invested = 0.0

    for row_num, row in enumerate(reader, start=2):
        if not row or all(not cell.strip() for cell in row):
            continue

        raw_data = delimiter.join(row)

        # Extract ticker
        raw_ticker = row[ticker_idx].strip() if ticker_idx < len(row) else ""
        if not raw_ticker:
            errors.append({"row": row_num, "reason": "Ticker vide", "raw_data": raw_data})
            continue

        # Convert ISIN to ticker if needed
        ticker = raw_ticker
        isin = None
        if _is_isin(raw_ticker):
            isin = raw_ticker
            converted = isin_to_ticker(raw_ticker)
            if converted:
                ticker = converted
            else:
                errors.append({"row": row_num, "reason": f"ISIN non reconnu: {raw_ticker}", "raw_data": raw_data})
                continue

        # Extract name
        name = row[name_idx].strip() if name_idx is not None and name_idx < len(row) else ticker

        # Extract shares
        shares = None
        if shares_idx is not None and shares_idx < len(row):
            shares = _parse_number(row[shares_idx])
        if shares is None or shares <= 0:
            errors.append({"row": row_num, "reason": f"Quantite invalide pour {ticker}", "raw_data": raw_data})
            continue

        # Extract average price
        avg_price = None
        if price_idx is not None and price_idx < len(row):
            avg_price = _parse_number(row[price_idx])
        if avg_price is None or avg_price <= 0:
            avg_price = 0  # Allow 0 price — user can edit later

        position = {
            "ticker": ticker.upper(),
            "name": name,
            "shares": round(shares, 4),
            "avg_price": round(avg_price, 2),
        }
        if isin:
            position["isin"] = isin

        total_invested += shares * avg_price
        positions.append(position)

    return {
        "broker_detected": broker,
        "positions": positions,
        "errors": errors,
        "summary": {
            "total_positions": len(positions) + len(errors),
            "positions_imported": len(positions),
            "positions_failed": len(errors),
            "total_invested": round(total_invested, 2),
        },
    }
