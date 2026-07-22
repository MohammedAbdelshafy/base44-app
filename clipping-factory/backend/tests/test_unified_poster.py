"""Tests for the unified social poster — dry-run safe, honest, no ghost posts."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.unified_poster import UnifiedPoster, _normalize_platforms  # noqa: E402


def test_platform_normalization_and_aliases():
    assert _normalize_platforms(["reels", "ig", "TikTok", "yt", "x"]) == \
        ["instagram", "tiktok", "youtube", "twitter"]
    assert _normalize_platforms(["nonsense"]) == []


def test_dry_run_by_default_never_posts():
    poster = UnifiedPoster(api_key="present-but-unused")
    res = poster.post("hi", ["instagram", "tiktok"], video_url="https://x/clip.mp4")  # live omitted
    assert res.ok is True and res.live is False
    assert res.dry_run_payload["mediaUrls"] == ["https://x/clip.mp4"]
    assert "dry run" in res.dry_run_payload["_dry_run_reason"]


def test_no_key_stays_dry_even_if_live_requested():
    poster = UnifiedPoster(api_key="")
    res = poster.post("hi", ["instagram"], video_url="https://x/clip.mp4", live=True)
    assert res.live is False                          # cannot go live without a key
    assert "no API key" in res.dry_run_payload["_dry_run_reason"]


def test_no_video_is_an_error_not_a_fake_success():
    poster = UnifiedPoster(api_key="k")
    res = poster.post("hi", ["instagram"], live=True)
    assert res.ok is False and "nothing to post" in res.error


def test_no_valid_platform_errors():
    res = UnifiedPoster().post("hi", ["myspace"], video_url="https://x/clip.mp4")
    assert res.ok is False and "no supported platforms" in res.error


def test_live_post_transmits_via_injected_http():
    sent = {}

    def fake_http(url, body, headers):
        sent["url"] = url; sent["body"] = body; sent["auth"] = headers["Authorization"]
        return {"status": "success", "postIds": ["ig_1", "tt_1"]}

    poster = UnifiedPoster(api_key="secret", http=fake_http)
    res = poster.post("watch this", ["instagram", "tiktok"],
                      video_url="https://x/clip.mp4", live=True)
    assert res.ok is True and res.live is True
    assert sent["url"].endswith("/api/post")
    assert sent["body"]["platforms"] == ["instagram", "tiktok"]
    assert sent["auth"] == "Bearer secret"
    assert res.provider_response["postIds"] == ["ig_1", "tt_1"]


def test_provider_failure_is_reported_honestly():
    poster = UnifiedPoster(api_key="k", http=lambda u, b, h: {"status": "error", "errors": ["bad"]})
    res = poster.post("x", ["youtube"], video_url="https://x/clip.mp4", live=True)
    assert res.ok is False and res.live is True


def test_http_exception_does_not_crash_worker():
    def boom(u, b, h):
        raise RuntimeError("network down")
    res = UnifiedPoster(api_key="k", http=boom).post(
        "x", ["youtube"], video_url="https://x/clip.mp4", live=True)
    assert res.ok is False and "network down" in res.error
