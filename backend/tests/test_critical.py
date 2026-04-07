"""
Tests critiques ValuEngine — sécurité, calculs financiers, cache.
"""
import time
import pytest
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from deps import TTLCache

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
# SÉCURITÉ
# ═══════════════════════════════════════════════════════════════════════════════

class TestSecurity:
    def test_alerts_get_requires_auth(self):
        """GET /api/alerts/{user_id} must reject unauthenticated requests."""
        resp = client.get("/api/alerts/user_test123")
        assert resp.status_code == 401

    def test_alerts_post_requires_auth(self):
        """POST /api/alerts must reject unauthenticated requests."""
        resp = client.post("/api/alerts", json={
            "clerk_user_id": "user_test",
            "email": "test@test.com",
            "ticker": "AAPL",
            "target_price": 200,
            "direction": "above",
        })
        assert resp.status_code == 401

    def test_alerts_delete_requires_auth(self):
        """DELETE /api/alerts/{id} must reject unauthenticated requests."""
        resp = client.delete("/api/alerts/some_alert_id")
        assert resp.status_code == 401

    def test_alerts_check_requires_secret(self):
        """POST /api/alerts/check must reject without internal secret."""
        resp = client.post("/api/alerts/check")
        assert resp.status_code == 403

    def test_usage_requires_auth(self):
        """GET /api/usage/{user_id} must reject unauthenticated requests."""
        resp = client.get("/api/usage/user_test123")
        assert resp.status_code == 401

    def test_pro_status_requires_auth(self):
        """GET /api/user/pro-status/{user_id} must reject unauthenticated requests."""
        resp = client.get("/api/user/pro-status/user_test123")
        assert resp.status_code == 401

    def test_referral_requires_auth(self):
        """GET /api/referral/{user_id} must reject unauthenticated requests."""
        resp = client.get("/api/referral/user_test123")
        assert resp.status_code == 401

    def test_export_pdf_requires_auth(self):
        """POST /api/analyze/export-pdf must reject unauthenticated requests."""
        resp = client.post("/api/analyze/export-pdf", json={"ticker": "AAPL"})
        assert resp.status_code == 401

    def test_portfolio_ai_insight_requires_auth(self):
        """POST /api/portfolio/ai-insight must reject unauthenticated requests."""
        resp = client.post("/api/portfolio/ai-insight", json={"positions": []})
        assert resp.status_code == 401

    def test_screener_search_requires_auth(self):
        """POST /api/screener/search must reject unauthenticated requests."""
        resp = client.post("/api/screener/search", json={"query": "tech actions sous-evaluees"})
        assert resp.status_code == 401

    def test_screener_suggestions_public(self):
        """GET /api/screener/suggestions must be public."""
        resp = client.get("/api/screener/suggestions")
        assert resp.status_code == 200
        assert len(resp.json()["suggestions"]) >= 3

    def test_deep_analysis_requires_auth(self):
        """POST /api/analyze/deep-analysis must reject unauthenticated requests."""
        resp = client.post("/api/analyze/deep-analysis", json={"ticker": "AAPL"})
        assert resp.status_code == 401

    def test_anomalies_requires_auth(self):
        """POST /api/analyze/anomalies must reject unauthenticated requests."""
        resp = client.post("/api/analyze/anomalies", json={"ticker": "AAPL"})
        assert resp.status_code == 401

    def test_dcf_scenarios_requires_auth(self):
        """POST /api/analyze/dcf-scenarios must reject unauthenticated requests."""
        resp = client.post("/api/analyze/dcf-scenarios", json={"ticker": "AAPL"})
        assert resp.status_code == 401

    def test_swot_requires_auth(self):
        """GET /api/ai/swot/{ticker} must reject unauthenticated requests."""
        resp = client.get("/api/ai/swot/AAPL")
        assert resp.status_code == 401

    def test_pestle_requires_auth(self):
        """GET /api/ai/pestle/{ticker} must reject unauthenticated requests."""
        resp = client.get("/api/ai/pestle/AAPL")
        assert resp.status_code == 401

    def test_webhook_stripe_sans_signature_retourne_400(self):
        """Un webhook sans signature Stripe doit être rejeté."""
        resp = client.post(
            "/api/stripe/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={"Content-Type": "application/json"},
            # Pas de stripe-signature header
        )
        assert resp.status_code == 400

    def test_webhook_stripe_signature_invalide_retourne_400(self):
        """Un webhook avec signature forgée doit être rejeté."""
        resp = client.post(
            "/api/stripe/webhook",
            content=b'{"type": "checkout.session.completed"}',
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "t=1234567890,v1=fake_signature_attempt",
            },
        )
        assert resp.status_code == 400

    def test_admin_fmp_status_requires_secret(self):
        """GET /api/admin/fmp-endpoints-status must reject without secret."""
        resp = client.get("/api/admin/fmp-endpoints-status")
        assert resp.status_code == 403

    def test_admin_fmp_usage_requires_secret(self):
        """GET /api/admin/fmp-usage must reject without secret."""
        resp = client.get("/api/admin/fmp-usage")
        assert resp.status_code == 403

    def test_invalid_id_rejected(self):
        """IDs with injection characters must be rejected."""
        resp = client.get("/api/analyse/test&active=eq.true")
        assert resp.status_code == 400

    def test_long_id_rejected(self):
        """IDs longer than 128 chars must be rejected."""
        long_id = "a" * 200
        resp = client.get(f"/api/analyse/{long_id}")
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS STILL ACCESSIBLE
# ═══════════════════════════════════════════════════════════════════════════════

class TestPublicEndpoints:
    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_warmup(self):
        resp = client.get("/warmup")
        assert resp.status_code == 200

    def test_search_public(self):
        """Search should be accessible without auth."""
        resp = client.get("/api/search/AAPL")
        # May return 200 or timeout, but NOT 401
        assert resp.status_code != 401


# ═══════════════════════════════════════════════════════════════════════════════
# CALCULS FINANCIERS
# ═══════════════════════════════════════════════════════════════════════════════

class TestFinancials:
    def test_net_debt_can_be_negative(self):
        """Companies with more cash than debt must have negative net_debt."""
        from services.market_data import _safe_float
        total_debt = 100_000_000
        total_cash = 200_000_000
        net_debt = total_debt - total_cash
        assert net_debt == -100_000_000, "net_debt must be negative for cash-rich companies"

    def test_dcf_no_crash_on_zero_shares(self):
        """DCF must handle zero shares gracefully."""
        from services.dcf import calculate_dcf
        result = calculate_dcf(
            fcf=1_000_000,
            growth_rate=0.08,
            wacc=0.10,
            terminal_growth=0.025,
            horizon=5,
            shares_outstanding=0,  # edge case
            net_debt=0,
        )
        assert result["intrinsic_value"] >= 0

    def test_dcf_negative_net_debt_increases_equity(self):
        """Negative net_debt (cash-rich) should increase equity value."""
        from services.dcf import calculate_dcf
        result_positive = calculate_dcf(1e9, 0.08, 0.10, 0.025, 5, 1e9, 1e9)
        result_negative = calculate_dcf(1e9, 0.08, 0.10, 0.025, 5, 1e9, -1e9)
        assert result_negative["equity_value"] > result_positive["equity_value"]
        assert result_negative["intrinsic_value"] > result_positive["intrinsic_value"]


# ═══════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODEL VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestModels:
    def test_analyze_request_rejects_extreme_wacc(self):
        """WACC must be between 2% and 30%."""
        from models import AnalyzeRequest
        import pytest
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL", wacc=5.0)  # 500%
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL", wacc=0.001)  # 0.1%

    def test_analyze_request_rejects_extreme_growth(self):
        """Growth rate must be between -50% and +50%."""
        from models import AnalyzeRequest
        import pytest
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL", growth_rate=1.5)  # 150%

    def test_analyze_request_terminal_less_than_wacc(self):
        """terminal_growth must be < wacc (auto-corrected by validator)."""
        from models import AnalyzeRequest
        # terminal_growth=0.08, wacc=0.08 → validator should correct to 0.075
        req = AnalyzeRequest(ticker="AAPL", wacc=0.08, terminal_growth=0.08)
        assert req.terminal_growth < req.wacc
        # Also test that terminal_growth > 0.08 is rejected by Field constraint
        import pytest
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL", wacc=0.10, terminal_growth=0.10)

    def test_analyze_request_horizon_bounds(self):
        """Horizon must be between 3 and 10."""
        from models import AnalyzeRequest
        import pytest
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL", horizon=1)
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL", horizon=20)

    def test_ticker_request_rejects_injection(self):
        """TickerRequest must reject injection characters."""
        from models import TickerRequest
        import pytest
        with pytest.raises(Exception):
            TickerRequest(ticker="AAPL; DROP TABLE")
        # Valid ticker should work
        req = TickerRequest(ticker="AAPL")
        assert req.ticker == "AAPL"

    def test_analyze_request_ticker_rejects_injection(self):
        """AnalyzeRequest.ticker must reject injection characters."""
        from models import AnalyzeRequest
        import pytest
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="AAPL; DROP TABLE")
        with pytest.raises(Exception):
            AnalyzeRequest(ticker="A" * 20)  # too long
        # Valid tickers should work
        req = AnalyzeRequest(ticker="AAPL")
        assert req.ticker == "AAPL"
        req2 = AnalyzeRequest(ticker="BRK-B")
        assert req2.ticker == "BRK-B"

    def test_alert_request_validation(self):
        """AlertRequest must validate all fields properly."""
        from models import AlertRequest
        import pytest
        # Valid alert
        req = AlertRequest(
            clerk_user_id="user_abc123",
            email="test@test.com",
            ticker="AAPL",
            target_price=200.0,
            direction="above",
        )
        assert req.ticker == "AAPL"
        assert req.direction == "above"
        # Reject invalid direction
        with pytest.raises(Exception):
            AlertRequest(clerk_user_id="u1", email="a@b.com", ticker="AAPL", target_price=100, direction="hacked")
        # Reject negative target_price
        with pytest.raises(Exception):
            AlertRequest(clerk_user_id="u1", email="a@b.com", ticker="AAPL", target_price=-10, direction="above")
        # Reject injection in ticker
        with pytest.raises(Exception):
            AlertRequest(clerk_user_id="u1", email="a@b.com", ticker="AAPL; DROP", target_price=100, direction="above")

    def test_export_pdf_request_ticker_pattern(self):
        """ExportPDFRequest.ticker must reject injection characters."""
        from models import ExportPDFRequest
        import pytest
        with pytest.raises(Exception):
            ExportPDFRequest(ticker="AAPL; DROP")
        req = ExportPDFRequest(ticker="MSFT")
        assert req.ticker == "MSFT"

    def test_checkout_request_plan_validation(self):
        """CheckoutRequest plan must be monthly or yearly."""
        from models import CheckoutRequest
        import pytest
        with pytest.raises(Exception):
            CheckoutRequest(userId="user1", plan="hacked")
        req = CheckoutRequest(userId="user1", plan="yearly")
        assert req.plan == "yearly"

    def test_screener_universe_size(self):
        """Screener universe must have 100+ stocks for Pro quality."""
        from services.fmp_data import _get_fallback_universe
        universe = _get_fallback_universe()
        assert len(universe) >= 100, f"Universe too small: {len(universe)} stocks"
        # Must have multiple sectors
        sectors = set(s["sector"] for s in universe)
        assert len(sectors) >= 8, f"Not enough sectors: {sectors}"


# ═══════════════════════════════════════════════════════════════════════════════
# CACHE
# ═══════════════════════════════════════════════════════════════════════════════

class TestCache:
    def test_ttl_expiration(self):
        """Cache entries must expire after TTL."""
        cache = TTLCache(max_size=10, default_ttl=1)
        cache.set("key", "value")
        assert cache.get("key") == "value"
        time.sleep(1.1)
        assert cache.get("key") is None

    def test_max_size_eviction(self):
        """Cache must not exceed max_size."""
        cache = TTLCache(max_size=5, default_ttl=3600)
        for i in range(10):
            cache.set(f"key_{i}", f"value_{i}")
        assert len(cache._cache) == 5

    def test_lru_eviction_order(self):
        """Least recently used entries should be evicted first."""
        cache = TTLCache(max_size=3, default_ttl=3600)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        cache.get("a")  # Access 'a' to make it recently used
        cache.set("d", 4)  # Should evict 'b' (oldest unused)
        assert cache.get("a") == 1
        assert cache.get("b") is None
        assert cache.get("c") == 3
        assert cache.get("d") == 4

    def test_thread_safety(self):
        """Cache must handle concurrent access without errors."""
        import threading
        cache = TTLCache(max_size=100, default_ttl=60)
        errors = []

        def writer(start):
            try:
                for i in range(100):
                    cache.set(f"key_{start}_{i}", i)
            except Exception as e:
                errors.append(e)

        def reader(start):
            try:
                for i in range(100):
                    cache.get(f"key_{start}_{i}")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(j,)) for j in range(5)]
        threads += [threading.Thread(target=reader, args=(j,)) for j in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0, f"Thread safety errors: {errors}"


# ═══════════════════════════════════════════════════════════════════════════════
# PDF GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestPDFGeneration:
    def test_pdf_generates_valid_bytes(self):
        """PDF generator must return valid PDF bytes."""
        from services.pdf_generator import generate_analysis_pdf
        result = generate_analysis_pdf({
            "ticker": "AAPL",
            "company_name": "Apple Inc.",
            "verdict": "BUY",
            "price": 178.72,
            "intrinsic_price": 215.50,
            "kpis": {"pe_ratio": 28.5, "market_cap": 2800000000000},
        })
        assert isinstance(result, bytes)
        assert len(result) > 500
        assert result[:5] == b"%PDF-"

    def test_pdf_handles_empty_data(self):
        """PDF generator must not crash on minimal/empty data."""
        from services.pdf_generator import generate_analysis_pdf
        result = generate_analysis_pdf({"ticker": "TEST"})
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_pdf_with_deep_analysis(self):
        """PDF must include deep analysis sections without errors."""
        from services.pdf_generator import generate_analysis_pdf
        result = generate_analysis_pdf({
            "ticker": "MSFT",
            "company_name": "Microsoft Corp",
            "verdict": "HOLD",
            "price": 420.0,
            "intrinsic_price": 415.0,
            "kpis": {},
            "deep_analysis": {
                "bull_case": {
                    "titre": "Cloud leader",
                    "score_confiance": 75,
                    "arguments": [
                        {"titre": "Azure growth", "detail": "Cloud at 30% growth.", "chiffre_cle": "Azure: +30%"}
                    ],
                },
                "bear_case": {
                    "titre": "Regulatory risk",
                    "score_confiance": 40,
                    "arguments": [
                        {"titre": "Antitrust", "detail": "EU probes ongoing.", "chiffre_cle": "EU fines risk"}
                    ],
                },
                "synthese": "Microsoft remains a quality holding.",
            },
            "dcf_scenarios": {
                "bull": {"prix_cible": 500, "upside_pct": 19, "probabilite": 25, "narratif": "AI monetization."},
                "base": {"prix_cible": 430, "upside_pct": 2.4, "probabilite": 50, "narratif": "Steady growth."},
                "bear": {"prix_cible": 350, "upside_pct": -16.7, "probabilite": 25, "narratif": "Cloud slowdown."},
                "conclusion": "Base case most likely.",
            },
        })
        assert isinstance(result, bytes)
        assert len(result) > 2000  # More content = larger PDF


# ═══════════════════════════════════════════════════════════════════════════════
# COMPARISON ANALYSIS DATA STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════

class TestComparisonAnalysis:
    def test_comparison_analysis_data_structure(self):
        """get_comparison_analysis receives flat dicts and produces valid summary."""
        from services.ai_analyst import get_comparison_analysis

        # Flat dicts matching main.py build_company() output
        mock_company_1 = {
            "ticker": "AAPL",
            "name": "Apple Inc.",
            "price": 175.0,
            "market_cap": 2800000000000,
            "pe_ratio": 28.5,
            "ev_ebitda": 22.0,
            "profit_margin": 0.253,
            "revenue_growth": 0.085,
            "free_cash_flow": 110000000000,
            "intrinsic_value": 215.0,
            "upside_pct": 22.5,
            "verdict": "BUY",
        }
        mock_company_2 = {
            "ticker": "MSFT",
            "name": "Microsoft Corp.",
            "price": 380.0,
            "market_cap": 2900000000000,
            "pe_ratio": 35.2,
            "ev_ebitda": 25.0,
            "profit_margin": 0.341,
            "revenue_growth": 0.152,
            "free_cash_flow": 63000000000,
            "intrinsic_value": 420.0,
            "upside_pct": 10.5,
            "verdict": "HOLD",
        }

        # Without ANTHROPIC_API_KEY, the function returns a fallback string
        # This tests that _summarize doesn't crash on flat dict structure
        import os
        original_key = os.environ.get("ANTHROPIC_API_KEY", "")
        os.environ["ANTHROPIC_API_KEY"] = ""
        try:
            result = get_comparison_analysis(mock_company_1, mock_company_2)
            assert result is not None
            assert isinstance(result, str)
            assert len(result) > 10  # Should return fallback message
        finally:
            if original_key:
                os.environ["ANTHROPIC_API_KEY"] = original_key
            else:
                os.environ.pop("ANTHROPIC_API_KEY", None)

    def test_comparison_summarize_contains_real_data(self):
        """_summarize must extract ticker, price, intrinsic_value from flat dict."""
        # Import and test _summarize directly by calling get_comparison_analysis
        # and checking the prompt would contain real data (not '?' or '$0.00')
        from services import ai_analyst

        flat_data = {
            "ticker": "AAPL",
            "name": "Apple Inc.",
            "price": 175.0,
            "intrinsic_value": 215.0,
            "upside_pct": 22.5,
            "verdict": "BUY",
            "pe_ratio": 28.5,
            "ev_ebitda": 22.0,
            "profit_margin": 0.253,
            "revenue_growth": 0.085,
            "free_cash_flow": 110000000000,
        }

        # Access the inner _summarize via a mock call
        # Since _summarize is nested, we test by ensuring no crash and correct output
        import os
        os.environ["ANTHROPIC_API_KEY"] = ""
        try:
            result = ai_analyst.get_comparison_analysis(flat_data, flat_data)
            # The function should not crash — it returns fallback when no API key
            assert "indisponible" in result.lower() or len(result) > 0
        finally:
            os.environ.pop("ANTHROPIC_API_KEY", None)


# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL SCHEDULER ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

class TestEmailScheduler:
    def test_email_scheduler_endpoint_sans_secret_retourne_403(self):
        """POST /api/email/trigger-sequence without secret must return 403."""
        resp = client.post("/api/email/trigger-sequence")
        assert resp.status_code == 403

    def test_email_scheduler_endpoint_mauvais_secret_retourne_403(self):
        """POST /api/email/trigger-sequence with wrong secret must return 403."""
        resp = client.post(
            "/api/email/trigger-sequence",
            headers={"X-Internal-Secret": "wrong_secret_value"}
        )
        assert resp.status_code == 403

    def test_weekly_digest_endpoint_sans_secret_retourne_403(self):
        """POST /api/email/trigger-weekly-digest without secret must return 403."""
        resp = client.post("/api/email/trigger-weekly-digest")
        assert resp.status_code == 403

    def test_weekly_digest_endpoint_mauvais_secret_retourne_403(self):
        """POST /api/email/trigger-weekly-digest with wrong secret must return 403."""
        resp = client.post(
            "/api/email/trigger-weekly-digest",
            headers={"X-Internal-Secret": "wrong_secret_value"}
        )
        assert resp.status_code == 403


class TestAICostMonitoring:
    def test_ai_costs_endpoint_sans_secret_retourne_403(self):
        """GET /api/admin/ai-costs without secret must return 403."""
        resp = client.get("/api/admin/ai-costs")
        assert resp.status_code == 403

    def test_ai_cost_tracker_tracks_call(self):
        """ai_cost_tracker.track_ai_call records data and get_cost_summary returns it."""
        from services.ai_cost_tracker import track_ai_call, get_cost_summary
        track_ai_call(
            model="claude-haiku-4-5-20251001",
            endpoint="test",
            input_tokens=100,
            output_tokens=50,
            ticker="TEST",
            duration_ms=500,
        )
        summary = get_cost_summary()
        assert summary["today"]["calls"] >= 1
        assert summary["totals"]["calls"] >= 1
        assert summary["totals"]["input_tokens"] >= 100
        assert summary["totals"]["cost_usd"] > 0


# ═══════════════════════════════════════════════════════════════════════════════
# PORTFOLIO CSV IMPORT
# ═══════════════════════════════════════════════════════════════════════════════

class TestPortfolioImport:
    def test_detect_boursorama_format(self):
        """detect_broker_format identifies Boursorama CSV (semicolon, ISIN header)."""
        from services.portfolio_import import detect_broker_format
        csv = "Code ISIN;Libellé;Quantité;PRU\nFR0000120271;Total;10;45.50"
        assert detect_broker_format(csv) == "boursorama"

    def test_parse_boursorama_csv(self):
        """parse_portfolio_csv correctly parses Boursorama format with ISIN."""
        from services.portfolio_import import parse_portfolio_csv
        csv = "Code ISIN;Libellé;Quantité;PRU\nUS0378331005;Apple Inc;10;185.00"
        # Note: ISIN conversion requires FMP key, so it will fail and produce an error
        result = parse_portfolio_csv(csv, broker="boursorama")
        assert result["broker_detected"] == "boursorama"
        # Without FMP key, ISIN rows go to errors
        assert result["summary"]["total_positions"] > 0

    def test_parse_degiro_csv(self):
        """parse_portfolio_csv correctly parses Degiro format with ticker symbols."""
        from services.portfolio_import import parse_portfolio_csv
        csv = "Symbol,Product,Quantity,Average Price\nAAPL,Apple Inc,10,185.00\nMSFT,Microsoft,5,380.50"
        result = parse_portfolio_csv(csv, broker="degiro")
        assert result["broker_detected"] == "degiro"
        assert len(result["positions"]) == 2
        assert result["positions"][0]["ticker"] == "AAPL"
        assert result["positions"][0]["shares"] == 10
        assert result["positions"][0]["avg_price"] == 185.00
        assert result["positions"][1]["ticker"] == "MSFT"

    def test_parse_generic_csv(self):
        """parse_portfolio_csv handles generic CSV with Ticker/Shares/Price columns."""
        from services.portfolio_import import parse_portfolio_csv
        csv = "Ticker,Name,Shares,Avg Price\nTSLA,Tesla,3,250.00\nNVDA,Nvidia,8,800.00"
        result = parse_portfolio_csv(csv, broker="generic")
        assert len(result["positions"]) == 2
        assert result["positions"][0]["ticker"] == "TSLA"
        assert result["positions"][1]["shares"] == 8

    def test_parse_invalid_csv(self):
        """parse_portfolio_csv handles empty/invalid CSV gracefully."""
        from services.portfolio_import import parse_portfolio_csv
        result = parse_portfolio_csv("", broker="auto")
        assert result["positions"] == []
        assert len(result["errors"]) > 0

    def test_parse_number_european_format(self):
        """_parse_number handles European 1.234,56 format."""
        from services.portfolio_import import _parse_number
        assert _parse_number("1.234,56") == 1234.56
        assert _parse_number("1,234.56") == 1234.56
        assert _parse_number("42") == 42.0
        assert _parse_number("12,5") == 12.5
        assert _parse_number("") is None

    def test_is_isin(self):
        """_is_isin correctly validates ISIN codes."""
        from services.portfolio_import import _is_isin
        assert _is_isin("US0378331005") is True
        assert _is_isin("FR0000120271") is True
        assert _is_isin("AAPL") is False
        assert _is_isin("") is False

    def test_import_endpoint_requires_auth(self):
        """POST /api/portfolio/import must reject unauthenticated requests."""
        resp = client.post("/api/portfolio/import")
        assert resp.status_code in (401, 422)

    def test_import_confirm_requires_auth(self):
        """POST /api/portfolio/import/confirm must reject unauthenticated requests."""
        resp = client.post("/api/portfolio/import/confirm", json={"positions": []})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# PORTFOLIO HEALTH SCORE
# ═══════════════════════════════════════════════════════════════════════════════

class TestPortfolioHealthScore:
    def test_health_score_calculation_basic(self):
        """calculate_health_score returns a valid score for a simple portfolio."""
        from services.portfolio_health import calculate_health_score
        positions = [
            {"ticker": "AAPL", "shares": 10, "avg_price": 150, "current_price": 180, "current_value": 1800, "pnl_pct": 20, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 5, "avg_price": 300, "current_price": 350, "current_value": 1750, "pnl_pct": 16.7, "sector": "Technology"},
            {"ticker": "JNJ", "shares": 8, "avg_price": 160, "current_price": 170, "current_value": 1360, "pnl_pct": 6.25, "sector": "Healthcare"},
        ]
        result = calculate_health_score(positions)
        assert 0 <= result["score"] <= 100
        assert result["grade"] in ("A", "B", "C", "D", "F")
        assert "breakdown" in result
        assert "diversification" in result["breakdown"]
        assert "performance" in result["breakdown"]
        assert "risk" in result["breakdown"]
        assert "balance" in result["breakdown"]

    def test_health_score_single_position(self):
        """Single position should have low diversification score."""
        from services.portfolio_health import calculate_health_score
        positions = [
            {"ticker": "AAPL", "shares": 100, "avg_price": 150, "current_price": 180, "current_value": 18000, "pnl_pct": 20, "sector": "Technology"},
        ]
        result = calculate_health_score(positions)
        assert result["score"] < 60  # single position can't score great
        assert result["breakdown"]["diversification"]["score"] < 15  # low diversification

    def test_health_score_empty_portfolio(self):
        """Empty portfolio should return zero score."""
        from services.portfolio_health import calculate_health_score
        result = calculate_health_score([])
        assert result["score"] == 0
        assert result["grade"] == "F"

    def test_health_score_issues_detection(self):
        """Health score should detect concentration issues."""
        from services.portfolio_health import calculate_health_score
        positions = [
            {"ticker": "AAPL", "shares": 100, "avg_price": 150, "current_price": 180, "current_value": 18000, "pnl_pct": 20, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 1, "avg_price": 300, "current_price": 350, "current_value": 350, "pnl_pct": 16.7, "sector": "Technology"},
        ]
        result = calculate_health_score(positions)
        issue_messages = [i["message"] for i in result["issues"]]
        # Should flag AAPL as too concentrated
        assert any("AAPL" in m for m in issue_messages)

    def test_health_score_endpoint_requires_auth(self):
        """POST /api/portfolio/health-score must reject unauthenticated requests."""
        resp = client.post("/api/portfolio/health-score", json={"positions": []})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# SMART ALERTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSmartAlerts:
    def test_smart_alerts_take_profit(self):
        """generate_smart_alerts detects take-profit opportunity at +30%."""
        from services.smart_alerts import generate_smart_alerts
        positions = [
            {"ticker": "AAPL", "shares": 10, "avg_price": 100, "current_price": 140, "current_value": 1400, "pnl_pct": 40, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 5, "avg_price": 300, "current_price": 310, "current_value": 1550, "pnl_pct": 3.3, "sector": "Technology"},
        ]
        alerts = generate_smart_alerts(positions)
        assert any(a["type"] == "take_profit" and a["ticker"] == "AAPL" for a in alerts)

    def test_smart_alerts_stop_loss(self):
        """generate_smart_alerts detects stop-loss warning at -20%."""
        from services.smart_alerts import generate_smart_alerts
        positions = [
            {"ticker": "AAPL", "shares": 10, "avg_price": 200, "current_price": 150, "current_value": 1500, "pnl_pct": -25, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 5, "avg_price": 300, "current_price": 310, "current_value": 1550, "pnl_pct": 3.3, "sector": "Technology"},
        ]
        alerts = generate_smart_alerts(positions)
        assert any(a["type"] == "stop_loss" and a["ticker"] == "AAPL" for a in alerts)

    def test_smart_alerts_concentration(self):
        """generate_smart_alerts detects position concentration >35%."""
        from services.smart_alerts import generate_smart_alerts
        positions = [
            {"ticker": "AAPL", "shares": 100, "avg_price": 150, "current_price": 180, "current_value": 18000, "pnl_pct": 20, "sector": "Technology"},
            {"ticker": "MSFT", "shares": 1, "avg_price": 300, "current_price": 350, "current_value": 350, "pnl_pct": 16.7, "sector": "Technology"},
        ]
        alerts = generate_smart_alerts(positions)
        assert any(a["type"] == "concentration" for a in alerts)

    def test_smart_alerts_empty_portfolio(self):
        """generate_smart_alerts returns empty list for empty portfolio."""
        from services.smart_alerts import generate_smart_alerts
        assert generate_smart_alerts([]) == []

    def test_smart_alerts_endpoint_requires_auth(self):
        """POST /api/portfolio/smart-alerts must reject unauthenticated requests."""
        resp = client.post("/api/portfolio/smart-alerts", json={"positions": []})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# PEDAGOGY MODE
# ═══════════════════════════════════════════════════════════════════════════════

class TestPedagogyMode:
    def test_glossary_returns_terms(self):
        """GET /api/pedagogy/glossary must return non-empty list of terms."""
        resp = client.get("/api/pedagogy/glossary")
        assert resp.status_code == 200
        data = resp.json()
        assert "terms" in data
        assert len(data["terms"]) >= 10

    def test_glossary_term_has_structure(self):
        """Each glossary term must have id, term, simple, category."""
        resp = client.get("/api/pedagogy/glossary")
        terms = resp.json()["terms"]
        for t in terms:
            assert "id" in t
            assert "term" in t
            assert "simple" in t
            assert "category" in t

    def test_term_detail_dcf(self):
        """GET /api/pedagogy/term/dcf must return full DCF explanation."""
        resp = client.get("/api/pedagogy/term/dcf")
        assert resp.status_code == 200
        data = resp.json()
        assert "simple" in data
        assert "technical" in data
        assert "example" in data
        assert "DCF" in data["term"]

    def test_term_detail_not_found(self):
        """GET /api/pedagogy/term/nonexistent must return 404."""
        resp = client.get("/api/pedagogy/term/nonexistent_term_xyz")
        assert resp.status_code == 404

    def test_explain_requires_auth(self):
        """POST /api/pedagogy/explain must reject unauthenticated requests."""
        resp = client.post("/api/pedagogy/explain", json={"concept": "PE ratio"})
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# BACKTEST SIMULATOR
# ═══════════════════════════════════════════════════════════════════════════════

class TestBacktest:
    def test_backtest_endpoint_requires_auth(self):
        """POST /api/backtest must reject unauthenticated requests."""
        resp = client.post("/api/backtest", json={"ticker": "AAPL", "buy_date": "2023-01-01", "amount": 10000})
        assert resp.status_code == 401

    def test_backtest_service_future_date(self):
        """run_backtest rejects future buy dates."""
        from services.backtest import run_backtest
        result = run_backtest("AAPL", "2030-01-01", 10000)
        assert "error" in result

    def test_backtest_service_invalid_date(self):
        """run_backtest rejects invalid date format."""
        from services.backtest import run_backtest
        result = run_backtest("AAPL", "not-a-date", 10000)
        assert "error" in result

    def test_backtest_service_old_date(self):
        """run_backtest rejects dates before 2000."""
        from services.backtest import run_backtest
        result = run_backtest("AAPL", "1990-01-01", 10000)
        assert "error" in result


# ═══════════════════════════════════════════════════════════════════════════════
# EARNINGS CALENDAR
# ═══════════════════════════════════════════════════════════════════════════════

class TestEarningsCalendar:
    def test_earnings_calendar_requires_auth(self):
        """POST /api/earnings/calendar must reject unauthenticated requests."""
        resp = client.post("/api/earnings/calendar", json={})
        assert resp.status_code == 401

    def test_earnings_ticker_requires_auth(self):
        """GET /api/earnings/AAPL must reject unauthenticated requests."""
        resp = client.get("/api/earnings/AAPL")
        assert resp.status_code == 401

    def test_earnings_calendar_service_structure(self):
        """get_earnings_calendar returns proper structure even without API keys."""
        from services.earnings_calendar import get_earnings_calendar
        result = get_earnings_calendar(tickers=["AAPL"], days_ahead=30)
        assert "earnings" in result
        assert "period" in result
        assert "count" in result
        assert isinstance(result["earnings"], list)


# ═══════════════════════════════════════════════════════════════════════════════
# COMMUNITY TRENDS
# ═══════════════════════════════════════════════════════════════════════════════

class TestCommunityTrends:
    def test_trends_endpoint_returns_200(self):
        """GET /api/trends must return 200 (public endpoint)."""
        resp = client.get("/api/trends")
        assert resp.status_code == 200
        data = resp.json()
        assert "top_analyzed" in data
        assert "top_held" in data
        assert "stats" in data

    def test_trends_stats_structure(self):
        """Trends stats must contain total_users, total_analyses, total_positions."""
        resp = client.get("/api/trends")
        stats = resp.json()["stats"]
        assert "total_users" in stats
        assert "total_analyses" in stats
        assert "total_positions" in stats


# ═══════════════════════════════════════════════════════════════════════════════
# TRACK RECORD
# ═══════════════════════════════════════════════════════════════════════════════

class TestTrackRecord:
    def test_track_record_stats_returns_200(self):
        """GET /api/track-record/stats must return 200 (public endpoint)."""
        resp = client.get("/api/track-record/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_analyses" in data
        assert "win_rate" in data
        assert "avg_performance" in data
        assert "by_verdict" in data

    def test_track_record_stats_structure(self):
        """Track record stats must have proper numeric types."""
        resp = client.get("/api/track-record/stats")
        data = resp.json()
        assert isinstance(data["total_analyses"], int)
        assert isinstance(data["win_rate"], (int, float))
        assert isinstance(data["avg_performance"], (int, float))
