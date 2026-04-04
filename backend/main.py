"""
ValuEngine API — Backend FastAPI
Endpoints pour l'analyse financière complète d'une action.
"""

import os
import re
import time
import uuid
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote as url_quote
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

import httpx
import jwt
import stripe
import yfinance as yf
from jwt import PyJWKClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from models import AnalyzeRequest, AnalyzeResponse, CompanyData, DCFResult, SensitivityMatrix, BullBearAnalysis
from services.dcf import calculate_dcf, sensitivity_analysis
from services.ai_analyst import get_bull_bear_analysis, get_swot_analysis, get_pestle_analysis, get_deep_analysis, detect_anomalies, get_dcf_scenarios
from services.fmp_data import get_deep_financials, get_sector_benchmarks

load_dotenv(Path(__file__).parent / ".env", override=True)

# ── Sentry error monitoring ────────────────────────────────────────────────
_SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "production"),
    )

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("valuengine")

FMP_KEY = os.environ.get("FMP_API_KEY", "")
USE_FMP = bool(FMP_KEY and FMP_KEY.strip())
# yfinance is the primary data source (free, unlimited, full financial statements)
# FMP free plan only supports /quote and /profile — not financial statements
from services.market_data import get_company_data as _get_data, get_peers_data
logger.info(f"[DataSource] yfinance | FMP={'enabled' if USE_FMP else 'disabled'}")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
ALERTS_CHECK_SECRET = os.environ.get("ALERTS_CHECK_SECRET", "")

# ── Clerk JWT verification ─────────────────────────────────────────────────
_CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")
_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client:
        return _jwks_client
    jwks_url = _CLERK_JWKS_URL
    if not jwks_url:
        return None
    _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


async def verify_clerk_token(request: Request) -> str:
    """
    Verify the Clerk JWT from the Authorization header.
    Returns the clerk user_id (sub claim) if valid.
    Raises HTTPException 401 if invalid or missing.
    """
    client = _get_jwks_client()
    if not client:
        # If JWKS not configured, fall back to trusting the X-User-Id header
        # (only acceptable in dev / before JWKS is set up)
        user_id = request.headers.get("X-User-Id", "")
        if user_id:
            return _safe_id(user_id)
        raise HTTPException(status_code=401, detail="Authentification requise")

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")

    token = auth_header[7:]  # strip "Bearer "
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        sub = payload.get("sub", "")
        if not sub:
            raise HTTPException(status_code=401, detail="Token invalide (sub manquant)")
        return sub
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError as e:
        logger.warning(f"[Auth] Token invalide: {e}")
        raise HTTPException(status_code=401, detail="Token invalide")


def _require_owner(token_user_id: str, resource_user_id: str):
    """Ensure the authenticated user owns the resource."""
    if token_user_id != resource_user_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")


# ── Input sanitization ──────────────────────────────────────────────────────
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")

def _safe_id(value: str) -> str:
    """Validate and return a safe identifier for Supabase queries."""
    if not value or not _SAFE_ID_RE.match(value):
        raise HTTPException(status_code=400, detail="Identifiant invalide")
    return value

def _safe_id_internal(value: str) -> str:
    """Same as _safe_id but returns empty string instead of raising (for internal use)."""
    if not value or not _SAFE_ID_RE.match(value):
        return ""
    return value

# ── Rate limiter ────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

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

def _sb_patch(table: str, params: str, body: dict) -> list:
    """PATCH rows in Supabase. Returns list of updated rows (can be empty if no match)."""
    if not _SUPA_URL or not _SUPA_KEY:
        logger.error(f"[Supabase] _sb_patch called but SUPA_URL/KEY missing")
        return []
    url = f"{_SUPA_URL}/rest/v1/{table}?{params}"
    resp = httpx.patch(url, headers=_sb_headers(), json=body, timeout=10)
    logger.info(f"[Supabase] PATCH {table}?{params} → status={resp.status_code} body={resp.text[:300]}")
    resp.raise_for_status()
    try:
        data = resp.json()
        return data if isinstance(data, list) else [data] if data else []
    except Exception:
        return []


def _webhook_patch_user(user_id: str, update_full: dict, update_minimal: dict) -> list:
    """
    Try to PATCH user with full payload (incl. pro_until).
    If that fails (e.g. column doesn't exist), retry with minimal payload (just is_pro).
    Tries id= first, then clerk_user_id= as fallback column.
    """
    for body_label, body in [("full", update_full), ("minimal", update_minimal)]:
        for col in ["id", "clerk_user_id"]:
            try:
                updated = _sb_patch("users", f"{col}=eq.{user_id}", body)
                if updated:
                    logger.info(f"[Patch] {col}=eq.{user_id} ({body_label}) → {len(updated)} row(s) ✓")
                    return updated
                else:
                    logger.info(f"[Patch] {col}=eq.{user_id} ({body_label}) → 0 rows (no match)")
            except Exception as e:
                logger.warning(f"[Patch] {col}=eq.{user_id} ({body_label}) → erreur: {e}")
                # If full body failed with a column error, break to try minimal
                if body_label == "full" and ("column" in str(e).lower() or "42703" in str(e)):
                    logger.info("[Patch] Colonne manquante détectée, bascule vers payload minimal")
                    break
    return []


# ── Freemium enforcement helpers ────────────────────────────────────────────
FREE_DAILY_LIMIT = 3


def _get_today_analysis_count(user_id: str) -> int:
    """Count how many analyses a user has run today (UTC)."""
    user_id = _safe_id_internal(user_id)
    if not _SUPA_URL or not _SUPA_KEY or not user_id:
        return 0
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00+00:00")
    try:
        rows = _sb_get(
            "analyses",
            f"user_id=eq.{user_id}&created_at=gte.{today_start}&select=id",
        )
        return len(rows)
    except Exception as e:
        logger.error(f"[Freemium] Error counting analyses: {e}")
        return 0


def _is_user_pro(user_id: str) -> bool:
    """Check whether a user has an active Pro subscription."""
    user_id = _safe_id_internal(user_id)
    if not _SUPA_URL or not _SUPA_KEY or not user_id:
        return False
    try:
        # Try id= first (frontend stores clerk_user_id as "id"), fallback to clerk_user_id=
        rows = _sb_get("users", f"id=eq.{user_id}&select=is_pro,pro_until")
        if not rows:
            rows = _sb_get("users", f"clerk_user_id=eq.{user_id}&select=is_pro,pro_until")
        if not rows:
            return False
        user = rows[0]
        if user.get("is_pro"):
            return True
        pro_until = user.get("pro_until")
        if pro_until:
            return datetime.fromisoformat(pro_until.replace("Z", "+00:00")) > datetime.now(timezone.utc)
        return False
    except Exception as e:
        logger.error(f"[Freemium] Error checking pro status: {e}")
        return False


app = FastAPI(
    title="ValuEngine API",
    description="Analyse financière et valorisation DCF augmentée par IA",
    version="2.0.0",
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — autorise le frontend Next.js (localhost:3000 en dev, domaine prod)
_frontend_url = os.environ.get("FRONTEND_URL", "")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://valuengine.io",
        "https://valuengine.fr",
        "https://www.valuengine.fr",
        _frontend_url,
    ],
    allow_origin_regex=r"https://valuengine[a-z0-9\-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Stripe-Signature"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ValuEngine API v2"}


@app.get("/warmup")
def warmup():
    """Lightweight endpoint to wake up Railway from cold start."""
    return {"status": "warm"}


# ── Thread-safe TTL cache with LRU eviction ──────────────────────────────────
import threading
from collections import OrderedDict

class TTLCache:
    """Thread-safe cache with TTL and max size (LRU eviction)."""
    def __init__(self, max_size: int = 500, default_ttl: int = 1800):
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: dict = {}
        self._lock = threading.Lock()
        self._max_size = max_size
        self._default_ttl = default_ttl

    def get(self, key: str, ttl: int | None = None):
        ttl = ttl or self._default_ttl
        with self._lock:
            if key not in self._cache:
                return None
            if time.time() - self._timestamps[key] > ttl:
                del self._cache[key]
                del self._timestamps[key]
                return None
            self._cache.move_to_end(key)
            return self._cache[key]

    def set(self, key: str, value):
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            self._timestamps[key] = time.time()
            while len(self._cache) > self._max_size:
                oldest = next(iter(self._cache))
                del self._cache[oldest]
                del self._timestamps[oldest]


# ── Market overview cache ────────────────────────────────────────────────────
_market_cache = TTLCache(max_size=10, default_ttl=300)  # 5 min
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
    cached = _market_cache.get("overview")
    if cached:
        return cached

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
        _market_cache.set("overview", results)
        return results
    except Exception as e:
        logger.warning(f"[market-overview] yfinance error: {e}")
        return _MARKET_FALLBACK


@app.post("/api/analyze", response_model=AnalyzeResponse)
@limiter.limit("10/minute")
def analyze(request: Request, req: AnalyzeRequest):
    """
    Endpoint principal : analyse complète d'une action.
    - Données de marché (yfinance)
    - Calcul DCF + matrice de sensibilité
    - Analyse Bull/Bear par IA (Claude)
    - Verdict BUY / HOLD / SELL
    """
    ticker = req.ticker.upper().strip()

    # ── 0. Freemium enforcement ─────────────────────────────────────────
    if req.user_id:
        if not _is_user_pro(req.user_id):
            used = _get_today_analysis_count(req.user_id)
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
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
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

    # ── 6. Share ID for public sharing ──────────────────────────────────
    # Migration needed: ALTER TABLE analyses ADD COLUMN IF NOT EXISTS share_id TEXT;
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
    if req.user_id:
        analysis_record["user_id"] = req.user_id
    try:
        _sb_post("analyses", analysis_record)
    except Exception as e:
        logger.error(f"[Analyze] Erreur sauvegarde analyse: {e}")

    return AnalyzeResponse(
        company=company,
        dcf=dcf,
        sensitivity=sensitivity,
        analysis=analysis,
        verdict=verdict,
        verdict_label=verdict_label,
        share_id=share_id,
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
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


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
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


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
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


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
            logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
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
            logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")
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
            logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.get("/api/ai/swot/{ticker}")
@limiter.limit("5/minute")
def swot_endpoint(request: Request, ticker: str):
    try:
        raw = _get_data(ticker.upper())
        result = get_swot_analysis(raw)
        return result
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.get("/api/ai/pestle/{ticker}")
@limiter.limit("5/minute")
def pestle_endpoint(request: Request, ticker: str):
    try:
        raw = _get_data(ticker.upper())
        result = get_pestle_analysis(raw)
        return result
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


_analysis_cache = TTLCache(max_size=300, default_ttl=1800)  # 30 min
_CACHE_TTL_30M = 30 * 60
_CACHE_TTL_1H = 60 * 60


def _cache_get(key: str, ttl: int) -> dict | None:
    return _analysis_cache.get(key, ttl)


def _cache_set(key: str, data: dict):
    _analysis_cache.set(key, data)


@app.post("/api/analyze/deep-analysis")
@limiter.limit("5/minute")
async def deep_analysis_endpoint(request: Request):
    """Analyse approfondie IA avec données financières 5 ans (Pro only)."""
    body = await request.json()
    ticker = body.get("ticker", "").upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="ticker requis")

    # Check cache
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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/anomalies")
@limiter.limit("10/minute")
async def anomalies_endpoint(request: Request):
    """Détection d'anomalies financières vs benchmarks sectoriels."""
    body = await request.json()
    ticker = body.get("ticker", "").upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="ticker requis")

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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/dcf-scenarios")
@limiter.limit("5/minute")
async def dcf_scenarios_endpoint(request: Request):
    """3 scénarios DCF (bull/base/bear) avec narratif IA."""
    body = await request.json()
    ticker = body.get("ticker", "").upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="ticker requis")

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
        raise HTTPException(status_code=500, detail=str(e))


from services.email_service import send_alert_email, send_welcome_email


@app.post("/api/alerts")
async def create_alert(req: Request):
    token_user_id = await verify_clerk_token(req)
    body          = await req.json()
    clerk_user_id = body.get("clerk_user_id", "")
    email         = body.get("email", "")
    ticker        = body.get("ticker", "").upper().strip()
    ticker_name   = body.get("ticker_name", ticker)
    try:
        target_price = float(body.get("target_price", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="target_price doit être un nombre valide")
    direction     = body.get("direction", "above")

    if not clerk_user_id or not ticker or target_price <= 0:
        raise HTTPException(status_code=400, detail="Paramètres invalides")
    _require_owner(token_user_id, clerk_user_id)
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
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.get("/api/alerts/{clerk_user_id}")
async def get_alerts(clerk_user_id: str, request: Request):
    token_user_id = await verify_clerk_token(request)
    clerk_user_id = _safe_id(clerk_user_id)
    _require_owner(token_user_id, clerk_user_id)
    try:
        alerts = _sb_get(
            "alerts",
            f"user_id=eq.{clerk_user_id}&active=eq.true&order=created_at.desc"
        )
        return alerts
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: str, request: Request):
    token_user_id = await verify_clerk_token(request)
    alert_id = _safe_id(alert_id)
    # Verify the alert belongs to the authenticated user
    try:
        rows = _sb_get("alerts", f"id=eq.{alert_id}&select=user_id")
        if rows and rows[0].get("user_id") != token_user_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
    except HTTPException:
        raise
    except Exception:
        pass  # If check fails, proceed (alert may not exist)
    try:
        _sb_patch("alerts", f"id=eq.{alert_id}", {"active": False})
        return {"ok": True}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.post("/api/alerts/check")
def check_alerts(request: Request):
    """Endpoint interne : vérifie toutes les alertes actives et envoie les emails."""
    # Protected by internal secret (called from GitHub Actions cron)
    secret = request.headers.get("X-Internal-Secret", "")
    if not ALERTS_CHECK_SECRET or secret != ALERTS_CHECK_SECRET:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    try:
        alerts = _sb_get("alerts", "active=eq.true&is_triggered=eq.false")
    except Exception as e:
        logger.error(f"Supabase error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")

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
    MAX_EMAILS_PER_RUN = 50
    for alert in alerts:
        if triggered >= MAX_EMAILS_PER_RUN:
            logger.warning(f"[alerts/check] Limite de {MAX_EMAILS_PER_RUN} emails atteinte, arrêt")
            break

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
@limiter.limit("3/minute")
async def create_checkout(request: Request):
    body = await request.json()
    user_id = body.get("userId", "")
    user_email = body.get("userEmail", "")
    plan = body.get("plan", "monthly")  # "monthly" ou "yearly"

    if not stripe.api_key or stripe.api_key == "sk_test_REMPLACE":
        raise HTTPException(status_code=503, detail="Stripe non configuré")

    if plan == "yearly":
        price_id = os.environ.get("STRIPE_PRICE_ID_YEARLY", "")
    else:
        price_id = os.environ.get("STRIPE_PRICE_ID", "")

    if not price_id:
        raise HTTPException(status_code=400, detail=f"Price ID non configuré pour le plan '{plan}'")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/?canceled=true",
            customer_email=user_email,
            metadata={"userId": user_id, "plan": plan},
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.post("/api/user/welcome")
async def user_welcome(request: Request):
    """Envoie un email de bienvenue à un nouvel utilisateur."""
    await verify_clerk_token(request)
    body = await request.json()
    email = body.get("email", "")
    first_name = body.get("first_name", "")

    if not email or not first_name:
        raise HTTPException(status_code=400, detail="email et first_name requis")

    ok = send_welcome_email(to=email, first_name=first_name)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")
    return {"ok": True}


@app.get("/api/referral/{clerk_user_id}")
async def get_referral(clerk_user_id: str, request: Request):
    """Compte le nombre de filleuls d'un utilisateur."""
    token_user_id = await verify_clerk_token(request)
    clerk_user_id = _safe_id(clerk_user_id)
    _require_owner(token_user_id, clerk_user_id)
    try:
        rows = _sb_get("users", f"referred_by=eq.{clerk_user_id}&select=id")
        count = len(rows)
        return {"count": count, "reward_eligible": count >= 3}
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


# Migration needed: ALTER TABLE analyses ADD COLUMN IF NOT EXISTS share_id TEXT;
@app.get("/api/analyse/{share_id}")
def get_shared_analysis(share_id: str):
    """Retourne une analyse publique par son share_id (pas d'auth requise)."""
    share_id = _safe_id(share_id)
    try:
        rows = _sb_get(
            "analyses",
            f"share_id=eq.{share_id}&select=ticker,company_name,verdict,price,intrinsic_value,upside_pct,created_at&limit=1"
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Analyse introuvable")
        return rows[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur")


@app.get("/api/usage/{user_id}")
async def get_usage(user_id: str, request: Request):
    """Retourne l'usage quotidien et le statut Pro d'un utilisateur."""
    token_user_id = await verify_clerk_token(request)
    user_id = _safe_id(user_id)
    _require_owner(token_user_id, user_id)
    is_pro = _is_user_pro(user_id)
    used = _get_today_analysis_count(user_id)
    return {
        "used": used,
        "limit": FREE_DAILY_LIMIT,
        "is_pro": is_pro,
    }


@app.get("/api/user/pro-status/{user_id}")
async def get_pro_status(user_id: str, request: Request):
    """Retourne le statut Pro vérifié côté serveur via Supabase."""
    token_user_id = await verify_clerk_token(request)
    user_id = _safe_id(user_id)
    _require_owner(token_user_id, user_id)
    is_pro = _is_user_pro(user_id)
    return {"is_pro": is_pro}


@app.get("/api/stripe/verify-session")
async def verify_stripe_session(session_id: str):
    """Vérifie une session Stripe Checkout et active le Pro si valide."""
    logger.info(f"[verify-session] Début — session_id={session_id[:20]}...")

    if not stripe.api_key or stripe.api_key == "sk_test_REMPLACE":
        raise HTTPException(status_code=503, detail="Stripe non configuré")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")

    # 1. Retrieve session from Stripe
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        logger.info(f"[verify-session] Stripe session retrieved — payment_status={session.payment_status}, metadata={dict(session.metadata)}")
    except Exception as e:
        logger.error(f"[verify-session] Stripe retrieve error: {e}")
        raise HTTPException(status_code=400, detail="Session de paiement invalide")

    if session.payment_status != "paid":
        logger.warning(f"[verify-session] Payment not confirmed: {session.payment_status}")
        raise HTTPException(status_code=402, detail="Paiement non confirmé")

    user_id = session.metadata.get("userId", "")
    plan = session.metadata.get("plan", "monthly")
    subscription_id = session.subscription

    logger.info(f"[verify-session] user_id={user_id}, plan={plan}, subscription_id={subscription_id}")

    if not user_id:
        raise HTTPException(status_code=400, detail="userId manquant dans la session")

    # 2. Build Pro update payload
    pro_duration = timedelta(days=365) if plan == "yearly" else timedelta(days=31)
    pro_until = (datetime.now(timezone.utc) + pro_duration).isoformat()
    update_body = {
        "is_pro": True,
        "pro_until": pro_until,
        "stripe_subscription_id": subscription_id or "",
    }

    # 3. PATCH user — with full body, fallback to minimal if column missing
    update_minimal = {"is_pro": True, "stripe_subscription_id": subscription_id or ""}
    updated_rows = _webhook_patch_user(user_id, update_body, update_minimal)

    # 5. Final check
    if not updated_rows:
        logger.error(f"[verify-session] AUCUNE ligne mise à jour pour user_id={user_id} — l'utilisateur n'existe pas en base ?")
        # Return success anyway — the frontend will do its own PATCH via /api/db/user
        return {"is_pro": True, "user_id": user_id, "plan": plan, "db_updated": False}

    logger.info(f"[verify-session] SUCCESS — Pro activé pour user_id={user_id}")
    return {"is_pro": True, "user_id": user_id, "plan": plan, "db_updated": True}


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe — TOUJOURS retourner 200 pour éviter les retries infinis.
    Les erreurs sont loggées mais ne crashent jamais le handler.
    """
    import traceback

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    logger.info(f"[Webhook] Reçu — sig={'oui' if sig_header else 'NON'}, secret={'oui' if webhook_secret else 'NON CONFIGURÉ'}")

    # ── 1. Vérification de signature ────────────────────────────────────
    if not webhook_secret:
        logger.error("[Webhook] STRIPE_WEBHOOK_SECRET non configuré sur Railway")
        return JSONResponse({"error": "Webhook secret missing"}, status_code=400)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError as e:
        logger.error(f"[Webhook] Payload invalide: {e}")
        return JSONResponse({"error": "Invalid payload"}, status_code=400)
    except Exception as e:
        logger.error(f"[Webhook] Signature invalide: {e}")
        return JSONResponse({"error": "Invalid signature"}, status_code=400)

    # ── 2. Handler principal — try/except global → TOUJOURS 200 ─────────
    try:
        event_type = event.get("type", "unknown")
        logger.info(f"[Webhook] Event reçu: {event_type}")

        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            metadata = session.get("metadata") or {}

            logger.info(f"[Webhook] Session metadata: {metadata}")
            logger.info(f"[Webhook] Session subscription: {session.get('subscription')}")
            logger.info(f"[Webhook] Customer email: {session.get('customer_email')}")

            user_id = metadata.get("userId", "")
            plan = metadata.get("plan", "monthly")
            subscription_id = session.get("subscription", "")

            if not user_id:
                logger.error("[Webhook] ERREUR: userId ABSENT dans session.metadata")
                logger.error(f"[Webhook] metadata complète = {metadata}")
                return {"status": "ok"}

            pro_duration = timedelta(days=365) if plan == "yearly" else timedelta(days=31)
            pro_until = (datetime.now(timezone.utc) + pro_duration).isoformat()

            # Build update — try with pro_until first, fallback without if column doesn't exist
            update_full = {
                "is_pro": True,
                "pro_until": pro_until,
                "stripe_subscription_id": str(subscription_id or ""),
            }
            update_minimal = {
                "is_pro": True,
                "stripe_subscription_id": str(subscription_id or ""),
            }

            updated = _webhook_patch_user(user_id, update_full, update_minimal)

            if updated:
                logger.info(f"[Webhook] SUCCESS — Pro activé pour user_id={user_id}, plan={plan}")
            else:
                logger.error(f"[Webhook] ECHEC — 0 rows updated pour user_id={user_id}")
                logger.error(f"[Webhook] Vérifier que l'utilisateur existe dans la table 'users' avec id={user_id}")

        elif event_type == "customer.subscription.deleted":
            sub_id = event["data"]["object"].get("id", "")
            logger.info(f"[Webhook] subscription.deleted — sub_id={sub_id}")

            if sub_id and _SUPA_URL and _SUPA_KEY:
                try:
                    rows = _sb_get("users", f"stripe_subscription_id=eq.{sub_id}&select=id")
                    if rows:
                        uid = rows[0].get("id", "")
                        if uid:
                            _sb_patch("users", f"id=eq.{uid}", {"is_pro": False, "stripe_subscription_id": ""})
                            logger.info(f"[Webhook] Pro révoqué pour sub={sub_id}")
                    else:
                        logger.warning(f"[Webhook] Aucun user trouvé pour sub={sub_id}")
                except Exception as e:
                    logger.error(f"[Webhook] Erreur révocation: {e}")

        else:
            logger.info(f"[Webhook] Event ignoré: {event_type}")

    except Exception as e:
        # Catch-all : log TOUT mais retourne 200 quand même
        logger.error(f"[Webhook] ERREUR CRITIQUE NON GÉRÉE: {e}")
        logger.error(traceback.format_exc())

    # TOUJOURS retourner 200 — Stripe arrête les retries
    return {"status": "ok"}


