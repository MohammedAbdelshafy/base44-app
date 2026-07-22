# Automated posting — the honest state + the shortest path to a first posted clip

## What already exists in this factory
- **YouTube**: `app/services/youtube_upload.py` — Data API v3, multi-channel via
  `youtube_tokens.json` (created by `youtube_oauth_setup.py`, signed in as you once).
- **Clip marketplaces** (Whop, Vyro, Reach.cat, Clipping.com/.net): `app/agents/multi_platform_delivery.py`
  — Playwright browser automation using your logins.
- **Instagram Reels + TikTok (NEW)**: `app/services/unified_poster.py` — one API key posts to
  IG Reels, TikTok, YouTube, FB, LinkedIn, X via a unified provider (Ayrshare by default).
  Dry-run by default; nothing posts without an explicit `live=True` **and** a key.

## Why nothing has posted yet — the real blockers (not code)
The workflow is code-complete. It has never run because it needs an **environment + credentials**
that only you can provide — none of which exist in an ephemeral CI sandbox:

1. **A host with ffmpeg** to render clips (Docker image / your server / your laptop).
2. **Redis + Postgres** (docker-compose brings these up).
3. **API keys**: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
4. **Posting credentials**: YouTube OAuth tokens, and/or an `AYRSHARE_API_KEY` with your
   IG/TikTok accounts connected on the provider side.

No agent can post to *your* accounts without *your* OAuth — that's by design, not a limitation to route around.

## Shortest path to ONE posted clip (do this on your machine/server)
1. `cp .env.example .env` → fill `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
2. Pick a posting rail:
   - **Fastest for IG/TikTok**: create an [Ayrshare](https://www.ayrshare.com) account, connect your
     IG (Business/Creator) + TikTok, set `AYRSHARE_API_KEY` and `SOCIAL_POST_LIVE=1`.
   - **YouTube**: run `python youtube_oauth_setup.py` once, signed in as your channel.
3. `docker compose up` (brings up ffmpeg image + Redis + Postgres + workers).
4. Feed one source video through the pipeline (one approved source / one uploaded file).
5. The publishing step calls `UnifiedPoster(...).post(caption, ["instagram","tiktok"], video_url=CLIP_URL, live=True)`.
   First run it with `live=False` (default) to see the exact payload; flip to `live=True` when it looks right.

## "Many solutions" for posting — pick one, they all plug into `unified_poster.py`
| Solution | Covers | Notes |
|---|---|---|
| **Ayrshare** (default) | IG Reels, TikTok, YT, FB, LinkedIn, X | one key, one endpoint; free tier; simplest |
| **Blotato** | IG, TikTok, YT, more | similar unified API; swap the `_transmit` branch |
| Instagram Graph API | IG Reels | native; needs FB app review + Business account |
| TikTok Content Posting API | TikTok | native; needs approved developer app |
| Buffer / Metricool / Publer | scheduled queue | post via their API; good for cadence control |

To add a provider: implement its `_build_payload` + `_transmit` branch in `unified_poster.py`
(the interface + dry-run safety are already there).

## Honesty rules (binding)
- Dry-run is the default; a "posted" result is only ever returned after a real provider success.
- No key or no rendered video → a clear error, never a fabricated success or a ghost post.
- Post only to accounts you own/manage; opt-out and platform ToS always win.
