"""
Analyze endpoints — main analysis, deep analysis, anomalies, DCF scenarios,
PDF export, compare, screener, portfolio AI.
"""

import os
import uuid
import time
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

import jwt
import json as _json
from anthropic import Anthropic as _Anthropic

from deps import (
    limiter, verify_clerk_token, _get_jwks_client, _safe_id_internal,
    _sb_get, _sb_post, _is_user_pro, _get_today_analysis_count,
    TTLCache, FREE_DAILY_LIMIT,
)
from models import (
    AnalyzeRequest, AnalyzeResponse, CompanyData, DCFResult, SensitivityMatrix,
    BullBearAnalysis, ExportPDFRequest, ScreenerSearchRequest, PortfolioAIRequest,
    TickerRequest,
)
from services.dcf import calculate_dcf, sensitivity_analysis
from services.ai_analyst import (
    get_bull_bear_analysis, get_deep_analysis, detect_anomalies,
    get_dcf_scenarios, ai_screen_stocks, _parse_json_response,
    get_comparison_analysis, build_deep_analysis_prompt,
)
from services.market_data import get_company_data as _get_data
from services.fmp_data import get_deep_financials, get_sector_benchmarks, get_screener_universe
from services.pdf_generator import generate_analysis_pdf

logger = logging.getLogger("valuengine")

router = APIRouter()

# ── Analysis cache ────────────────────────────────────────────────────────
_analysis_cache = TTLCache(max_size=300, default_ttl=1800)
_CACHE_TTL_30M = 30 * 60
_CACHE_TTL_1H = 60 * 60


def _cache_get(key: str, ttl: int) -> Optional[dict]:
    return _analysis_cache.get(key, ttl)


def _cache_set(key: str, data: dict):
    _analysis_cache.set(key, data)


# ── Compare cache ─────────────────────────────────────────────────────────
_compare_cache: dict = {}
_COMPARE_CACHE_TTL = 1800


@router.post("/api/analyze", response_model=AnalyzeResponse)
@limiter.limit("10/minute")
def analyze(request: Request, req: AnalyzeRequest):
    """Endpoint principal : analyse complète d'une action."""
    ticker = req.ticker.upper().strip()

    # ── 0. Freemium enforcement ─────────────────────────────────────────
    user_id = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            client = _get_jwks_client()
            if client:
                token = auth_header[7:]
                signing_key = client.get_signing_key_from_jwt(token)
                decoded = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
                user_id = decoded.get("sub")
        except Exception:
            pass
    elif os.environ.get("ENVIRONMENT", "production") == "development":
        user_id = request.headers.get("X-User-Id") or req.user_id

    if user_id:
        if not _is_user_pro(user_id):
            used = _get_today_analysis_count(user_id)
            if used >= FREE_DAILY_LIMIT:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "daily_limit",
                        "message": "Limite de 3 analyses gratuites atteinte. Passe Pro pour des analyses illimitées.",
                        "limit": FREE_DAILY_LIMIT,
                        "used": used,
                    },
                )

    # ── 1. Données de marché ────────────────────────────────────────────
    try:
        raw = _get_data(ticker)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' introuvable")
    except Exception as e:
        logger.error(f"Data fetch error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des données")

    company = CompanyData(**raw)

    # ── 2. DCF ──────────────────────────────────────────────────────────
    fcf    = raw["free_cash_flow"]
    shares = raw["shares_outstanding"]
    nd     = raw["net_debt"]
    price  = raw["price"]

    if not price or price <= 0:
        raise HTTPException(status_code=422, detail="Prix de l'action non disponible ou invalide pour ce ticker")

    dcf_raw = calculate_dcf(
        fcf=fcf, growth_rate=req.growth_rate, wacc=req.wacc,
        terminal_growth=req.terminal_growth, horizon=req.horizon,
        shares_outstanding=shares, net_debt=nd,
    )

    intrinsic = dcf_raw["intrinsic_value"]
    upside    = ((intrinsic - price) / price) if price else 0

    dcf = DCFResult(
        intrinsic_value=round(intrinsic, 2),
        enterprise_value_dcf=round(dcf_raw["enterprise_value_dcf"], 0),
        equity_value=round(dcf_raw["equity_value"], 0),
        terminal_value_pv=round(dcf_raw["terminal_value_pv"], 0),
        fcf_projections=[round(v, 0) for v in dcf_raw["fcf_projections"]],
        upside_pct=round(upside * 100, 2),
    )

    # ── 3. Matrice de sensibilité ────────────────────────────────────────
    sens_raw = sensitivity_analysis(
        fcf=fcf, base_growth=req.growth_rate, base_wacc=req.wacc,
        terminal_growth=req.terminal_growth, horizon=req.horizon,
        shares_outstanding=shares, net_debt=nd,
    )
    sensitivity = SensitivityMatrix(**sens_raw)

    # ── 4. Analyse IA ────────────────────────────────────────────────────
    bb_raw = get_bull_bear_analysis(raw, dcf_raw)
    analysis = BullBearAnalysis(**bb_raw)

    # ── 5. Verdict ───────────────────────────────────────────────────────
    if upside > 0.15:
        verdict, verdict_label = "BUY", "Sous-évalué"
    elif upside < -0.15:
        verdict, verdict_label = "SELL", "Surévalué"
    else:
        verdict, verdict_label = "HOLD", "Juste valeur"

    # ── 6. First analysis detection (for Pro trial) ────────────────────
    is_first_analysis = False
    if user_id:
        try:
            prev = _sb_get("analyses", f"user_id=eq.{user_id}&select=id&limit=1")
            is_first_analysis = len(prev) == 0
        except Exception:
            pass

    # ── 7. Share ID for public sharing ──────────────────────────────────
    share_id = uuid.uuid4().hex
    analysis_record = {
        "ticker": ticker,
        "company_name": company.name,
        "verdict": verdict,
        "price": price,
        "intrinsic_value": dcf.intrinsic_value,
        "upside_pct": dcf.upside_pct,
        "share_id": share_id,
    }
    if user_id:
        analysis_record["user_id"] = user_id
    try:
        _sb_post("analyses", analysis_record)
    except Exception as e:
        logger.error(f"[Analyze] Erreur sauvegarde analyse: {e}")

    return AnalyzeResponse(
        company=company, dcf=dcf, sensitivity=sensitivity,
        analysis=analysis, verdict=verdict, verdict_label=verdict_label,
        share_id=share_id, is_first_analysis=is_first_analysis,
    )


@router.get("/api/ai/swot/{ticker}")
@limiter.limit("5/minute")
async def swot_endpoint(request: Request, ticker: str):
    await verify_clerk_token(request)
    try:
        from services.ai_analyst import get_swot_analysis
        raw = _get_data(ticker.upper())
        result = get_swot_analysis(raw)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.get("/api/ai/pestle/{ticker}")
@limiter.limit("5/minute")
async def pestle_endpoint(request: Request, ticker: str):
    await verify_clerk_token(request)
    try:
        from services.ai_analyst import get_pestle_analysis
        raw = _get_data(ticker.upper())
        result = get_pestle_analysis(raw)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/api/analyze/deep-analysis")
@limiter.limit("5/minute")
async def deep_analysis_endpoint(request: Request):
    """Analyse approfondie IA avec données financières 5 ans."""
    await verify_clerk_token(request)
    try:
        body = await request.json()
        req = TickerRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="ticker requis (max 10 caracteres)")
    ticker = req.ticker.upper().strip()

    cache_key = f"deep_{ticker}"
    cached = _cache_get(cache_key, _CACHE_TTL_30M)
    if cached:
        return cached

    try:
        company_info = _get_data(ticker)
        deep_fin = get_deep_financials(ticker)
        result = get_deep_analysis(ticker, company_info, company_info, deep_fin)
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"[DeepAnalysis] Error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/api/analyze/anomalies")
@limiter.limit("10/minute")
async def anomalies_endpoint(request: Request):
    """Détection d'anomalies financières vs benchmarks sectoriels."""
    await verify_clerk_token(request)
    try:
        body = await request.json()
        req = TickerRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="ticker requis (max 10 caracteres)")
    ticker = req.ticker.upper().strip()

    cache_key = f"anomalies_{ticker}"
    cached = _cache_get(cache_key, _CACHE_TTL_1H)
    if cached:
        return cached

    try:
        company_data = _get_data(ticker)
        deep_fin = get_deep_financials(ticker)
        sector = company_data.get("sector", "Technology")
        benchmarks = get_sector_benchmarks(ticker, sector)
        anomalies = detect_anomalies(ticker, company_data, deep_fin, benchmarks)
        result = {"anomalies": anomalies, "sector": sector, "peer_count": benchmarks.get("peer_count", 0)}
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"[Anomalies] Error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/api/analyze/dcf-scenarios")
@limiter.limit("5/minute")
async def dcf_scenarios_endpoint(request: Request):
    """3 scénarios DCF (bull/base/bear) avec narratif IA."""
    await verify_clerk_token(request)
    try:
        body = await request.json()
        req = TickerRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="ticker requis (max 10 caracteres)")
    ticker = req.ticker.upper().strip()

    cache_key = f"dcf_scenarios_{ticker}"
    cached = _cache_get(cache_key, _CACHE_TTL_30M)
    if cached:
        return cached

    try:
        company_info = _get_data(ticker)
        deep_fin = get_deep_financials(ticker)
        result = get_dcf_scenarios(ticker, company_info, company_info, deep_fin)
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"[DCFScenarios] Error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/api/analyze/export-pdf")
@limiter.limit("5/minute")
async def export_pdf(request: Request):
    """Generate a branded PDF analysis report. Pro only."""
    token_user_id = await verify_clerk_token(request)

    if not _is_user_pro(token_user_id):
        raise HTTPException(status_code=403, detail="Feature Pro uniquement")

    try:
        body = await request.json()
        pdf_request = ExportPDFRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="Donnees invalides pour le PDF")

    ticker = pdf_request.ticker.upper().strip()

    try:
        pdf_bytes = generate_analysis_pdf(body)
    except Exception as e:
        logger.error(f"[ExportPDF] Error generating PDF for {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la generation du PDF")

    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"ValuEngine_{ticker}_{date_str}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/compare")
@limiter.limit("5/minute")
async def compare_stocks(request: Request):
    """Compare deux actions avec analyse IA. Pro uniquement pour l'IA."""
    token_user_id = await verify_clerk_token(request)
    is_pro = _is_user_pro(token_user_id)

    try:
        body = await request.json()
        tickers = body.get("tickers", [])
        if not isinstance(tickers, list) or len(tickers) != 2:
            raise HTTPException(status_code=400, detail="Exactement 2 tickers requis")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Requête invalide")

    t1 = tickers[0].strip().upper()
    t2 = tickers[1].strip().upper()
    if not t1 or not t2 or t1 == t2:
        raise HTTPException(status_code=400, detail="Deux tickers différents requis")

    cache_key = f"{t1}_vs_{t2}"
    now = time.time()
    if cache_key in _compare_cache and (now - _compare_cache[cache_key]["ts"]) < _COMPARE_CACHE_TTL:
        cached = _compare_cache[cache_key]["data"]
        if not is_pro:
            cached = {**cached, "ai_comparison": None}
        return cached

    try:
        data1 = _get_data(t1)
        data2 = _get_data(t2)
    except Exception as e:
        logger.error(f"[Compare] Error fetching data: {e}")
        raise HTTPException(status_code=404, detail="Un des tickers est introuvable")

    growth, wacc, tg, horizon = 0.08, 0.09, 0.03, 5
    try:
        fcf1 = data1.get("free_cash_flow", 0) or 0
        shares1 = data1.get("shares_outstanding", 1) or 1
        nd1 = data1.get("net_debt", 0) or 0
        dcf1 = calculate_dcf(fcf1, growth, wacc, tg, horizon, shares1, nd1)

        fcf2 = data2.get("free_cash_flow", 0) or 0
        shares2 = data2.get("shares_outstanding", 1) or 1
        nd2 = data2.get("net_debt", 0) or 0
        dcf2 = calculate_dcf(fcf2, growth, wacc, tg, horizon, shares2, nd2)
    except Exception as e:
        logger.error(f"[Compare] DCF error: {e}")
        raise HTTPException(status_code=500, detail="Erreur de calcul DCF")

    def build_company(data: dict, dcf: dict) -> dict:
        iv = dcf.get("intrinsic_value", 0)
        upside = dcf.get("upside_pct", 0)
        verdict = "BUY" if upside > 15 else ("SELL" if upside < -15 else "HOLD")
        return {
            "ticker": data.get("ticker", ""),
            "name": data.get("name", ""),
            "price": data.get("price", 0),
            "market_cap": data.get("market_cap", 0),
            "pe_ratio": data.get("pe_ratio"),
            "ev_ebitda": data.get("ev_ebitda"),
            "profit_margin": data.get("profit_margin"),
            "revenue_growth": data.get("revenue_growth"),
            "free_cash_flow": data.get("free_cash_flow"),
            "intrinsic_value": iv,
            "upside_pct": upside,
            "verdict": verdict,
        }

    c1 = build_company(data1, dcf1)
    c2 = build_company(data2, dcf2)

    ai_text = None
    if is_pro:
        try:
            ai_text = get_comparison_analysis(c1, c2)
        except Exception as e:
            logger.error(f"[Compare] AI error: {e}")
            ai_text = None

    result = {"companies": [c1, c2], "ai_comparison": ai_text}
    _compare_cache[cache_key] = {"data": result, "ts": now}

    if not is_pro:
        result = {**result, "ai_comparison": None}

    return result


SCREENER_SUGGESTIONS = [
    "Societes tech americaines avec forte generation de cash et peu d'endettement",
    "Actions sous-evaluees dans le secteur de la sante",
    "Entreprises avec dividendes croissants et rendement superieur a 2%",
    "Small caps a fort potentiel dans la transition energetique",
    "Actions decotees avec ROIC superieur a la moyenne sectorielle",
]


@router.get("/api/screener/suggestions")
async def get_screener_suggestions():
    """Return screener search suggestions."""
    return {"suggestions": SCREENER_SUGGESTIONS}


@router.post("/api/screener/search")
@limiter.limit("3/minute")
async def screener_search(request: Request):
    """AI-powered stock screening. Pro only."""
    token_user_id = await verify_clerk_token(request)

    if not _is_user_pro(token_user_id):
        raise HTTPException(status_code=403, detail="Feature Pro uniquement")

    try:
        body = await request.json()
        screener_req = ScreenerSearchRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="Requete invalide (10-500 caracteres)")

    try:
        universe = get_screener_universe()
        results = ai_screen_stocks(screener_req.query, universe)
        return results
    except Exception as e:
        logger.error(f"[Screener] Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@router.post("/api/portfolio/ai-insight")
@limiter.limit("3/minute")
async def portfolio_ai_insight(request: Request):
    """AI-powered portfolio analysis. Pro only."""
    token_user_id = await verify_clerk_token(request)

    if not _is_user_pro(token_user_id):
        raise HTTPException(status_code=403, detail="Feature Pro uniquement")

    try:
        body = await request.json()
        ai_req = PortfolioAIRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="Donnees de portefeuille invalides (1-50 positions requises)")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("[PortfolioAI] ANTHROPIC_API_KEY not configured")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

    positions = [p.model_dump() for p in ai_req.positions]
    total_value = sum(p["current_value"] for p in positions)
    total_cost = sum(p["shares"] * p["avg_price"] for p in positions)
    total_pnl = total_value - total_cost
    total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else 0

    positions_text = _json.dumps(positions, ensure_ascii=False)

    prompt = f"""Tu es un conseiller en gestion de portefeuille pour investisseurs francais.

Analyse ce portefeuille et retourne un JSON avec :
{{
  "score_diversification": number (0-100),
  "analyse_globale": "3-4 phrases d'analyse du portefeuille",
  "concentration_risques": ["risque 1", "risque 2", "risque 3"],
  "opportunites": ["opportunite 1", "opportunite 2"],
  "recommandation": "1-2 phrases de recommandation concrete"
}}

Portefeuille a analyser :
{positions_text}

Valeur totale: ${total_value:.2f}
P&L total: ${total_pnl:.2f} ({total_pnl_pct:.1f}%)
Nombre de positions: {len(positions)}

Retourne UNIQUEMENT du JSON valide, sans texte autour. En francais."""

    try:
        client = _Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )

        result = _parse_json_response(msg.content[0].text)
        return result
    except Exception as e:
        logger.error(f"[PortfolioAI] Error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


# ═══════════════════════════════════════════════════════════════════════════════
# SSE STREAMING — Deep Analysis
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/api/analyze/deep-analysis/stream")
@limiter.limit("5/minute")
async def deep_analysis_stream(request: Request):
    """Streaming deep analysis via SSE — tokens sent as they arrive."""
    await verify_clerk_token(request)
    try:
        body = await request.json()
        req = TickerRequest(**body)
    except Exception:
        raise HTTPException(status_code=400, detail="ticker requis (max 10 caracteres)")
    ticker = req.ticker.upper().strip()

    # Check cache first — if cached, return full result as single SSE event
    cache_key = f"deep_{ticker}"
    cached = _cache_get(cache_key, _CACHE_TTL_30M)
    if cached:
        import json as _j
        async def cached_stream():
            yield f"data: {_j.dumps(cached)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    # Fetch data
    try:
        company_info = _get_data(ticker)
        deep_fin = get_deep_financials(ticker)
    except Exception as e:
        logger.error(f"[DeepAnalysis/Stream] Data error for {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des données")

    prompt = build_deep_analysis_prompt(ticker, company_info, deep_fin)

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Clé API Anthropic manquante")

    async def generate():
        import json as _j
        full_text = ""
        try:
            client = _Anthropic(api_key=api_key)
            with client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=3000,
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                for text in stream.text_stream:
                    full_text += text
                    yield f"data: {_j.dumps({'token': text})}\n\n"

            # Parse and cache the full result
            try:
                result = _parse_json_response(full_text)
                _cache_set(cache_key, result)
                yield f"data: {_j.dumps({'done': True, 'parsed': result})}\n\n"
            except Exception:
                yield f"data: {_j.dumps({'done': True, 'raw': full_text})}\n\n"

        except Exception as e:
            logger.error(f"[DeepAnalysis/Stream] Error: {e}")
            yield f"data: {_j.dumps({'error': 'Analyse temporairement indisponible.'})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
