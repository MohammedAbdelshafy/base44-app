#!/bin/bash
# Clipping Factory MCP Server — Setup Verification for Claude Code
# Run this after `docker compose up` to verify everything is working

set -e

echo "═══════════════════════════════════════════════════════════"
echo "Clipping Factory MCP Server — Setup Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if backend is running
echo "1. Checking backend API (port 8000)..."
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "   ✓ Backend API is running"
else
    echo "   ✗ Backend API not responding on port 8000"
    echo "     Run: docker compose up"
    exit 1
fi

# Check if MCP server is running
echo ""
echo "2. Checking MCP server (port 8001)..."
if curl -s http://localhost:8001/sse > /dev/null 2>&1; then
    echo "   ✓ MCP server is running"
else
    echo "   ✗ MCP server not responding on port 8001"
    echo "     It may be starting up... wait 5 seconds and try again"
    exit 1
fi

# Check database
echo ""
echo "3. Checking database connection..."
if docker exec clipping-factory-postgres-1 pg_isready -U clipuser > /dev/null 2>&1; then
    echo "   ✓ PostgreSQL is healthy"
else
    echo "   ✗ PostgreSQL not healthy"
    exit 1
fi

# Run MCP server startup validation
echo ""
echo "4. Running MCP server startup checks..."
cd backend
if python -m app.mcp_server --check 2>&1 | grep -q "All checks passed"; then
    echo "   ✓ MCP server startup validation passed"
else
    echo "   ✗ MCP server validation failed — see output above"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✓ All checks passed! MCP server is ready for Claude Code"
echo ""
echo "Next steps:"
echo "  1. Copy settings from claude-mcp-config.json"
echo "  2. Merge into ~/.claude/settings.json → mcpServers section"
echo "  3. Restart Claude Code"
echo "  4. Try: 'scan campaigns' or 'check system health'"
echo ""
echo "MCP Server running at:"
echo "  • Stdio:  python -m app.mcp_server"
echo "  • SSE:    http://localhost:8001/sse"
echo "═══════════════════════════════════════════════════════════"
