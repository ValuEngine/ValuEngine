"""
Tests de logique financière — ValuEngine
Vérifie que les calculs DCF, IRR, portfolio health sont corrects.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.dcf import calculate_dcf, calculate_irr, sensitivity_analysis, get_sector_dcf_defaults
from services.portfolio_health import calculate_health_score
from services.backtest import run_backtest


# ═══════════════════════════════════════════════════════════════════════════════
# DCF TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestDCFApple:
    """Test 1: DCF Apple-like company — standard healthy company."""

    def test_dcf_apple_basic(self):
        """Apple-like: FCF=110B, growth=8%, WACC=10%, terminal=3%, 5yr horizon, 15.5B shares, net_debt=50B"""
        result = calculate_dcf(
            fcf=110_000_000_000,
            growth_rate=0.08,
            wacc=0.10,
            terminal_growth=0.03,
            horizon=5,
            shares_outstanding=15_500_000_000,
            net_debt=50_000_000_000,
        )
        iv = result["intrinsic_value"]
        # Apple-like company should have a positive, reasonable intrinsic value
        assert iv > 0, "Intrinsic value must be positive"
        assert 50 < iv < 500, f"Apple IV should be reasonable, got {iv}"
        assert result["enterprise_value_dcf"] > 0
        assert result["equity_value"] > 0
        assert len(result["fcf_projections"]) == 5
        assert len(result["pv_fcfs"]) == 5
        # Each projected FCF should be larger than the previous (positive growth)
        for i in range(1, len(result["fcf_projections"])):
            assert result["fcf_projections"][i] > result["fcf_projections"][i - 1]

    def test_dcf_apple_terminal_value_pct(self):
        """Terminal value should represent a significant but not extreme portion."""
        result = calculate_dcf(
            fcf=110_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=15_500_000_000, net_debt=50_000_000_000,
        )
        tv_pct = result["terminal_value_pct"]
        assert 40 < tv_pct < 95, f"Terminal value % should be 40-95%, got {tv_pct}"

    def test_dcf_apple_confidence_warning(self):
        """Check confidence warning is present."""
        result = calculate_dcf(
            fcf=110_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=15_500_000_000, net_debt=50_000_000_000,
        )
        assert "confidence_warning" in result
        assert result["confidence_warning"] in ("high", "medium", "low")


class TestDCFNegativeFCF:
    """Test 2: Company with negative FCF."""

    def test_negative_fcf_returns_zero_or_warning(self):
        """Negative FCF should produce intrinsic_value = 0 (clamped)."""
        result = calculate_dcf(
            fcf=-5_000_000_000,
            growth_rate=0.08,
            wacc=0.10,
            terminal_growth=0.03,
            horizon=5,
            shares_outstanding=1_000_000_000,
            net_debt=10_000_000_000,
        )
        assert result["intrinsic_value"] == 0.0, "Negative FCF should clamp IV to 0"
        # Projections should be negative
        assert all(f < 0 for f in result["fcf_projections"])

    def test_zero_fcf_returns_warning(self):
        """FCF=0 should return a warning, not clamp to 1.0."""
        result = calculate_dcf(
            fcf=0,
            growth_rate=0.08,
            wacc=0.10,
            terminal_growth=0.03,
            horizon=5,
            shares_outstanding=1_000_000_000,
            net_debt=10_000_000_000,
        )
        assert result["intrinsic_value"] == 0
        assert "warning" in result
        assert "nul" in result["warning"].lower() or "fcf" in result["warning"].lower()


class TestDCFHighGrowth:
    """Test 3: High growth tech company."""

    def test_high_growth_higher_iv(self):
        """Higher growth rate should yield higher intrinsic value, all else equal."""
        base = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        high = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.15, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        assert high["intrinsic_value"] > base["intrinsic_value"], \
            "Higher growth should produce higher IV"

    def test_higher_wacc_lower_iv(self):
        """Higher WACC (discount rate) should yield lower intrinsic value."""
        low_wacc = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.08,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        high_wacc = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.15,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        assert high_wacc["intrinsic_value"] < low_wacc["intrinsic_value"], \
            "Higher WACC should produce lower IV"


class TestDCFZeroShares:
    """Test 4: Edge case — zero shares outstanding."""

    def test_zero_shares_returns_zero(self):
        result = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=0, net_debt=0,
        )
        assert result["intrinsic_value"] == 0
        assert "warning" in result

    def test_negative_shares_returns_zero(self):
        result = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=-100, net_debt=0,
        )
        assert result["intrinsic_value"] == 0


class TestDCFTerminalGrowthGuard:
    """Test 5: Terminal growth >= WACC should be auto-corrected."""

    def test_terminal_growth_corrected_when_gte_wacc(self):
        """If terminal_growth >= wacc, engine should correct and not crash."""
        result = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.12,  # > WACC of 10%
            horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        assert result["intrinsic_value"] >= 0
        assert result["enterprise_value_dcf"] > 0

    def test_terminal_growth_equal_wacc(self):
        result = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.10,
            horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        assert result["intrinsic_value"] >= 0


# ═══════════════════════════════════════════════════════════════════════════════
# IRR TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestIRR:
    """Test 6: IRR calculation."""

    def test_irr_positive_for_undervalued(self):
        """If price << intrinsic value, IRR should be high."""
        dcf = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        # Use a very low price → high IRR
        irr = calculate_irr(
            price=20.0,  # well below intrinsic
            fcf_projections=dcf["fcf_projections"],
            terminal_value_undiscounted=dcf["terminal_value_undiscounted"],
            shares_outstanding=1_000_000_000,
            net_debt=0,
        )
        assert irr is not None
        assert irr > 10, f"IRR should be >10% for undervalued stock, got {irr}"

    def test_irr_returns_none_for_extreme(self):
        """IRR should return None for extreme/impossible scenarios."""
        irr = calculate_irr(
            price=1_000_000,
            fcf_projections=[100, 100, 100],
            terminal_value_undiscounted=500,
            shares_outstanding=1,
            net_debt=0,
        )
        # With such extreme values, IRR may be None or very negative
        # Either is acceptable
        assert irr is None or irr < 0


# ═══════════════════════════════════════════════════════════════════════════════
# SENSITIVITY ANALYSIS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSensitivity:
    """Test 7: Sensitivity matrix."""

    def test_sensitivity_5x5(self):
        result = sensitivity_analysis(
            fcf=5_000_000_000, base_growth=0.08, base_wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        assert len(result["values"]) == 5
        assert all(len(row) == 5 for row in result["values"])
        assert len(result["index"]) == 5
        assert len(result["columns"]) == 5

    def test_sensitivity_center_matches_dcf(self):
        """Center of sensitivity matrix should match base DCF calculation."""
        base = calculate_dcf(
            fcf=5_000_000_000, growth_rate=0.08, wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        sens = sensitivity_analysis(
            fcf=5_000_000_000, base_growth=0.08, base_wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        center_value = sens["values"][2][2]  # middle of 5x5
        assert abs(center_value - base["intrinsic_value"]) < 0.1, \
            f"Center should match base DCF: {center_value} vs {base['intrinsic_value']}"

    def test_sensitivity_monotonicity(self):
        """Higher growth → higher IV (each row left to right should decrease as WACC increases)."""
        sens = sensitivity_analysis(
            fcf=5_000_000_000, base_growth=0.08, base_wacc=0.10,
            terminal_growth=0.03, horizon=5,
            shares_outstanding=1_000_000_000, net_debt=0,
        )
        for row in sens["values"]:
            # As WACC increases (left to right), IV should generally decrease
            for i in range(len(row) - 1):
                assert row[i] >= row[i + 1], \
                    f"IV should decrease as WACC increases: {row}"


# ═══════════════════════════════════════════════════════════════════════════════
# PORTFOLIO HEALTH TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestPortfolioHealth:
    """Test 8: Portfolio health score."""

    def test_empty_portfolio(self):
        result = calculate_health_score([])
        assert result["score"] == 0
        assert result["grade"] == "F"

    def test_single_position(self):
        result = calculate_health_score([{
            "ticker": "AAPL", "shares": 10, "avg_price": 150,
            "current_price": 180, "current_value": 1800,
            "pnl_pct": 20, "sector": "Technology",
        }])
        assert 0 < result["score"] <= 100
        assert result["positions_count"] == 1
        # Single position should have warnings about diversification
        warnings = [i["message"] for i in result["issues"]]
        assert any("1 position" in w for w in warnings)

    def test_well_diversified_portfolio(self):
        """A 10-position, multi-sector portfolio should score well."""
        positions = [
            {"ticker": "AAPL", "shares": 10, "avg_price": 150, "current_price": 180, "current_value": 1800, "pnl_pct": 20, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 8, "avg_price": 300, "current_price": 350, "current_value": 2800, "pnl_pct": 16.7, "sector": "Technology"},
            {"ticker": "JNJ", "shares": 15, "avg_price": 160, "current_price": 170, "current_value": 2550, "pnl_pct": 6.25, "sector": "Healthcare"},
            {"ticker": "PG", "shares": 12, "avg_price": 140, "current_price": 155, "current_value": 1860, "pnl_pct": 10.7, "sector": "Consumer Defensive"},
            {"ticker": "JPM", "shares": 10, "avg_price": 150, "current_price": 175, "current_value": 1750, "pnl_pct": 16.7, "sector": "Financial Services"},
            {"ticker": "XOM", "shares": 20, "avg_price": 100, "current_price": 110, "current_value": 2200, "pnl_pct": 10, "sector": "Energy"},
            {"ticker": "NEE", "shares": 25, "avg_price": 70, "current_price": 75, "current_value": 1875, "pnl_pct": 7.1, "sector": "Utilities"},
            {"ticker": "AMT", "shares": 5, "avg_price": 200, "current_price": 210, "current_value": 1050, "pnl_pct": 5, "sector": "Real Estate"},
            {"ticker": "LIN", "shares": 5, "avg_price": 380, "current_price": 400, "current_value": 2000, "pnl_pct": 5.3, "sector": "Basic Materials"},
            {"ticker": "DIS", "shares": 15, "avg_price": 90, "current_price": 100, "current_value": 1500, "pnl_pct": 11.1, "sector": "Communication Services"},
        ]
        result = calculate_health_score(positions)
        assert result["score"] >= 60, f"Well-diversified portfolio should score 60+, got {result['score']}"
        assert result["grade"] in ("A", "B")

    def test_concentrated_portfolio_penalized(self):
        """One dominant position should lower the score."""
        positions = [
            {"ticker": "AAPL", "shares": 100, "avg_price": 150, "current_price": 180, "current_value": 18000, "pnl_pct": 20, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 1, "avg_price": 300, "current_price": 350, "current_value": 350, "pnl_pct": 16.7, "sector": "Technology"},
        ]
        result = calculate_health_score(positions)
        # Should have concentration warning
        assert any("represente" in i["message"] for i in result["issues"])

    def test_all_losers_portfolio(self):
        """Portfolio with all losing positions should score low on performance."""
        positions = [
            {"ticker": "A", "shares": 10, "avg_price": 100, "current_price": 60, "current_value": 600, "pnl_pct": -40, "sector": "Healthcare"},
            {"ticker": "B", "shares": 10, "avg_price": 50, "current_price": 30, "current_value": 300, "pnl_pct": -40, "sector": "Technology"},
            {"ticker": "C", "shares": 10, "avg_price": 80, "current_price": 50, "current_value": 500, "pnl_pct": -37.5, "sector": "Energy"},
        ]
        result = calculate_health_score(positions)
        assert result["score"] < 50, f"All-losers portfolio should score <50, got {result['score']}"
        assert result["breakdown"]["performance"]["score"] < 10


# ═══════════════════════════════════════════════════════════════════════════════
# SECTOR DCF DEFAULTS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSectorDefaults:
    """Test sector-specific DCF defaults."""

    def test_technology_defaults(self):
        defaults = get_sector_dcf_defaults("Technology")
        assert defaults["growth_rate"] > 0.08  # Tech grows faster
        assert defaults["wacc"] >= 0.09

    def test_utilities_conservative(self):
        defaults = get_sector_dcf_defaults("Utilities")
        assert defaults["growth_rate"] <= 0.05  # Utilities are slow growth
        assert defaults["wacc"] <= 0.08

    def test_unknown_sector_fallback(self):
        defaults = get_sector_dcf_defaults("Some Unknown Sector")
        assert "growth_rate" in defaults
        assert "wacc" in defaults
        assert "terminal_growth" in defaults
        assert "horizon" in defaults


# ═══════════════════════════════════════════════════════════════════════════════
# BACKTEST EDGE CASES
# ═══════════════════════════════════════════════════════════════════════════════

class TestBacktestEdgeCases:
    """Backtest input validation."""

    def test_future_date_rejected(self):
        result = run_backtest("AAPL", "2099-01-01", 10000)
        assert "error" in result

    def test_invalid_date_format(self):
        result = run_backtest("AAPL", "not-a-date", 10000)
        assert "error" in result

    def test_sell_before_buy_rejected(self):
        result = run_backtest("AAPL", "2024-01-15", 10000, sell_date="2023-01-01")
        assert "error" in result

    def test_ancient_date_rejected(self):
        result = run_backtest("AAPL", "1950-01-01", 10000)
        assert "error" in result
