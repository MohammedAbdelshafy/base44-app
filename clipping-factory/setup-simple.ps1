# Clipping Factory Setup Script (Windows PowerShell)

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "=== Clipping Factory Setup ===" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path "\.env")) {
    if (Test-Path "\.env.example") {
        Copy-Item "\.env.example" "\.env"
        Write-Host "✓ Created .env from template. Please edit .env for required settings." -ForegroundColor Yellow
    } else {
        Write-Host "✗ .env.example not found. Please create .env manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ .env already exists" -ForegroundColor Green
}

# Check for Docker
if ((Get-Command docker -ErrorAction SilentlyContinue) -eq $null) {
    Write-Host "✗ Docker not found. Docker is required for this project." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker is available" -ForegroundColor Green

# Check for docker-compose
if (((Get-Command docker-compose -ErrorAction SilentlyContinue) -eq $null) -and ((Get-Command docker -ErrorAction SilentlyContinue) -ne $null)) {
    Write-Host "⚠ Note: Using docker command directly (docker-compose not found)" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env and set required values:" -ForegroundColor White
Write-Host "   - CLIPPING_EMAIL: your clipping.com email" -ForegroundColor Gray
Write-Host "   - CLIPPING_PASSWORD: your clipping.com password" -ForegroundColor Gray
Write-Host "   - ANTHROPIC_API_KEY: optional, for Claude integration" -ForegroundColor Gray
Write-Host "2. Start services: docker compose up" -ForegroundColor White
Write-Host "3. Access admin dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "   Default admin: admin / change-me-admin-password (set in .env)" -ForegroundColor Yellow

# Show partial .env content
Write-Host "" -ForegroundColor White
Write-Host "Partial .env content (first 20 lines):" -ForegroundColor Yellow
Get-Content -Path "\.env" -Head 20 | Select-Object -First 20 | Write-Host
