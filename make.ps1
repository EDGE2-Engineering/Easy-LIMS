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
    Write-Host "  ./make.ps1 docker-build     - Build Docker image (easy-lims:latest)"
    Write-Host "  ./make.ps1 docker-run       - Build & run Docker container"
    Write-Host "  ./make.ps1 android          - Run Android build/run process"
    Write-Host "  ./make.ps1 test             - Run E2E tests with Playwright (headed)"
    Write-Host "  ./make.ps1 test-e2e         - Run E2E tests"
    Write-Host "  ./make.ps1 test-ui          - Run Playwright tests with UI"
    Write-Host "  ./make.ps1 format           - Format source files with Prettier"
    Write-Host "  ./make.ps1 format-check     - Check formatting without writing"
    Write-Host "  ./make.ps1 setup-hooks      - Install Git hooks"
    Write-Host "  ./make.ps1 db-dump          - Export PostgreSQL database schema/dump"
}

function Invoke-Install {
    Write-Host "Installing root dependencies..." -ForegroundColor Green
    npm install
    if (Test-Path ui) { Write-Host "Installing UI dependencies..." -ForegroundColor Green; Push-Location ui; npm install; Pop-Location }
}

function Invoke-Build {
    Invoke-Install
    Write-Host "Building UI frontend..." -ForegroundColor Green
    if (Test-Path ui) { Push-Location ui; npm run build; Pop-Location } else { npm run build }
    Write-Host "Copying dist to server/dist..." -ForegroundColor Green
    if (-not (Test-Path server/dist)) { New-Item -ItemType Directory -Path server/dist -Force }
    if (Test-Path ui/dist) { Copy-Item -Recurse -Force ui/dist/* server/dist/ }
}

function Invoke-CleanBuild {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Green
    if (Test-Path ui/dist) { Remove-Item -Recurse -Force ui/dist }
    if (Test-Path server/dist) { Remove-Item -Recurse -Force server/dist }
    if (Test-Path dist) { Remove-Item -Recurse -Force dist }
}

function Invoke-Clean {
    Invoke-CleanBuild
    Write-Host "Cleaning dependencies..." -ForegroundColor Green
    if (Test-Path ui/node_modules) { Remove-Item -Recurse -Force ui/node_modules }
    if (Test-Path ui/package-lock.json) { Remove-Item -Force ui/package-lock.json }
    if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
}

function Invoke-Dev {
    Invoke-Build
    Write-Host "Installing Python dependencies..." -ForegroundColor Green
    pip install -r server/requirements.txt uvicorn
    Write-Host "Starting FastAPI server on http://0.0.0.0:8000..." -ForegroundColor Green
    Push-Location server
    python -m uvicorn main:app --host 0.0.0.0 --reload --port 8000
    Pop-Location
}

function Invoke-Preview {
    Invoke-Build
    Write-Host "Installing Python dependencies..." -ForegroundColor Green
    pip install -r server/requirements.txt uvicorn
    Write-Host "Starting FastAPI server on http://0.0.0.0:8000..." -ForegroundColor Green
    Push-Location server
    python -m uvicorn main:app --host 0.0.0.0 --port 8000
    Pop-Location
}

function Invoke-Stop {
    Write-Host "Stopping servers on port 8000..." -ForegroundColor Green
    $connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($c in $connections) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Stopped processes running on port 8000." -ForegroundColor Green
    } else {
        Write-Host "No process found on port 8000." -ForegroundColor Yellow
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
        if (Test-Path test.env.example) {
            Copy-Item test.env.example test.env
        } else {
            "ADMIN_USERNAME=`nADMIN_PASSWORD=`nAPI_URL=http://localhost:8000" | Out-File -FilePath test.env -Encoding ascii
        }
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
    # $env:DB_PASSWORD='as'
    # $env:PROJECT_ID='as'
    # $env:PROJECT_ID_NEW='asds'
    $env:PATH='%PATH%;C:\Program Files\PostgreSQL\18\bin'

    pg_dump --schema-only --no-owner --no-privileges --quote-all-identifiers "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID).apiClient.co:5432/postgres" > data-model.sql
    pg_dump --format=custom --blobs --verbose "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID).apiClient.co:5432/postgres" -f full-database.dump
    # pg_dump "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID).apiClient.co:5432/postgres?sslmode=require" --no-owner --no-privileges --file="apiClient.sql"
pg_dump "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID).apiClient.co:5432/postgres?sslmode=require" --schema=public --no-owner --no-privileges --file="public_schema.sql"
psql `
  "postgresql://postgres:$($env:DB_PASSWORD)@db.$($env:PROJECT_ID_NEW).apiClient.co:5432/postgres?sslmode=require" `
  -f "public_schema.sql"

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

function Invoke-DockerBuild {
    Write-Host "Building Docker image easy-lims:latest..." -ForegroundColor Green
    docker build -t easy-lims:latest .
}

function Invoke-DockerRun {
    Invoke-DockerBuild
    Write-Host "Running Docker container easy-lims:latest on port 8000..." -ForegroundColor Green
    if (-not (Test-Path server/.env)) { New-Item -ItemType File -Path server/.env -Force }
    docker run -p 8000:8000 -e DATABASE_URL="$env:DATABASE_URL" --env-file server/.env easy-lims:latest
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
    "docker-build"     { Invoke-DockerBuild }
    "docker-run"       { Invoke-DockerRun }
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
