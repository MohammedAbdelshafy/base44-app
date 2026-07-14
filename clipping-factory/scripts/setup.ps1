# This script sets up Clipping Factory and runs tests

$ErrorActionPreference = "Stop"

Write-Host "=== Clipping Factory Setup and Test ==="

# Check if .env file exists
if (-not (Test-Path "\.env")) {
    if (Test-Path "\.env.example") {
        Copy-Item "\.env.example" "\.env"
        Write-Host "✓ Created .env from template. Please edit .env file and set ANTHROPIC_API_KEY, CLIPPING_EMAIL, CLIPPING_PASSWORD"
    } else {
        Write-Host "ERROR: .env.example not found"
        exit 1
    }
} else {
    Write-Host "✓ .env already exists"
}

# Check for Docker
if (((Get-Command docker -ErrorAction SilentlyContinue) -eq $null)) {
    Write-Host "ERROR: Docker not found"
    exit 1
}

# Check for docker-compose or docker
if (((Get-Command docker-compose -ErrorAction SilentlyContinue) -eq $null) -and ((Get-Command docker -ErrorAction SilentlyContinue) -ne $null)) {
    Write-Host "Docker compose not found, but docker is available"
} else {
    Write-Host "✓ Docker Compose available"
}

# Start infrastructure services
Write-Host ""
Write-Host "Starting infrastructure services..."
& docker compose up -d postgres redis minio

# Wait for database
Write-Host ""
Write-Host "Waiting for database to be ready..."
Start-Sleep -s 5

# Run database migrations
Write-Host ""
Write-Host "Running database migrations..."
& docker compose run --rm api alembic upgrade head

# Install Playwright browsers
Write-Host ""
Write-Host "Installing Playwright browsers..."
& docker compose run --rm api playwright install chromium --with-deps

Write-Host ""
Write-Host "=== Setup complete! ==="
Write-Host ""
Write-Host "Start the full stack:    docker compose up"
Write-Host "Admin dashboard:         http://localhost:3000"
Write-Host "API docs:                http://localhost:8000/docs"
Write-Host "MinIO console:           http://localhost:9001  (admin/minioadmin)"
Write-Host "Grafana:                 http://localhost:3001  (admin/admin)"
Write-Host ""
Write-Host "Default admin:  admin / change-me-admin-password (set in .env)"
