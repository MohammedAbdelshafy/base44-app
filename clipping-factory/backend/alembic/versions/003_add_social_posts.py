"""Add social_posts table (publish clips to TikTok/Instagram/YouTube)

Revision ID: 003_add_social_posts
Revises: 002_add_docs_url
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = "003_add_social_posts"
down_revision = "002_add_docs_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "social_posts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("clip_id", sa.String(length=36), sa.ForeignKey("clips.id"), nullable=False),
        sa.Column("campaign_id", sa.String(length=36), sa.ForeignKey("campaigns.id"), nullable=True),
        sa.Column("platform", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("caption", sa.Text, nullable=True),
        sa.Column("title", sa.Text, nullable=True),
        sa.Column("platform_post_id", sa.String(length=255), nullable=True),
        sa.Column("post_url", sa.Text, nullable=True),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("post_metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_social_posts_clip_id", "social_posts", ["clip_id"])
    op.create_index(
        "ix_social_posts_clip_platform", "social_posts", ["clip_id", "platform"]
    )


def downgrade() -> None:
    op.drop_index("ix_social_posts_clip_platform", table_name="social_posts")
    op.drop_index("ix_social_posts_clip_id", table_name="social_posts")
    op.drop_table("social_posts")
