"""
ValuEngine API — Backend FastAPI
Endpoints pour l'analyse financière complète d'une action.
"""

import os
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import httpx
import stripe
import yfinance as yf
from models import AnalyzeRequest, AnalyzeResponse, CompanyData, DCFResult, SensitivityMatrix, BullBearAnalysis
from services.dcf import calculate_dcf, sensitivity_analysis
from services.ai_analyst import get_bull_bear_analysis, get_swot_analysis, get_pestle_analysis

load_dotenv(Path(__file__).parent / ".env", override=True)

FMP_KEY = os.environ.get("FMP_API_KEY", "")
USE_FMP = bool(FMP_KEY and FMP_KEY != "REMPLACE_PAR_TA_CLÉ")
if USE_FMP:
    from services.fmp_data import get_company_data as _get_data, get_peers_data
    print("[DataSource] Financial Modeling Prep ✓")
else:
    from services.market_data import get_company_data as _get_data, get_peers_data
    print("[DataSource] yfinance (fallback)")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

# ── Supabase REST helpers (alerts) ───────────────────────────────────────────
_SUPA_URL  = os.environ.get("SUPABASE_URL", "").rstrip("/")
_SUPA_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def _sb_headers() -> dict:
    return {
        "apikey": _SUPA_KEY,
        "Authorization": f"Bearer {_SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def _sb_get(table: str, params: str = "") -> list:
    if not _SUPA_URL or not _SUPA_KEY:
        return []
    url = f"{_SUPA_URL}/rest/v1/{table}?{params}"
    resp = httpx.get(url, headers=_sb_headers(), timeout=6)
    resp.raise_for_status()
    return resp.json()

def _sb_post(table: str, body: dict) -> dict:
    url = f"{_SUPA_URL}/rest/v1/{table}"
    resp = httpx.post(url, headers=_sb_headers(), json=body, timeout=6)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if isinstance(data, list) else data

def _sb_patch(table: str, params: str, body: dict) -> None:
    url = f"{_SUPA_URL}/rest/v1/{table}?{params}"
    httpx.patch(url, headers=_sb_headers(), json=body, timeout=6)

app = FastAPI(
    title="ValuEngine API",
    description="Analyse financière et valorisation DCF augmentée par IA",
    version="2.0.0",
)

# CORS — autorise le frontend Next.js (localhost:3000 en dev, domaine prod)
_frontend_url = os.environ.get("FRONTEND_URL", "")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://valuengine.io",
        _frontend_url,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ValuEngine API v2"}


# ── Market overview cache ────────────────────────────────────────────────────
_MARKET_CACHE: dict = {"data": None, "ts": 0.0}
_MARKET_TTL = 300  # 5 minutes

_INDICES = [
    {"label": "S&P 500", "yf": "^GSPC"},
    {"label": "NASDAQ",  "yf": "^IXIC"},
    {"label": "CAC 40",  "yf": "^FCHI"},
    {"label": "DAX",     "yf": "^GDAXI"},
]

_MARKET_FALLBACK = [
    {"label": "S&P 500",  "value": "—", "change": "—", "up": True},
    {"label": "NASDAQ",   "value": "—", "change": "—", "up": True},
    {"label": "CAC 40",   "value": "—", "change": "—", "up": True},
    {"label": "DAX",      "value": "—", "change": "—", "up": True},
]


@app.get("/api/market-overview")
def market_overview():
    global _MARKET_CACHE
    now = time.time()

    if _MARKET_CACHE["data"] and (now - _MARKET_CACHE["ts"]) < _MARKET_TTL:
        return _MARKET_CACHE["data"]

    try:
        results = []
        for idx in _INDICES:
            fi = yf.Ticker(idx["yf"]).fast_info
            price = float(getattr(fi, "last_price", 0) or 0)
            prev  = float(getattr(fi, "previous_close", 0) or
                          getattr(fi, "regular_market_previous_close", 0) or 0)
            change_pct = ((price - prev) / prev * 100) if prev else 0.0
            sign = "+" if change_pct >= 0 else ""
            results.append({
                "label":  idx["label"],
                "value":  f"{price:,.2f}",
                "change": f"{sign}{change_pct:.2f}%",
                "up":     change_pct >= 0,
            })
        _MARKET_CACHE = {"data": results, "ts": now}
        return results
    except Exception as e:
        print(f"[market-overview] yfinance error: {e}")
        return _MARKET_FALLBACK


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
        raw = _get_data(ticker)
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
        raw = _get_data(ticker.upper())
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


@app.get("/api/quotes")
def batch_quotes(tickers: str):
    """Prix live pour plusieurs tickers (séparés par virgule). Ex: ?tickers=AAPL,MSFT,NVDA"""
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()][:30]
    if not symbols:
        return []
    if USE_FMP:
        try:
            joined = ",".join(symbols)
            url = f"https://financialmodelingprep.com/api/v3/quote/{joined}?apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=8)
            resp.raise_for_status()
            return [
                {
                    "ticker":     q.get("symbol", ""),
                    "name":       q.get("name", ""),
                    "price":      round(float(q.get("price") or 0), 2),
                    "change_pct": round(float(q.get("changesPercentage") or 0), 2),
                }
                for q in resp.json()
            ]
        except Exception:
            return []
    else:
        results = []
        for sym in symbols:
            try:
                fi = yf.Ticker(sym).fast_info
                price = float(getattr(fi, "last_price", 0) or 0)
                results.append({"ticker": sym, "name": sym, "price": round(price, 2), "change_pct": 0.0})
            except Exception:
                pass
        return results


@app.get("/api/quote/{ticker}")
def quote(ticker: str):
    """Prix en temps réel + variation journalière d'un ticker (léger, sans analyse)."""
    t = ticker.upper().strip()
    if USE_FMP:
        try:
            url = f"https://financialmodelingprep.com/api/v3/quote/{t}?apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                raise HTTPException(status_code=404, detail=f"'{t}' introuvable")
            q = data[0]
            return {
                "ticker":     q.get("symbol", t),
                "name":       q.get("name", t),
                "price":      round(float(q.get("price") or 0), 2),
                "change_pct": round(float(q.get("changesPercentage") or 0), 2),
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        try:
            fi = yf.Ticker(t).fast_info
            price = float(getattr(fi, "last_price", 0) or 0)
            prev  = float(getattr(fi, "previous_close", price) or price)
            change_pct = round(((price - prev) / prev * 100), 2) if prev else 0
            return {"ticker": t, "name": t, "price": round(price, 2), "change_pct": change_pct}
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/profile/{ticker}")
def profile(ticker: str):
    """Profil fondamental d'un ticker : nom, secteur, industrie, description, prix, market cap, PE, etc."""
    t = ticker.upper().strip()
    if USE_FMP:
        try:
            url = f"https://financialmodelingprep.com/api/v3/profile/{t}?apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                raise HTTPException(status_code=404, detail=f"'{t}' introuvable")
            p = data[0]
            desc = p.get("description") or ""
            return {
                "ticker":      p.get("symbol", t),
                "name":        p.get("companyName", t),
                "sector":      p.get("sector", ""),
                "industry":    p.get("industry", ""),
                "description": desc[:600],
                "price":       round(float(p.get("price") or 0), 2),
                "market_cap":  p.get("mktCap"),
                "pe_ratio":    p.get("pe"),
                "country":     p.get("country", ""),
                "exchange":    p.get("exchangeShortName", ""),
                "currency":    p.get("currency", ""),
                "image":       p.get("image", ""),
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        try:
            info = yf.Ticker(t).info
            if not info or info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
                raise HTTPException(status_code=404, detail=f"'{t}' introuvable")
            desc = info.get("longBusinessSummary") or ""
            return {
                "ticker":      t,
                "name":        info.get("longName") or info.get("shortName", t),
                "sector":      info.get("sector", ""),
                "industry":    info.get("industry", ""),
                "description": desc[:600],
                "price":       round(float(info.get("currentPrice") or 0), 2),
                "market_cap":  info.get("marketCap"),
                "pe_ratio":    info.get("trailingPE"),
                "country":     info.get("country", ""),
                "exchange":    "",
                "currency":    info.get("currency", ""),
                "image":       "",
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/swot/{ticker}")
def swot_endpoint(ticker: str):
    try:
        raw = _get_data(ticker.upper())
        result = get_swot_analysis(raw)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ai/pestle/{ticker}")
def pestle_endpoint(ticker: str):
    try:
        raw = _get_data(ticker.upper())
        result = get_pestle_analysis(raw)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from services.email_service import send_alert_email


@app.post("/api/alerts")
async def create_alert(req: Request):
    body          = await req.json()
    clerk_user_id = body.get("clerk_user_id", "")
    email         = body.get("email", "")
    ticker        = body.get("ticker", "").upper().strip()
    ticker_name   = body.get("ticker_name", ticker)
    target_price  = float(body.get("target_price", 0))
    direction     = body.get("direction", "above")

    if not clerk_user_id or not ticker or target_price <= 0:
        raise HTTPException(status_code=400, detail="Paramètres invalides")
    if direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction doit être 'above' ou 'below'")

    try:
        record = _sb_post("alerts", {
            "user_id":      clerk_user_id,
            "email":        email,
            "ticker":       ticker,
            "ticker_name":  ticker_name,
            "target_price": target_price,
            "condition":    direction,
            "active":       True,
            "is_triggered": False,
        })
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts/{clerk_user_id}")
def get_alerts(clerk_user_id: str):
    try:
        alerts = _sb_get(
            "alerts",
            f"user_id=eq.{clerk_user_id}&active=eq.true&order=created_at.desc"
        )
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str):
    try:
        _sb_patch("alerts", f"id=eq.{alert_id}", {"active": False})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/check")
def check_alerts():
    """Endpoint interne : vérifie toutes les alertes actives et envoie les emails."""
    try:
        alerts = _sb_get("alerts", "active=eq.true&is_triggered=eq.false")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {e}")

    if not alerts:
        return {"checked": 0, "triggered": 0}

    unique_tickers = list({a["ticker"] for a in alerts})
    price_map: dict = {}

    if USE_FMP:
        try:
            joined = ",".join(unique_tickers)
            url = f"https://financialmodelingprep.com/api/v3/quote/{joined}?apikey={FMP_KEY}"
            resp = httpx.get(url, timeout=8)
            resp.raise_for_status()
            for q in resp.json():
                price_map[q.get("symbol", "")] = float(q.get("price") or 0)
        except Exception:
            pass
    else:
        for sym in unique_tickers:
            try:
                fi = yf.Ticker(sym).fast_info
                price_map[sym] = float(getattr(fi, "last_price", 0) or 0)
            except Exception:
                pass

    triggered = 0
    for alert in alerts:
        ticker       = alert.get("ticker", "")
        current      = price_map.get(ticker, 0)
        target       = float(alert.get("target_price") or 0)
        direction    = alert.get("condition", "above")
        email        = alert.get("email", "")
        ticker_name  = alert.get("ticker_name") or ticker
        alert_id     = alert.get("id", "")

        if current <= 0 or target <= 0:
            continue

        fired = (direction == "above" and current >= target) or \
                (direction == "below" and current <= target)

        if fired:
            if email:
                send_alert_email(
                    to=email,
                    ticker=ticker,
                    ticker_name=ticker_name,
                    target_price=target,
                    current_price=current,
                    direction=direction,
                )
            try:
                _sb_patch("alerts", f"id=eq.{alert_id}", {
                    "active": False,
                    "is_triggered": True,
                })
            except Exception:
                pass
            triggered += 1

    return {"checked": len(alerts), "triggered": triggered}


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
