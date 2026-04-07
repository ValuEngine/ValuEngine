"""
ValuEngine API — Backend FastAPI
Slim entrypoint: app creation, middleware, health, router includes.
"""

import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import stripe

from deps import limiter

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

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ValuEngine API",
    description="Analyse financière et valorisation DCF augmentée par IA",
    version="2.0.0",
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
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


# ── Health endpoints ────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "ValuEngine API v2"}


@app.get("/warmup")
def warmup():
    """Lightweight endpoint to wake up Railway from cold start."""
    return {"status": "warm"}


# ── Router includes ─────────────────────────────────────────────────────────
from routers.market import router as market_router
from routers.analyze import router as analyze_router
from routers.alerts import router as alerts_router
from routers.stripe_routes import router as stripe_router
from routers.user import router as user_router
from routers.admin import router as admin_router
from routers.portfolio_import import router as portfolio_import_router
from routers.pedagogy import router as pedagogy_router
from routers.backtest import router as backtest_router
from routers.earnings import router as earnings_router
from routers.trends import router as trends_router
from routers.track_record import router as track_record_router

app.include_router(market_router)
app.include_router(analyze_router)
app.include_router(alerts_router)
app.include_router(stripe_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(portfolio_import_router)
app.include_router(pedagogy_router)
app.include_router(backtest_router)
app.include_router(earnings_router)
app.include_router(trends_router)
app.include_router(track_record_router)
