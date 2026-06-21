# Makefile for running the project

.PHONY: help install dev preview stop build build-production clean clean-build android android-install format format-check setup-hooks sandbox-up

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
	@echo "  make format           - Format source files with Prettier (writes in-place)"
	@echo "  make format-check     - Check formatting without writing (CI-friendly)"
	@echo "  make setup-hooks      - Install Git hooks (run once after cloning)"
	@echo "  make sandbox-up       - Bring up the local DB and Server using docker-compose"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@cd ui && npm install

# Build the project
build: install
	@echo "Building the project..."
	@cd ui && npm run build

# Build for production (alias)
build-production: build

# Clean build artifacts
clean-build:
	@echo "Cleaning build artifacts..."
	@cd ui && rm -rf dist

# Clean everything (build artifacts and node_modules)
clean: clean-build
	@echo "Cleaning dependencies..."
	@cd ui && rm -rf node_modules
	@cd ui && rm -f package-lock.json

# Run development server with hot reload
dev: install
	@echo "Starting development server on http://localhost:3000..."
	@cd ui && npm run dev

# Preview production build
preview:
	@echo "Starting preview server on http://localhost:3000..."
	@echo "Note: You need to build the project first (use Makefile.build)"
	@cd ui && npm run preview

# Stop running servers (kills processes on port 3000)
stop:
	@echo "Stopping servers on port 3000..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No process found on port 3000"

# Mobile targets
android-install:
	@echo "Installing mobile dependencies..."
	@cd apps/android && npm install

android: android-install
	@echo "Syncing app configuration..."
	@cd apps/android && npx expo prebuild --platform android
	@echo "Starting Android build/run process..."
	@cd apps/android && npm run android

init-test:
	@if [ ! -f ui/test.env ]; then \
		printf "username=test\npassword=test\nAPI_URL=http://localhost:8000\n" > ui/test.env; \
	fi

test: init-test
	@cd ui && npx playwright test --headed
	@cd ui && npx playwright show-report

test-e2e: init-test
	@cd ui && npm run test:e2e
	@cd ui && npx playwright show-report

test-ui: init-test
	@cd ui && npx playwright test --ui
	@cd ui && npx playwright show-report

db-dump:
	@: $${DB_PASSWORD:?DB_PASSWORD environment variable is not set. Set it via \'export DB_PASSWORD=<your-password>\'}
	@: $${PROJECT_ID:?PROJECT_ID environment variable is not set. Set it via \'export PROJECT_ID=<your-project-id>\'}
	@pg_dump \
		--schema-only \
		--no-owner \
		--no-privileges \
		--quote-all-identifiers \
		"postgresql://postgres:$$DB_PASSWORD@db.$$PROJECT_ID.supabase.co:5432/postgres" \
		> data-model.sql
	@pg_dump \
		--format=custom \
		--blobs \
		--verbose \
		"postgresql://postgres:$$DB_PASSWORD@db.$$PROJECT_ID.supabase.co:5432/postgres" \
		-f full-database.dump

# Format source files with Prettier
format:
	@echo "Formatting source files with Prettier..."
	@cd ui && npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,html,json}" "index.html" "*.json" --ignore-path .gitignore

# Check formatting without writing (useful in CI)
format-check:
	@echo "Checking formatting with Prettier..."
	@cd ui && npx prettier --check "src/**/*.{js,jsx,ts,tsx,css,html,json}" "index.html" "*.json" --ignore-path .gitignore

# Install Git hooks from scripts/hooks into .git/hooks
setup-hooks:
	@echo "Installing Git hooks..."
	cp ui/scripts/hooks/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "Git hooks installed. 'make format' will run on every commit."

sandbox-up: build
	@echo "Bringing up the sandbox (DB + API Server)..."
	docker-compose down --volumes --remove-orphans
	docker-compose up --force-recreate -d --build
