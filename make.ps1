param (
    [string]$Target = "help"
)

function Show-Help {
    Write-Host "Available targets:"
    Write-Host "  ./make.ps1 install          - Install dependencies"
    Write-Host "  ./make.ps1 dev              - Run development server (http://localhost:3000)"
    Write-Host "  ./make.ps1 preview          - Preview production build (http://localhost:3000)"
    Write-Host "  ./make.ps1 stop             - Stop any running dev servers"
    Write-Host "  ./make.ps1 build            - Build the project for production"
    Write-Host "  ./make.ps1 build-production - Build with optimizations (alias for build)"
    Write-Host "  ./make.ps1 clean            - Remove build artifacts and dependencies"
    Write-Host "  ./make.ps1 clean-build      - Remove only build artifacts"
    Write-Host "  ./make.ps1 android          - Run Android build/run process"
    Write-Host "  ./make.ps1 test             - Run E2E tests with Playwright (headed)"
    Write-Host "  ./make.ps1 test-e2e         - Run E2E tests"
    Write-Host "  ./make.ps1 test-ui          - Run Playwright tests with UI"
    Write-Host "  ./make.ps1 format           - Format source files with Prettier"
    Write-Host "  ./make.ps1 format-check     - Check formatting without writing"
    Write-Host "  ./make.ps1 setup-hooks      - Install Git hooks"
    Write-Host "  ./make.ps1 db-dump          - Export Supabase database schema/dump"
}

function Invoke-Install {
    Write-Host "Installing dependencies..." -ForegroundColor Green
    npm install
}

function Invoke-Build {
    Invoke-Install
    Write-Host "Building the project..." -ForegroundColor Green
    npm run build
}

function Invoke-CleanBuild {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green
    if (Test-Path dist) {
        Remove-Item -Recurse -Force dist
    }
}

function Invoke-Clean {
    Invoke-CleanBuild
    Write-Host "Cleaning dependencies..." -ForegroundColor Green
    if (Test-Path node_modules) {
        Remove-Item -Recurse -Force node_modules
    }
    if (Test-Path package-lock.json) {
        Remove-Item -Force package-lock.json
    }
}

function Invoke-Dev {
    Invoke-Install
    Write-Host "Starting development server on http://localhost:3000..." -ForegroundColor Green
    npm run dev
}

function Invoke-Preview {
    Write-Host "Starting preview server on http://localhost:3000..." -ForegroundColor Green
    npm run preview
}

function Invoke-Stop {
    Write-Host "Stopping servers on port 3000..." -ForegroundColor Green
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($c in $connections) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Stopped processes running on port 3000." -ForegroundColor Green
    } else {
        Write-Host "No process found on port 3000." -ForegroundColor Yellow
    }
}

function Invoke-AndroidInstall {
    Write-Host "Installing mobile dependencies..." -ForegroundColor Green
    Push-Location mobile-apps/android
    npm install
    Pop-Location
}

function Invoke-Android {
    Invoke-AndroidInstall
    Write-Host "Syncing app configuration..." -ForegroundColor Green
    Push-Location mobile-apps/android
    npx expo prebuild --platform android
    Write-Host "Starting Android build/run process..." -ForegroundColor Green
    npm run android
    Pop-Location
}

function Invoke-InitTest {
    if (-not (Test-Path test.env)) {
        "username=test`npassword=test`nAPI_URL=http://localhost:8000" | Out-File -FilePath test.env -Encoding ascii
    }
}

function Invoke-Test {
    Invoke-InitTest
    npx playwright test --headed
    npx playwright show-report
}

function Invoke-TestE2E {
    Invoke-InitTest
    npm run test:e2e
    npx playwright show-report
}

function Invoke-TestUI {
    Invoke-InitTest
    npx playwright test --ui
    npx playwright show-report
}

function Invoke-DbDump {
    if (-not $env:DB_PASSWORD) {
        Write-Error "DB_PASSWORD environment variable is not set. Set it via `$env:DB_PASSWORD='your-password'"
        return
    }
    if (-not $env:PROJECT_ID) {
        Write-Error "PROJECT_ID environment variable is not set. Set it via `$env:PROJECT_ID='your-project-id'"
        return
    }
    pg_dump --schema-only --no-owner --no-privileges --quote-all-identifiers "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID).supabase.co:5432/postgres" > data-model.sql
    pg_dump --format=custom --blobs --verbose "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID).supabase.co:5432/postgres" -f full-database.dump
}

function Invoke-Format {
    Write-Host "Formatting source files with Prettier..." -ForegroundColor Green
    npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,html,json}" "index.html" "*.json" --ignore-path .gitignore
}

function Invoke-FormatCheck {
    Write-Host "Checking formatting with Prettier..." -ForegroundColor Green
    npx prettier --check "src/**/*.{js,jsx,ts,tsx,css,html,json}" "index.html" "*.json" --ignore-path .gitignore
}

function Invoke-SetupHooks {
    Write-Host "Installing Git hooks..." -ForegroundColor Green
    Copy-Item scripts/hooks/pre-commit .git/hooks/pre-commit -Force
    Write-Host "Git hooks installed." -ForegroundColor Green
}

switch ($Target) {
    "help"             { Show-Help }
    "install"          { Invoke-Install }
    "build"            { Invoke-Build }
    "build-production" { Invoke-Build }
    "clean-build"      { Invoke-CleanBuild }
    "clean"            { Invoke-Clean }
    "dev"              { Invoke-Dev }
    "preview"          { Invoke-Preview }
    "stop"             { Invoke-Stop }
    "android-install"  { Invoke-AndroidInstall }
    "android"          { Invoke-Android }
    "init-test"        { Invoke-InitTest }
    "test"             { Invoke-Test }
    "test-e2e"         { Invoke-TestE2E }
    "test-ui"          { Invoke-TestUI }
    "db-dump"          { Invoke-DbDump }
    "format"           { Invoke-Format }
    "format-check"     { Invoke-FormatCheck }
    "setup-hooks"      { Invoke-SetupHooks }
    default {
        Write-Error "Unknown target: $Target"
        Show-Help
    }
}
