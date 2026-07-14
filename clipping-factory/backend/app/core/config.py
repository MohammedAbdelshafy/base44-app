"""
Central configuration — all values read from environment variables.
No hardcoded secrets or paths. Add new settings here; import Settings everywhere.
"""
from functools import lru_cache
from typing import Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=["../.env", ".env"],  # load parent dir first (project root), then local override
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: Literal["development", "production", "test"] = "development"
    app_secret_key: str = "change-me"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://clipuser:clippass@localhost:5432/clipping_factory"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Storage
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"
    storage_bucket_source: str = "source-content"
    storage_bucket_clips: str = "clips"
    storage_bucket_deliverables: str = "deliverables"
    storage_region: str = "us-east-1"
    storage_use_ssl: bool = False

    # AI
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    runware_api_key: str = ""
    ai_primary_model: str = "claude-fable-5"
    ai_fast_model: str = "claude-opus-4-8"
    ai_max_tokens: int = 16000
    ai_temperature: float = 0.3
    ai_cost_cap_per_campaign: float = 2.00
    # Prompt caching — marks system prompts with cache_control for ~90% token savings
    ai_cache_system_prompt: bool = True
    # Extended thinking:
    #   Fable 5 — always on; AI_EFFORT_LEVEL controls depth (budget_tokens is rejected).
    #   Opus 4.8 — uses thinking: {type: "adaptive"} when this is True.
    ai_extended_thinking: bool = True
    ai_thinking_budget: int = 16000   # Opus 4.8 only; ignored for Fable 5
    # Fable 5 reasoning depth: low | medium | high | xhigh | max
    ai_effort_level: str = "high"

    # Gemini free tier (aistudio.google.com → Get API key — FREE)
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    gemini_model: str = "gemini-2.0-flash"   # best free model: 1M ctx, fast

    # Ollama local (completely free — no key, no internet, already pulled qwen2.5:7b)
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "qwen2.5:7b"

    # Whisper
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    # Video
    ffmpeg_path: str = ""  # empty = auto-resolved via imageio_ffmpeg at runtime
    max_video_duration_seconds: int = 7200
    max_clip_duration_seconds: int = 180
    min_clip_duration_seconds: int = 15
    video_temp_dir: str = "C:/temp/clips"

    # Clipping.com
    clipping_base_url: str = "https://clipping.com"
    clipping_email: str = ""
    clipping_password: str = ""
    clipping_auth_method: str = "email"   # email | discord | google
    clipping_scan_interval_seconds: int = 300
    clipping_max_campaigns_per_scan: int = 20
    clipping_session_refresh_hours: int = 12

    # Demo mode: seed fake campaigns instead of real scraping. Auto-on when no credentials.
    clipping_demo_mode: bool = False

    # ---- Social publishing (browser automation via Playwright) --------------
    # Comma-separated platforms to auto-publish to, e.g. "tiktok,instagram,youtube".
    publish_platforms: str = "tiktok,instagram,youtube"
    publish_headless: bool = True
    publish_slow_mo_ms: int = 0          # add delay between actions to dodge anti-bot
    publish_timeout_ms: int = 45000
    # Publish a clip to socials automatically after it passes QC (mirrors auto_submit).
    auto_publish: bool = False
    # Per-platform session state as JSON (Playwright storage_state or cookie array).
    # Paste an exported logged-in session here; empty => simulated (mock) publish.
    tiktok_session_state: str = ""
    instagram_session_state: str = ""
    youtube_session_state: str = ""

    @property
    def publish_platform_list(self) -> list[str]:
        from app.models.social_post import SocialPlatform
        raw = [p.strip().lower() for p in self.publish_platforms.split(",") if p.strip()]
        return SocialPlatform.resolve(raw)

    def social_session_state(self, platform: str) -> str:
        return {
            "tiktok": self.tiktok_session_state,
            "instagram": self.instagram_session_state,
            "youtube": self.youtube_session_state,
        }.get(platform, "")

    @property
    def demo_mode(self) -> bool:
        _placeholders = {"", "your@email.com", "your_password", "change-me"}
        no_creds = (
            self.clipping_email in _placeholders
            or self.clipping_password in _placeholders
        )
        return self.clipping_demo_mode or no_creds

    # Processing
    max_concurrent_campaigns: int = 3
    max_clips_per_campaign: int = 10
    clip_score_threshold: float = 0.65
    auto_submit: bool = False

    # Alerts
    alert_webhook_url: str = ""
    alert_email: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""

    # Admin
    admin_username: str = "admin"
    admin_password: str = "change-me-admin-password"

    @field_validator("admin_password")
    @classmethod
    def validate_admin_password(cls, v: str) -> str:
        if v == "change-me-admin-password":
            import warnings
            warnings.warn(
                "SECURITY: admin_password is set to the default value. "
                "Set ADMIN_PASSWORD env var before deploying to production.",
                stacklevel=2,
            )
        if len(v) < 8:
            raise ValueError("admin_password must be at least 8 characters")
        return v

    @field_validator("ffmpeg_path")
    @classmethod
    def resolve_ffmpeg_path(cls, v: str) -> str:
        if v:
            return v
        try:
            import shutil
            sys_ffmpeg = shutil.which("ffmpeg")
            if sys_ffmpeg:
                return sys_ffmpeg
        except Exception:
            pass
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return "ffmpeg"

    @field_validator("database_url")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if "postgresql://" in v and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://")
        return v

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def storage_public_url(self) -> str:
        return self.storage_endpoint


@lru_cache
def get_settings() -> Settings:
    return Settings()
