# Setup Clipping Factory in Windows PowerShell

# Check requirements if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {  Write-Host "ERROR: Docker not found. Install Docker first." -ForegroundColor Red   exit 1 }

# Copy .env file
if (Test-Path "C:\Users\omare\OneDrive\Desktop\AI\clipping-factory\.env.example") {
    Copy-Item "C:\Users\omare\OneDrive\Desktop\AI\clipping-factory\.env.example" "C:\.env"
    Write-Host "✓ Created .env from template. Please edit .env and set ANTHROPIC_API_KEY, CLIPPING_EMAIL, CLIPPING_PASSWORD" -ForegroundColor Yellow
} else {
    Write-Host "✗ .env.example not found in clipping-factory directory" -ForegroundColor Red
    exit 1
}

# Try to run the bash setup script try {
    if (Test-Path "C:\Users\omare\OneDrive\Desktop\AI\clipping-factory\scripts\setup.sh") {
        Write-Host "Running bash setup.sh script..." -ForegroundColor Yellow
        $result = bash "C:\Users\omare\OneDrive\Desktop\AI\clipping-factory/scripts/setup.sh" 2>&1
        Write-Host "Setup script output:" -ForegroundColor Green
        Write-Host $result
    } else {
        Write-Host "✗ scripts/setup.sh not found" -ForegroundColor Red
    }
} catch {
    Write-Host "Note: Could not run bash script. Setup may need manual steps." -ForegroundColor Yellow
}

# Manual backup of .env file
if (Test-Path "C:\.env") {
    Write-Host "✓ Environment file setup complete" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Edit C:\.env and set required values:" -ForegroundColor White
    Write-Host "   - CLIPPING_EMAIL: your clipping.com email" -ForegroundColor Gray
    Write-Host "   - CLIPPING_PASSWORD: your clipping.com password" -ForegroundColor Gray
    Write-Host "   - ANTHROPIC_API_KEY: optional, for Claude integration" -ForegroundColor Gray
    Write-Host "2. Start Docker services: docker compose up" -ForegroundColor White
    Write-Host "3. Access admin dashboard at: http://localhost:3000" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Default admin: admin / change-me-admin-password (set in .env)" -ForegroundColor Yellow
}
