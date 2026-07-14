# Clipping Factory Setup and Development Guide

## QUICK START (5-minute setup)

1. **Clone this repo**
```bash
cd /workspace && git clone https://github.com/your-org/clipping-factory.git
```

2. **Run setup script**
```bash
cd clipping-factory
chmod +x setup.sh  # Linux/Mac
# Or: powershell -ExecutionPolicy Bypass -File setup.ps1  # Windows
```

3. **Start full stack**
```bash
docker compose up --build
```

4. **Verify MCP server**
```bash
# Linux/Mac: ./verify-mcp-setup.sh
# Windows: .\verify-mcp-setup.ps1
```

## What This Setup Does

- Installs Python dependencies and Playwright browsers
- Starts PostgreSQL, Redis, MinIO for infrastructure
- Runs database migrations
- Prepares all services for AI agent operation

## Key Components

### 9 AI Agents
1. **Campaign Hunter Agent** - Scans Clipping.com for new campaigns
2. **Campaign Intelligence Agent** - Scores and analyzes campaigns
3. **Content Acquisition Agent** - Downloads video/audio source content
4. **Content Analysis Agent** - Transcribes and analyzes clips
5. **Clip Generation Agent** - Cuts raw clips to specifications
6. **Clip Editing Agent** - Applies post-production effects
7. **Quality Check Agent** - Automated quality review
8. **Delivery Agent** - Submits clips to Clipping.com
9. **Publishing Agent** - Manages publishing workflows

### Architecture
```
Claude Code / AI Assistant ← MCP Server (fastmcp, SSE, port 8001)
                                    ↓
                                 9 Specialized AI Agents
                                    ↓
                           PostgreSQL + Redis + MinIO Storage
                                    ↓
                           Celery Workers (async processing)
```

## MCP Configuration (for Claude Code)

### Automatic (Recommended)
1. Open `claude-mcp-config.json` in this directory
2. Copy the `mcpServers` section
3. Paste into `~/.claude/settings.json`

### Manual
Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "clipping-factory": {
      "type": "sse",
      "url": "http://localhost:8001/sse"
    }
  }
}
```

## Starting the Full Stack

```bash
# Start everything with Docker Compose
docker compose up --build

# Or run individual services
# Backend API
docker compose up --build api
# Frontend (legacy setup - not used in current project)
docker compose up --build frontend
# All services with monitoring
docker compose up --build --compose-view
```

## Development Workflow

### For AI Assistants (Claude Code, Cursor, etc.)

1. **Connect to MCP Server**
   - Follow MCP configuration above
   - Restart your AI assistant

2. **Try these commands**
   ```
   Scan for new campaigns
   Check system health
   Analyze campaign abc-123
   Generate clips for campaign xyz-789
   ```

3. **Access Admin Dashboard**
   - URL: http://localhost:3000
   - Default: admin / change-me-admin-password

### For Developers (direct API access)

```bash
# API base URL: http://localhost:8000
# Health check: curl http://localhost:8000/docs

# MCP server
python -m app.mcp_server --transport sse --port 8001
```

## Key Features

### Real-time Processing
- SSE (Server-Sent Events) for instant AI agent responses
- WebSocket connections for real-time updates
- Database-backed agent state management

### Content Pipeline
1. **Discovery** - Scan platforms for new campaigns
2. **Acquisition** - Download source content
3. **Analysis** - Transcribe and score
4. **Production** - Generate clips
5. **Quality** - Automated and manual review
6. **Delivery** - Submit to platforms

### Infrastructure
- **PostgreSQL** - Campaign and clip data storage
- **Redis** - Caching and task queue
- **MinIO** - File storage for videos and clips
- **Celery** - Background processing
- **Playwright** - Browser automation
- **Prometheus + Grafana** - Monitoring

## Files Overview

| Directory | Purpose |
|-----------|---------|
| `backend/` | Python application with FastAPI |
| `backend/app/` | 9 AI agents and API |
| `scripts/` | Setup and verification scripts |
| `claude-mcp-config.json` | MCP configuration for AI assistants |
| `docker-compose.yml` | Full stack deployment |

## Troubleshooting

### MCP Server Not Connecting
```bash
# Check if server is running
curl http://localhost:8001/sse

# Check Docker logs
docker logs clipping-factory-mcp-server-1

# Run startup validation
python backend/app/mcp_server.py --check
```

### Docker Setup Issues
```bash
# Remove cached volumes if problems persist
docker compose down -v
# Then rebuild
docker compose up --build -d
```

### Port Conflicts
Change ports in `docker-compose.yml`:
```yaml
ports:
  - "8002:8001"  # Use 8002 instead of 8001
```

## Support

This is a self-contained AI-powered video clipping platform with:
- 9 specialized AI agents
- Full infrastructure in Docker
- Real-time AI assistant integration via MCP
- Enterprise-grade production ready

For support or questions, refer to the documentation or GitHub repository issues.
