# Makefile for running the project

.PHONY: help install dev preview stop build build-production clean clean-build android android-install

# Default target
help:
	@echo "Available targets:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Run development server"
	@echo "  make android          - Run the app on Android"
	@echo "  make build            - Prebuild Android project"
	@echo "  make build-production - Build for production (release variant)"
	@echo "  make clean            - Remove build artifacts and dependencies"
	@echo "  make clean-build      - Clean and then prebuild"

# Mobile targets
install: android-install

android-install:
	@echo "Installing mobile dependencies..."
	@npm install

android: android-install
	@echo "Syncing app configuration..."
	@npx expo prebuild --platform android
	@echo "Starting Android build/run process..."
	@npm run android

dev:
	@echo "Starting Expo development server..."
	@npm start

preview:
	@echo "Starting Expo in production mode..."
	@npx expo start --no-dev

stop:
	@echo "Stopping Expo servers (port 8081)..."
	@lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "No process found on port 8081"

build:
	@echo "Prebuilding Android project..."
	@npx expo prebuild --platform android

build-production:
	@echo "Building Android for production (release variant)..."
	@npx expo run:android --variant release

clean:
	@echo "Cleaning mobile project..."
	@rm -rf node_modules
	@rm -rf android
	@rm -rf ios

clean-build: clean build
