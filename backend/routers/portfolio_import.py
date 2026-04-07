"""
Portfolio import endpoints — CSV upload preview + confirm.
"""

import logging
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional

from deps import verify_clerk_token, _safe_id, _sb_get, _sb_post, limiter
from services.portfolio_import import parse_portfolio_csv, detect_broker_format

logger = logging.getLogger("valuengine")

router = APIRouter()

MAX_CSV_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/api/portfolio/import")
@limiter.limit("10/minute")
async def import_portfolio_preview(request: Request, file: UploadFile = File(...), broker: Optional[str] = Form("auto")):
    """
    Upload CSV — returns preview of detected positions (does NOT create them).
    Accepts: .csv, .tsv, .txt — Max 5MB.
    """
    await verify_clerk_token(request)

    # Validate file extension
    filename = (file.filename or "").lower()
    if not any(filename.endswith(ext) for ext in (".csv", ".tsv", ".txt")):
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez .csv, .tsv ou .txt")

    # Read and validate size
    content_bytes = await file.read()
    if len(content_bytes) > MAX_CSV_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")

    # Try multiple encodings
    content = None
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            content = content_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        raise HTTPException(status_code=400, detail="Encodage du fichier non reconnu")

    result = parse_portfolio_csv(content, broker=broker or "auto")
    return result


@router.post("/api/portfolio/import/confirm")
@limiter.limit("5/minute")
async def import_portfolio_confirm(request: Request):
    """
    Confirm import — creates positions in Supabase.
    Body: { positions: [{ ticker, name, shares, avg_price, isin? }] }
    """
    user_id = await verify_clerk_token(request)

    try:
        body = await request.json()
        positions = body.get("positions", [])
    except Exception:
        raise HTTPException(status_code=400, detail="Corps de requête invalide")

    if not positions or not isinstance(positions, list):
        raise HTTPException(status_code=400, detail="Aucune position à importer")

    if len(positions) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 positions par import")

    # Get existing positions to merge
    try:
        existing = _sb_get("portfolio_positions", f"clerk_user_id=eq.{_safe_id(user_id)}&select=ticker")
        existing_tickers = {r["ticker"].upper() for r in existing} if existing else set()
    except Exception:
        existing_tickers = set()

    imported = []
    skipped = []
    errors = []

    for pos in positions:
        ticker = (pos.get("ticker") or "").strip().upper()
        shares = pos.get("shares")
        avg_price = pos.get("avg_price", 0)

        if not ticker or not shares:
            errors.append({"ticker": ticker, "reason": "Données manquantes"})
            continue

        try:
            shares = float(shares)
            avg_price = float(avg_price)
        except (ValueError, TypeError):
            errors.append({"ticker": ticker, "reason": "Valeurs numériques invalides"})
            continue

        if ticker in existing_tickers:
            skipped.append({"ticker": ticker, "reason": "Position déjà existante"})
            continue

        try:
            _sb_post("portfolio_positions", {
                "clerk_user_id": user_id,
                "ticker": ticker,
                "shares": round(shares, 4),
                "avg_price": round(avg_price, 2),
            })
            imported.append(ticker)
            existing_tickers.add(ticker)
        except Exception as e:
            logger.error(f"[PortfolioImport] Failed to insert {ticker}: {e}")
            errors.append({"ticker": ticker, "reason": "Erreur d'insertion"})

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "summary": {
            "total_imported": len(imported),
            "total_skipped": len(skipped),
            "total_errors": len(errors),
        },
    }
