# Makefile for running the project

ifeq ($(OS),Windows_NT)
    PYTHON ?= $(if $(wildcard .venv/Scripts/python.exe),.venv/Scripts/python.exe,python)
    PIP ?= $(if $(wildcard .venv/Scripts/pip.exe),.venv/Scripts/pip.exe,pip)
else
    PYTHON ?= $(if $(wildcard .venv/bin/python),.venv/bin/python,python3)
    PIP ?= $(if $(wildcard .venv/bin/pip),.venv/bin/pip,pip3)
endif

.PHONY: help install dev preview stop build build-production clean clean-build android android-install format format-check setup-hooks docker-build docker-run init-test test test-e2e test-ui

# Default target
help:
	@echo "Available targets:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Run development server (http://localhost:3000)"
	@echo "  make preview          - Preview production build (http://localhost:3000)"
	@echo "  make stop             - Stop any running dev servers"
	@echo "  make build            - Build the project for production"
	@echo "  make build-production - Build with optimizations (alias for build)"
	@echo "  make clean            - Remove build artifacts and dependencies"
	@echo "  make clean-build      - Remove only build artifacts"
	@echo "  make test             - Run E2E tests (headed) via Python Playwright"
	@echo "  make test-e2e         - Run E2E tests (headless) via Python Playwright"
	@echo "  make test-ui          - Run E2E tests (UI/trace mode) via Python Playwright"
	@echo "  make docker-build     - Build Docker image (easy-lims:latest)"
	@echo "  make docker-run       - Build & run Docker container"
	@echo "  make format           - Format source files with Prettier (writes in-place)"
	@echo "  make format-check     - Check formatting without writing (CI-friendly)"
	@echo "  make setup-hooks      - Install Git hooks (run once after cloning)"

# Install dependencies
install:
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing UI dependencies in ui/..."
	cd ui && npm install

# Build the project (compiles React UI and copies dist to server/dist)
build: install
	@echo "Building UI frontend in ui/..."
	cd ui && npm run build
	@echo "Copying UI dist to server/dist..."
	node -e "const fs=require('fs'); fs.mkdirSync('server/dist', {recursive: true}); fs.cpSync('ui/dist', 'server/dist', {recursive: true});"

# Build for production (alias)
build-production: build

# Clean build artifacts
clean-build:
	@echo "Cleaning build artifacts..."
	rm -rf ui/dist server/dist

# Clean everything (build artifacts and node_modules)
clean: clean-build
	@echo "Cleaning dependencies..."
	rm -rf ui/node_modules node_modules

# Run development server with hot reload (Python FastAPI server on port 8000)
dev: build
	@echo "Installing python dependencies..."
	pip3 install --break-system-packages -r server/requirements.txt uvicorn || pip install -r server/requirements.txt uvicorn
	@echo "Starting FastAPI server on http://0.0.0.0:8000..."
	cd server && python3 -m uvicorn main:app --host 0.0.0.0 --reload --port 8000

# Preview production build
preview: build
	@echo "Installing python dependencies..."
	pip3 install --break-system-packages -r server/requirements.txt uvicorn || pip install -r server/requirements.txt uvicorn
	@echo "Starting production server on http://0.0.0.0:8000..."
	cd server && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# Stop running servers (kills processes on port 8000)
stop:
	@echo "Stopping servers on port 8000..."
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "No process found on port 8000"

# Docker targets
docker-build:
	@echo "Building Docker image easy-lims:latest..."
	docker build -t easy-lims:latest .

docker-run: docker-build
	@echo "Running Docker container easy-lims:latest on port 8000..."
	node -e "const fs=require('fs'); if (!fs.existsSync('server/.env')) fs.writeFileSync('server/.env', '');"
	docker run -p 8000:8000 -e DATABASE_URL="$${DATABASE_URL}" --env-file server/.env easy-lims:latest

# Mobile targets
android-install:
	@echo "Installing mobile dependencies..."
	@cd mobile-apps/android && npm install

android: android-install
	@echo "Syncing app configuration..."
	@cd mobile-apps/android && npx expo prebuild --platform android
	@echo "Starting Android build/run process..."
	@cd mobile-apps/android && npm run android


ENV_FILE ?= test.env

init-test:
	@$(PYTHON) -c "import os, sys; sys.exit(0) if os.path.exists('$(ENV_FILE)') else (print(f'[ERROR] \'$(ENV_FILE)\' file is missing. Please create \'$(ENV_FILE)\' using example file \'test.env.example\'.', file=sys.stderr), sys.exit(1))"
	@echo "Installing Python test dependencies..."
	@$(PIP) install -r tests/requirements.txt
	@echo "Installing Playwright browser binaries..."
	@$(PYTHON) -m playwright install chromium

test: init-test
	@$(PYTHON) tests/run_tests.py --headed --env-file $(ENV_FILE)

test-e2e: init-test
	@$(PYTHON) tests/run_tests.py --e2e --env-file $(ENV_FILE)

test-ui: init-test
	@$(PYTHON) tests/run_tests.py --ui --env-file $(ENV_FILE)


db-dump:
	@: $${DB_PASSWORD:?DB_PASSWORD environment variable is not set. Set it via \'export DB_PASSWORD=<your-password>\'}
	@: $${PROJECT_ID:?PROJECT_ID environment variable is not set. Set it via \'export PROJECT_ID=<your-project-id>\'}
# 	@pg_dump \
# 		--format=plain \
# 		--blobs \
# 		--no-owner \
# 		--no-privileges \
# 		"postgresql://postgres:$$DB_PASSWORD@db.$$PROJECT_ID.apiClient.co:5432/postgres" \
# 		> data-model.sql
	@pg_dump \
		--schema-only \
		--no-owner \
		--no-privileges \
		--quote-all-identifiers \
		"postgresql://postgres:$$DB_PASSWORD@db.$$PROJECT_ID.apiClient.co:5432/postgres" \
		> data-model.sql
	@pg_dump \
		--format=custom \
		--blobs \
		--verbose \
		"postgresql://postgres:$$DB_PASSWORD@db.$$PROJECT_ID.apiClient.co:5432/postgres" \
		-f full-database.dump

# Format source files with Prettier
format:
	@echo "Formatting source files with Prettier..."
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,html,json}" "index.html" "*.json" --ignore-path .gitignore

# Check formatting without writing (useful in CI)
format-check:
	@echo "Checking formatting with Prettier..."
	npx prettier --check "src/**/*.{js,jsx,ts,tsx,css,html,json}" "index.html" "*.json" --ignore-path .gitignore

# Install Git hooks from scripts/hooks into .git/hooks
setup-hooks:
	@echo "Installing Git hooks..."
	cp scripts/hooks/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "Git hooks installed. 'make format' will run on every commit."
