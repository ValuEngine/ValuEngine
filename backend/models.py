from pydantic import BaseModel
from typing import Optional


class AnalyzeRequest(BaseModel):
    ticker: str
    growth_rate: float = 0.08    # FCF growth rate (default 8%)
    wacc: float = 0.10           # Discount rate (default 10%)
    terminal_growth: float = 0.03 # Terminal growth (default 3%)
    horizon: int = 5             # Projection years (default 5)
    user_id: Optional[str] = None  # Clerk user ID (for freemium enforcement)


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
    share_id: Optional[str] = None
