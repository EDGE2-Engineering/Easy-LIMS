# Makefile for running the project

.PHONY: help install dev preview stop build build-production clean clean-build android android-install

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

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Build the project
build: install
	@echo "Building the project..."
	npm run build

# Build for production (alias)
build-production: build

# Clean build artifacts
clean-build:
	@echo "Cleaning build artifacts..."
	rm -rf dist

# Clean everything (build artifacts and node_modules)
clean: clean-build
	@echo "Cleaning dependencies..."
	rm -rf node_modules
	rm -f package-lock.json

# Run development server with hot reload
dev: install
	@echo "Starting development server on http://localhost:3000..."
	npm run dev

# Preview production build
preview:
	@echo "Starting preview server on http://localhost:3000..."
	@echo "Note: You need to build the project first (use Makefile.build)"
	npm run preview

# Stop running servers (kills processes on port 3000)
stop:
	@echo "Stopping servers on port 3000..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No process found on port 3000"

# Mobile targets
android-install:
	@echo "Installing mobile dependencies..."
	@cd mobile-apps/android && npm install

android: android-install
	@echo "Syncing app configuration..."
	@cd mobile-apps/android && npx expo prebuild --platform android
	@echo "Starting Android build/run process..."
	@cd mobile-apps/android && npm run android


init-test:
	@if [ ! -f test.env ]; then \
		printf "username=test\npassword=test\nAPI_URL=http://localhost:8000\n" > test.env; \
	fi
# 	@npx playwright install --with-deps

test: init-test
	@npx playwright test --headed
	@npx playwright show-report

test-e2e: init-test
	@npm run test:e2e
	@npx playwright show-report

test-ui: init-test
	@npx playwright test --ui
	@npx playwright show-report


db-dump:
	@: $${DB_PASSWORD:?DB_PASSWORD environment variable is not set. Set it via \'export DB_PASSWORD=<your-password>\'}
	@: $${PROJECT_ID:?PROJECT_ID environment variable is not set. Set it via \'export PROJECT_ID=<your-project-id>\'}
# 	@pg_dump \
# 		--format=plain \
# 		--blobs \
# 		--no-owner \
# 		--no-privileges \
# 		"postgresql://postgres:$$DB_PASSWORD@db.$$PROJECT_ID.supabase.co:5432/postgres" \
# 		> data-model.sql
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