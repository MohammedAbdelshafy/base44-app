"""Add docs_url to campaigns

Revision ID: 002_add_docs_url
Revises: 001_initial
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa

revision = "002_add_docs_url"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("docs_url", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("campaigns", "docs_url")
