from pydantic import BaseModel, Field, field_validator
from typing import Optional


# ── Shared request models ──────────────────────────────────────────────────

class TickerRequest(BaseModel):
    """Simple ticker-only request for deep-analysis, anomalies, dcf-scenarios."""
    ticker: str = Field(max_length=10, pattern=r"^[A-Za-z0-9.\-]{1,10}$")


class CheckoutRequest(BaseModel):
    """Stripe checkout session creation."""
    userId: str = Field(max_length=128)
    userEmail: str = Field(default="", max_length=254)
    plan: str = Field(default="monthly", pattern=r"^(monthly|yearly)$")


class WelcomeRequest(BaseModel):
    """Welcome email request."""
    email: str = Field(max_length=254)
    first_name: str = Field(max_length=100)


class AlertRequest(BaseModel):
    """Create price alert."""
    clerk_user_id: str = Field(max_length=128, pattern=r"^[a-zA-Z0-9_\-]{1,128}$")
    email: str = Field(max_length=254)
    ticker: str = Field(max_length=10, pattern=r"^[A-Za-z0-9.\-]{1,10}$")
    ticker_name: str = Field(default="", max_length=100)
    target_price: float = Field(gt=0, le=1e8)
    direction: str = Field(default="above", pattern=r"^(above|below)$")


# ── Feature request models ─────────────────────────────────────────────────

class ExportPDFRequest(BaseModel):
    ticker: str = Field(max_length=10, pattern=r"^[A-Za-z0-9.\-]{1,10}$")
    company_name: str = Field(default="", max_length=200)
    verdict: str = Field(default="HOLD", max_length=10)
    price: float = Field(default=0, ge=0)
    intrinsic_price: float = Field(default=0)
    kpis: dict = Field(default_factory=dict)
    deep_analysis: Optional[dict] = None
    dcf_scenarios: Optional[dict] = None


class ScreenerSearchRequest(BaseModel):
    query: str = Field(min_length=10, max_length=500)


class PortfolioPositionItem(BaseModel):
    ticker: str = Field(max_length=10)
    shares: float = Field(ge=0)
    avg_price: float = Field(ge=0)
    current_price: float = Field(default=0, ge=0)
    current_value: float = Field(default=0, ge=0)
    pnl_pct: float = Field(default=0)
    sector: str = Field(default="")


class PortfolioAIRequest(BaseModel):
    positions: list[PortfolioPositionItem] = Field(min_length=1, max_length=50)


class AnalyzeRequest(BaseModel):
    ticker: str = Field(max_length=10, pattern=r"^[A-Za-z0-9.\-]{1,10}$")
    growth_rate: float = Field(default=0.08, ge=-0.50, le=0.50)   # ±50% max
    wacc: float = Field(default=0.10, ge=0.02, le=0.30)           # 2-30%
    terminal_growth: float = Field(default=0.03, ge=0.0, le=0.08) # 0-8%
    horizon: int = Field(default=5, ge=3, le=10)                  # 3-10 years
    user_id: Optional[str] = None  # Clerk user ID (for freemium enforcement)

    @field_validator("terminal_growth")
    @classmethod
    def terminal_must_be_less_than_wacc(cls, v, info):
        wacc = info.data.get("wacc", 0.10)
        if v >= wacc:
            return wacc - 0.005
        return v


class CompanyData(BaseModel):
    ticker: str
    name: str
    sector: str
    industry: str
    description: str
    price: float
    currency: str
    exchange: str
    market_cap: float
    enterprise_value: float
    shares_outstanding: float
    revenue: float
    ebitda: float
    net_income: float
    free_cash_flow: float
    total_debt: float
    total_cash: float
    net_debt: float
    pe_ratio: Optional[float]
    forward_pe: Optional[float]
    ev_ebitda: Optional[float]
    pb_ratio: Optional[float]
    roe: Optional[float]
    profit_margin: Optional[float]
    revenue_growth: Optional[float]
    beta: Optional[float]
    eps: Optional[float]
    dividend_yield: Optional[float]


class DCFResult(BaseModel):
    intrinsic_value: float
    enterprise_value_dcf: float
    equity_value: float
    terminal_value_pv: float
    fcf_projections: list[float]
    upside_pct: float


class SensitivityMatrix(BaseModel):
    index: list[str]   # growth rates
    columns: list[str] # wacc rates
    values: list[list[float]]


class BullBearAnalysis(BaseModel):
    bull_case: str
    bear_case: str


class AnalyzeResponse(BaseModel):
    company: CompanyData
    dcf: DCFResult
    sensitivity: SensitivityMatrix
    analysis: BullBearAnalysis
    verdict: str          # "BUY" | "HOLD" | "SELL"
    verdict_label: str    # "Sous-évalué" | "Juste valeur" | "Surévalué"
    suggested_wacc: Optional[dict] = None
    sector_benchmarks: Optional[dict] = None
    share_id: Optional[str] = None
    is_first_analysis: bool = False
    irr: Optional[float] = None  # Implied IRR at current price
    cagr_revenue_5y: Optional[float] = None  # 5-year revenue CAGR
    terminal_value_pct: Optional[float] = None  # TV as % of total EV
    terminal_growth_warning: bool = False
    financial_warning: Optional[str] = None
    data_timestamp: Optional[str] = None
    beta_info: Optional[dict] = None  # Dynamic beta regression info
