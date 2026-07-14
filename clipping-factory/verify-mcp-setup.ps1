# Clipping Factory MCP Server — Setup Verification for Claude Code (Windows)
# Run this after `docker compose up` to verify everything is working

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Clipping Factory MCP Server — Setup Verification" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend API (port 8000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✓ Backend API is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend API not responding on port 8000" -ForegroundColor Red
    Write-Host "     Run: docker compose up" -ForegroundColor Yellow
    exit 1
}

# Check if MCP server is running
Write-Host ""
Write-Host "2. Checking MCP server (port 8001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/sse" -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "   ✓ MCP server is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ MCP server not responding on port 8001" -ForegroundColor Red
    Write-Host "     It may be starting up... wait 5 seconds and try again" -ForegroundColor Yellow
}

# Check database
Write-Host ""
Write-Host "3. Checking database connection..." -ForegroundColor Yellow
try {
    $result = docker exec clipping-factory-postgres-1 pg_isready -U clipuser 2>$null
    if ($result -like "*accepting connections*") {
        Write-Host "   ✓ PostgreSQL is healthy" -ForegroundColor Green
    } else {
        Write-Host "   ✗ PostgreSQL not healthy" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ✗ Could not check PostgreSQL" -ForegroundColor Yellow
}

# Run MCP server startup validation
Write-Host ""
Write-Host "4. Running MCP server startup checks..." -ForegroundColor Yellow
Push-Location backend
try {
    $output = python -m app.mcp_server --check 2>&1
    if ($output -like "*All checks passed*") {
        Write-Host "   ✓ MCP server startup validation passed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ MCP server validation warnings:" -ForegroundColor Yellow
        Write-Host $output
    }
} catch {
    Write-Host "   ✗ MCP server validation failed" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ All checks passed! MCP server is ready for Claude Code" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy settings from claude-mcp-config.json" -ForegroundColor White
Write-Host "  2. Merge into ~/.claude/settings.json → mcpServers section" -ForegroundColor White
Write-Host "  3. Restart Claude Code" -ForegroundColor White
Write-Host "  4. Try: 'scan campaigns' or 'check system health'" -ForegroundColor White
Write-Host ""
Write-Host "MCP Server running at:" -ForegroundColor Yellow
Write-Host "  • Stdio:  python -m app.mcp_server" -ForegroundColor White
Write-Host "  • SSE:    http://localhost:8001/sse" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
