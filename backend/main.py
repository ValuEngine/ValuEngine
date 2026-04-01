"""
ValuEngine API — Backend FastAPI
Endpoints pour l'analyse financière complète d'une action.
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import stripe
import yfinance as yf
from models import AnalyzeRequest, AnalyzeResponse, CompanyData, DCFResult, SensitivityMatrix, BullBearAnalysis
from services.market_data import get_company_data, get_peers_data
from services.dcf import calculate_dcf, sensitivity_analysis
from services.ai_analyst import get_bull_bear_analysis

load_dotenv(Path(__file__).parent / ".env", override=True)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

app = FastAPI(
    title="ValuEngine API",
    description="Analyse financière et valorisation DCF augmentée par IA",
    version="2.0.0",
)

# CORS — autorise le frontend Next.js (localhost:3000 en dev, domaine prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://valuengine.io",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ValuEngine API v2"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """
    Endpoint principal : analyse complète d'une action.
    - Données de marché (yfinance)
    - Calcul DCF + matrice de sensibilité
    - Analyse Bull/Bear par IA (Claude)
    - Verdict BUY / HOLD / SELL
    """
    ticker = req.ticker.upper().strip()

    # ── 1. Données de marché ────────────────────────────────────────────
    try:
        raw = get_company_data(ticker)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des données : {e}")

    company = CompanyData(**raw)

    # ── 2. DCF ──────────────────────────────────────────────────────────
    fcf    = raw["free_cash_flow"]
    shares = raw["shares_outstanding"]
    nd     = raw["net_debt"]
    price  = raw["price"]

    dcf_raw = calculate_dcf(
        fcf=fcf,
        growth_rate=req.growth_rate,
        wacc=req.wacc,
        terminal_growth=req.terminal_growth,
        horizon=req.horizon,
        shares_outstanding=shares,
        net_debt=nd,
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
        fcf=fcf,
        base_growth=req.growth_rate,
        base_wacc=req.wacc,
        terminal_growth=req.terminal_growth,
        horizon=req.horizon,
        shares_outstanding=shares,
        net_debt=nd,
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

    return AnalyzeResponse(
        company=company,
        dcf=dcf,
        sensitivity=sensitivity,
        analysis=analysis,
        verdict=verdict,
        verdict_label=verdict_label,
    )


@app.get("/api/peers/{ticker}")
def peers(ticker: str, sector: str = "Technology"):
    """
    Retourne les entreprises comparables du même secteur (Trading Comps).
    """
    try:
        result = get_peers_data(ticker.upper(), sector)
        return {"peers": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y"}

@app.get("/api/history/{ticker}")
def history(ticker: str, period: str = "1y"):
    """
    Retourne l'historique des prix de clôture d'une action.
    Periods : 1mo, 3mo, 6mo, 1y, 2y, 5y
    """
    if period not in VALID_PERIODS:
        period = "1y"
    try:
        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period)
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"Aucune donnée historique pour '{ticker}'")
        result = [
            {
                "date":   str(idx.date()),
                "close":  round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            }
            for idx, row in hist.iterrows()
        ]
        return {"ticker": ticker.upper(), "period": period, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search/{ticker}")
def search(ticker: str):
    """
    Vérifie qu'un ticker existe et retourne son nom + secteur.
    Utile pour l'autocomplete de la searchbar.
    """
    try:
        raw = get_company_data(ticker.upper())
        return {
            "ticker": raw["ticker"],
            "name":   raw["name"],
            "sector": raw["sector"],
            "price":  raw["price"],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stripe/create-checkout")
async def create_checkout(request: Request):
    body = await request.json()
    user_id = body.get("userId", "")
    user_email = body.get("userEmail", "")

    if not stripe.api_key or stripe.api_key == "sk_test_REMPLACE":
        raise HTTPException(status_code=503, detail="Stripe non configuré")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": os.environ.get("STRIPE_PRICE_ID", ""),
                "quantity": 1,
            }],
            mode="subscription",
            success_url=os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/?canceled=true",
            customer_email=user_email,
            metadata={"userId": user_id},
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook invalide")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("userId", "")
        print(f"[Stripe] Paiement confirmé pour userId={user_id}")

    return {"status": "ok"}
