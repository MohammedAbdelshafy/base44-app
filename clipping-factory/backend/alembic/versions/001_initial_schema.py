"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("platform_id", sa.String(255), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("is_paused", sa.Boolean, default=False),
        sa.Column("session_cookie", sa.Text, nullable=True),
        sa.Column("session_expires_at", sa.String(50), nullable=True),
        sa.Column("settings", JSONB, default={}),
        sa.Column("campaigns_completed", sa.Integer, default=0),
        sa.Column("campaigns_failed", sa.Integer, default=0),
        sa.Column("total_earnings_usd", sa.Float, default=0.0),
        sa.Column("acceptance_rate", sa.Float, default=0.0),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "campaigns",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("platform_campaign_id", sa.String(255), nullable=False, unique=True),
        sa.Column("page_id", sa.String(36), sa.ForeignKey("pages.id"), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("brand_name", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), default="discovered"),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("priority", sa.Integer, default=5),
        sa.Column("raw_requirements", sa.Text, nullable=True),
        sa.Column("campaign_url", sa.Text, nullable=True),
        sa.Column("requirements", JSONB, default={}),
        sa.Column("source_url", sa.Text, nullable=True),
        sa.Column("source_type", sa.String(50), nullable=True),
        sa.Column("payment_per_accepted_clip", sa.Float, nullable=True),
        sa.Column("estimated_earnings", sa.Float, default=0.0),
        sa.Column("actual_earnings", sa.Float, default=0.0),
        sa.Column("clips_generated", sa.Integer, default=0),
        sa.Column("clips_submitted", sa.Integer, default=0),
        sa.Column("clips_accepted", sa.Integer, default=0),
        sa.Column("clips_rejected", sa.Integer, default=0),
        sa.Column("due_at", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("retry_count", sa.Integer, default=0),
        sa.Column("intelligence_notes", sa.Text, nullable=True),
        sa.Column("opportunity_score", sa.Float, default=0.0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_campaigns_status", "campaigns", ["status"])
    op.create_index("ix_campaigns_page_id", "campaigns", ["page_id"])

    op.create_table(
        "source_contents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("campaign_id", sa.String(36), sa.ForeignKey("campaigns.id"), nullable=False),
        sa.Column("source_url", sa.Text, nullable=True),
        sa.Column("source_type", sa.String(50)),
        sa.Column("original_title", sa.String(512), nullable=True),
        sa.Column("storage_bucket", sa.String(255)),
        sa.Column("storage_key", sa.Text),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=True),
        sa.Column("checksum_md5", sa.String(64), nullable=True),
        sa.Column("duration_seconds", sa.Float, nullable=True),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("fps", sa.Float, nullable=True),
        sa.Column("codec", sa.String(50), nullable=True),
        sa.Column("audio_codec", sa.String(50), nullable=True),
        sa.Column("extra_metadata", JSONB, default={}),
        sa.Column("status", sa.String(50), default="downloading"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "transcripts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_content_id", sa.String(36), sa.ForeignKey("source_contents.id"), nullable=False, unique=True),
        sa.Column("full_text", sa.Text, nullable=True),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("segments", JSONB, default=[]),
        sa.Column("speakers", JSONB, default=[]),
        sa.Column("viral_moments", JSONB, default=[]),
        sa.Column("clip_candidates", JSONB, default=[]),
        sa.Column("whisper_model", sa.String(50), nullable=True),
        sa.Column("processing_time_seconds", sa.Float, nullable=True),
        sa.Column("status", sa.String(50), default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "clips",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("campaign_id", sa.String(36), sa.ForeignKey("campaigns.id"), nullable=False),
        sa.Column("source_content_id", sa.String(36), sa.ForeignKey("source_contents.id"), nullable=False),
        sa.Column("source_start_seconds", sa.Float, nullable=False),
        sa.Column("source_end_seconds", sa.Float, nullable=False),
        sa.Column("storage_bucket", sa.String(255), nullable=True),
        sa.Column("storage_key", sa.Text, nullable=True),
        sa.Column("duration_seconds", sa.Float, nullable=True),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("fps", sa.Float, nullable=True),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("hook_text", sa.Text, nullable=True),
        sa.Column("captions_srt", sa.Text, nullable=True),
        sa.Column("caption_style", sa.String(100), nullable=True),
        sa.Column("overall_score", sa.Float, default=0.0),
        sa.Column("scores", JSONB, default={}),
        sa.Column("edit_template", sa.String(255), nullable=True),
        sa.Column("edits_applied", JSONB, default=[]),
        sa.Column("status", sa.String(50), default="generating"),
        sa.Column("qc_notes", sa.Text, nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("reviewed_by", sa.String(255), nullable=True),
        sa.Column("version", sa.Integer, default=1),
        sa.Column("parent_clip_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_clips_campaign_id", "clips", ["campaign_id"])
    op.create_index("ix_clips_status", "clips", ["status"])

    op.create_table(
        "deliverables",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("clip_id", sa.String(36), sa.ForeignKey("clips.id"), nullable=False, unique=True),
        sa.Column("campaign_id", sa.String(36), sa.ForeignKey("campaigns.id"), nullable=False),
        sa.Column("storage_bucket", sa.String(255)),
        sa.Column("storage_key", sa.Text),
        sa.Column("file_name", sa.String(512)),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=True),
        sa.Column("mime_type", sa.String(100), default="video/mp4"),
        sa.Column("validation_passed", sa.Boolean, default=False),
        sa.Column("validation_details", JSONB, default={}),
        sa.Column("status", sa.String(50), default="ready"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("deliverable_id", sa.String(36), sa.ForeignKey("deliverables.id"), nullable=False, unique=True),
        sa.Column("campaign_id", sa.String(36), sa.ForeignKey("campaigns.id"), nullable=False),
        sa.Column("page_id", sa.String(36), sa.ForeignKey("pages.id"), nullable=False),
        sa.Column("platform_submission_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), default="pending"),
        sa.Column("outcome", sa.String(50), nullable=True),
        sa.Column("outcome_reason", sa.Text, nullable=True),
        sa.Column("earnings_usd", sa.Float, default=0.0),
        sa.Column("upload_attempts", sa.Integer, default=0),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("submission_metadata", JSONB, default={}),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("campaign_id", sa.String(36), sa.ForeignKey("campaigns.id"), nullable=True),
        sa.Column("task_name", sa.String(255), nullable=False),
        sa.Column("queue", sa.String(100), default="default"),
        sa.Column("status", sa.String(50), default="pending"),
        sa.Column("progress", sa.Integer, default=0),
        sa.Column("progress_message", sa.String(512), nullable=True),
        sa.Column("input_args", JSONB, default={}),
        sa.Column("result", JSONB, default={}),
        sa.Column("started_at", sa.String(50), nullable=True),
        sa.Column("finished_at", sa.String(50), nullable=True),
        sa.Column("duration_seconds", sa.Float, nullable=True),
        sa.Column("attempt", sa.Integer, default=1),
        sa.Column("max_attempts", sa.Integer, default=3),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("error_traceback", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_jobs_celery_task_id", "jobs", ["celery_task_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("entity_type", sa.String(100)),
        sa.Column("entity_id", sa.String(36)),
        sa.Column("action", sa.String(100)),
        sa.Column("actor", sa.String(100), default="system"),
        sa.Column("old_value", sa.Text, nullable=True),
        sa.Column("new_value", sa.Text, nullable=True),
        sa.Column("metadata_json", JSONB, default={}),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])

    op.create_table(
        "daily_analytics",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("date", sa.String(10), unique=True),
        sa.Column("campaigns_discovered", sa.Integer, default=0),
        sa.Column("campaigns_completed", sa.Integer, default=0),
        sa.Column("campaigns_failed", sa.Integer, default=0),
        sa.Column("clips_generated", sa.Integer, default=0),
        sa.Column("clips_submitted", sa.Integer, default=0),
        sa.Column("clips_accepted", sa.Integer, default=0),
        sa.Column("clips_rejected", sa.Integer, default=0),
        sa.Column("acceptance_rate", sa.Float, default=0.0),
        sa.Column("revenue_usd", sa.Float, default=0.0),
        sa.Column("avg_processing_time_seconds", sa.Float, default=0.0),
        sa.Column("total_video_minutes_processed", sa.Float, default=0.0),
        sa.Column("ai_cost_usd", sa.Float, default=0.0),
        sa.Column("storage_bytes_used", sa.Integer, default=0),
        sa.Column("raw_data", JSONB, default={}),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "health_checks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("status", sa.String(50)),
        sa.Column("services", JSONB, default={}),
        sa.Column("cpu_percent", sa.Float, nullable=True),
        sa.Column("memory_percent", sa.Float, nullable=True),
        sa.Column("disk_percent", sa.Float, nullable=True),
        sa.Column("alerts", JSONB, default=[]),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    for table in [
        "health_checks", "daily_analytics", "audit_logs", "jobs",
        "submissions", "deliverables", "clips", "transcripts",
        "source_contents", "campaigns", "pages",
    ]:
        op.drop_table(table)
