test-unit:
	cd backend && python3 -m pytest tests/test_critical.py -v

test-integration:
	cd backend && python3 -m pytest tests/test_integration.py -v --timeout=60

test-all:
	cd backend && python3 -m pytest tests/ -v --timeout=60

build:
	cd frontend && npm run build
