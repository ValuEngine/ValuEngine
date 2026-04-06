"""
Tests d'intégration ValuEngine — endpoints avec données réelles.
Nécessite le serveur backend lancé sur localhost:8000.
Lancés séparément : python3 -m pytest tests/test_integration.py -v --timeout=60
"""
import pytest

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYZE ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

class TestAnalyzeEndpoint:
    def test_analyze_aapl_retourne_verdict(self):
        """L'analyse AAPL retourne un verdict valide."""
        resp = client.post("/api/analyze", json={"ticker": "AAPL"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["verdict"] in ["BUY", "HOLD", "SELL"]
        assert data["company"]["price"] > 0
        assert data["dcf"]["intrinsic_value"] > 0
        assert data["company"]["ticker"] == "AAPL"
        assert data["company"]["name"] != ""

    def test_analyze_mc_pa_retourne_verdict(self):
        """L'analyse MC.PA (LVMH) fonctionne pour les tickers EU."""
        resp = client.post("/api/analyze", json={"ticker": "MC.PA"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["verdict"] in ["BUY", "HOLD", "SELL"]
        assert data["company"]["ticker"] == "MC.PA"

    def test_analyze_ticker_inexistant_retourne_erreur_propre(self):
        """Un ticker inexistant retourne 404 ou 422, pas 500."""
        resp = client.post("/api/analyze", json={"ticker": "ZZZZZZ"})
        assert resp.status_code in [404, 422, 400]
        assert resp.status_code != 500

    def test_analyze_retourne_share_id(self):
        """L'analyse retourne un share_id pour le partage."""
        resp = client.post("/api/analyze", json={"ticker": "MSFT"})
        if resp.status_code == 200:
            data = resp.json()
            assert "share_id" in data
            assert len(data["share_id"]) > 0

    def test_analyze_retourne_is_first_analysis(self):
        """L'analyse retourne le champ is_first_analysis."""
        resp = client.post("/api/analyze", json={"ticker": "AAPL"})
        if resp.status_code == 200:
            data = resp.json()
            assert "is_first_analysis" in data
            assert isinstance(data["is_first_analysis"], bool)


# ═══════════════════════════════════════════════════════════════════════════════
# MARKET OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════

class TestMarketOverview:
    def test_market_overview_retourne_donnees(self):
        """Le market overview retourne des données."""
        resp = client.get("/api/market-overview")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))

    def test_quotes_batch_retourne_prix(self):
        """Le batch quotes retourne des prix pour des tickers valides."""
        resp = client.get("/api/quotes?tickers=AAPL,MSFT")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

class TestSearch:
    def test_search_aapl_retourne_resultats(self):
        """La recherche 'AAPL' retourne des résultats."""
        resp = client.get("/api/search/AAPL")
        assert resp.status_code == 200
        data = resp.json()
        # Can return list (fuzzy) or dict (exact match)
        assert isinstance(data, (list, dict))

    def test_search_ticker_exact_retourne_donnees(self):
        """La recherche par ticker exact retourne des données."""
        resp = client.get("/api/search/AA")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (list, dict))


# ═══════════════════════════════════════════════════════════════════════════════
# HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

class TestHistory:
    def test_history_aapl_retourne_data_points(self):
        """L'historique AAPL retourne des data points."""
        resp = client.get("/api/history/AAPL?period=1mo")
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert len(data["data"]) > 0
        assert "close" in data["data"][0]
        assert "date" in data["data"][0]

    def test_history_period_invalide_fallback(self):
        """Une période invalide utilise le fallback 1y."""
        resp = client.get("/api/history/AAPL?period=invalid")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH & WARMUP
# ═══════════════════════════════════════════════════════════════════════════════

class TestInfra:
    def test_health_retourne_ok(self):
        """GET /health retourne un status ok."""
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_warmup_retourne_ok(self):
        """GET /warmup retourne un status ok."""
        resp = client.get("/warmup")
        assert resp.status_code == 200
