# Clipping Factory MCP Server — Claude Code Integration

The Clipping Factory now exposes all 9 agents as MCP tools, allowing Claude Code and any MCP-capable AI assistant to control the system directly.

## Quick Start

### 1. Start the system
```bash
docker compose up --build
```

### 2. Verify MCP server is ready
**Windows (PowerShell):**
```powershell
.\verify-mcp-setup.ps1
```

**macOS/Linux (Bash):**
```bash
bash verify-mcp-setup.sh
```

### 3. Configure Claude Code

Merge the MCP server config into your Claude Code settings:

**Option A: Automatic (recommended)**
- Open `claude-mcp-config.json` in this directory
- Copy the `mcpServers` section
- Paste into `~/.claude/settings.json` under the `mcpServers` key

**Option B: Manual**
Edit `~/.claude/settings.json` and add:
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

### 4. Restart Claude Code
Close and reopen Claude Code. The MCP server should now be connected.

## Available Tools

### Agent Control
- **`scan_campaigns(page_id?)`** — Scan Clipping.com for new campaigns
- **`analyze_campaign(campaign_id)`** — Score and analyze a campaign
- **`acquire_content(campaign_id)`** — Download source video
- **`analyze_content(source_content_id)`** — Transcribe and score clips
- **`generate_clips(source_content_id)`** — Cut raw clips
- **`edit_clip(clip_id)`** — Apply post-production
- **`quality_check(clip_id)`** — Automated QC review
- **`deliver_clip(clip_id)`** — Submit to Clipping.com
- **`system_health()`** — Check all system components

### Pipeline Control
- **`run_full_pipeline(campaign_id)`** — End-to-end processing
- **`approve_clip(clip_id, notes?)`** — Manual approval workflow
- **`reject_clip(clip_id, reason?)`** — Manual rejection

### Queries
- **`list_campaigns(status?, limit?)`** — Query campaigns
- **`list_clips(campaign_id?, limit?)`** — Query clips
- **`get_campaign(campaign_id)`** — Full campaign details

## Example Usage in Claude Code

```
User: Scan for new campaigns
Claude Code: I'll scan Clipping.com for new campaigns.
[calls scan_campaigns()]
Result: Found 5 new campaigns

User: Check the health of the system
Claude Code: Let me check all system components...
[calls system_health()]
Result: PostgreSQL ✓ Redis ✓ MinIO ✓ Celery workers ✓

User: Analyze campaign abc-123
Claude Code: I'll score this campaign for viability.
[calls analyze_campaign("abc-123")]
Result: Score 0.87 - Recommended to pursue
```

## Troubleshooting

### MCP server not connecting

**Check if server is running:**
```bash
curl http://localhost:8001/sse
```

**Check Docker logs:**
```bash
docker logs clipping-factory-mcp-server-1
```

**Run startup validation:**
```bash
python backend/app/mcp_server.py --check
```

### Tool calls failing

**Check system health:**
```
Claude Code: Check system health
[calls system_health()]
```

**Check database:**
```bash
docker exec clipping-factory-postgres-1 psql -U clipuser -d clipping_factory -c "SELECT COUNT(*) FROM campaigns;"
```

### Port 8001 already in use

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8002:8001"  # Use 8002 instead
```

Then update `claude-mcp-config.json`:
```json
"url": "http://localhost:8002/sse"
```

## Architecture

```
Claude Code (MCP Client)
        ↓ (SSE over HTTP)
MCP Server (fastmcp) — Port 8001
        ↓
Agents (9 specialized AI workflows)
        ↓
Database (PostgreSQL)
        ↓
Workers (Celery) — Async processing
```

## What's Happening Under the Hood

1. Claude Code connects to the MCP server via SSE (Server-Sent Events)
2. Tools are exposed as MCP resources
3. When you call a tool, it:
   - Gets a sync database session
   - Instantiates the corresponding agent
   - Runs the agent's `_safe_run()` method
   - Returns results back to Claude Code

## Files

- `app/mcp_server.py` — MCP server implementation
- `docker-compose.yml` — MCP service definition
- `claude-mcp-config.json` — Claude Code MCP config
- `verify-mcp-setup.ps1` — Windows verification script
- `verify-mcp-setup.sh` — Unix/Mac verification script
