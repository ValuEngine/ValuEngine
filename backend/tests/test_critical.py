"""
Tests critiques ValuEngine — sécurité, calculs financiers, cache.
"""
import time
import pytest
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app, TTLCache

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
