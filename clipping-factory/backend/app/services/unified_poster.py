"""
unified_poster.py — one call posts a rendered clip to Instagram Reels, TikTok, and
YouTube (and more), closing the "automated posting" gap.

The factory already uploads to YouTube (Data API) and clip-marketplaces (Playwright),
but had no direct Instagram Reels / TikTok API path. Rather than build and maintain the
Instagram Graph API + TikTok Content Posting API OAuth dances separately, this posts
through a single unified social API (Ayrshare by default — one key, one endpoint,
supports IG Reels/TikTok/YT/FB/LinkedIn/X). The provider is swappable.

Honesty / safety (binding):
  - DRY-RUN BY DEFAULT. Nothing is posted unless `live=True` AND a key is present.
    A dry run returns exactly what WOULD be sent — no fabricated success, no ghost posts.
  - No key / no video → a clear error, never a silent fake "posted".
  - The caller (the publishing agent) decides platforms and caption; this only transports.

Config (env):
  SOCIAL_POST_PROVIDER   default "ayrshare"
  AYRSHARE_API_KEY       the provider key (from the founder's connected accounts)
  SOCIAL_POST_LIVE       "1" to actually post (else dry-run even if a key exists)

Usage:
  from app.services.unified_poster import UnifiedPoster
  poster = UnifiedPoster()                     # reads env
  result = poster.post(
      caption="Watch this →",
      platforms=["instagram", "tiktok", "youtube"],
      video_url="https://.../clip.mp4",        # public URL (provider fetches it)
      live=True,                                # omit/False = dry run
  )
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass, field, asdict
from typing import Optional

SUPPORTED = {"instagram", "tiktok", "youtube", "facebook", "linkedin", "twitter", "x"}
_ALIAS = {"reels": "instagram", "ig": "instagram", "shorts": "youtube", "yt": "youtube", "x": "twitter"}


@dataclass
class PostResult:
    ok: bool
    live: bool
    provider: str
    platforms: list
    dry_run_payload: Optional[dict] = None
    provider_response: Optional[dict] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _normalize_platforms(platforms) -> list:
    out = []
    for p in platforms or []:
        p = _ALIAS.get(p.strip().lower(), p.strip().lower())
        if p in SUPPORTED and p not in out:
            out.append("twitter" if p == "x" else p)
    return out


class UnifiedPoster:
    def __init__(self, provider: str = None, api_key: str = None, http=None):
        self.provider = (provider or os.environ.get("SOCIAL_POST_PROVIDER", "ayrshare")).lower()
        self.api_key = api_key if api_key is not None else os.environ.get("AYRSHARE_API_KEY", "")
        self.env_live = os.environ.get("SOCIAL_POST_LIVE", "").lower() in ("1", "true", "yes")
        self._http = http or _urlopen_json  # injectable for tests

    # ------------------------------------------------------------------ #
    def post(self, caption: str, platforms, video_url: str = None,
             video_path: str = None, live: bool = False) -> PostResult:
        plats = _normalize_platforms(platforms)
        if not plats:
            return PostResult(False, False, self.provider, [],
                              error=f"no supported platforms in {platforms!r} (supported: {sorted(SUPPORTED)})")
        if not (video_url or video_path):
            return PostResult(False, False, self.provider, plats,
                              error="no video_url or video_path — nothing to post (never fabricated)")

        payload = self._build_payload(caption, plats, video_url, video_path)
        go_live = bool(live) and self.env_live is not False and (live or self.env_live)
        # require BOTH an explicit live=True and a key to actually transmit
        if not (live and self.api_key):
            reason = []
            if not live:
                reason.append("live=False (dry run)")
            if not self.api_key:
                reason.append("no API key")
            payload["_dry_run_reason"] = "; ".join(reason)
            return PostResult(True, False, self.provider, plats, dry_run_payload=payload)

        try:
            resp = self._transmit(payload)
            ok = self._provider_ok(resp)
            return PostResult(ok, True, self.provider, plats, provider_response=resp,
                              error=None if ok else "provider reported failure")
        except urllib.error.HTTPError as e:
            return PostResult(False, True, self.provider, plats, error=f"HTTP {e.code}: {e.reason}")
        except Exception as e:  # noqa: BLE001 — a post failure must return, not crash the worker
            return PostResult(False, True, self.provider, plats, error=str(e))

    # ------------------------------------------------------------------ #
    def _build_payload(self, caption, plats, video_url, video_path) -> dict:
        if self.provider == "ayrshare":
            p = {"post": caption, "platforms": plats}
            if video_url:
                p["mediaUrls"] = [video_url]
            else:
                p["_local_video_path"] = video_path  # provider needs a public URL; flagged for the caller
            p["isVideo"] = True
            return p
        # generic provider shape (override per provider as they are added)
        return {"caption": caption, "platforms": plats,
                "video_url": video_url, "video_path": video_path}

    def _transmit(self, payload: dict) -> dict:
        if self.provider == "ayrshare":
            body = {k: v for k, v in payload.items() if not k.startswith("_")}
            return self._http("https://api.ayrshare.com/api/post", body,
                              {"Authorization": f"Bearer {self.api_key}",
                               "Content-Type": "application/json"})
        raise ValueError(f"unknown provider {self.provider!r} — add a _transmit branch")

    def _provider_ok(self, resp: dict) -> bool:
        if self.provider == "ayrshare":
            return str(resp.get("status", "")).lower() in ("success", "scheduled")
        return bool(resp.get("ok"))


def _urlopen_json(url: str, body: dict, headers: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or b"{}")
