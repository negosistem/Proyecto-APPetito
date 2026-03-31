"""add order item modifier snapshots

Revision ID: e5f6a7b8c9d0
Revises: c8f3a1b2d5e6
Create Date: 2026-03-30 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "e5f6a7b8c9d0"
down_revision = "c8f3a1b2d5e6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "order_items",
        sa.Column(
            "modifiers_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("order_items", "modifiers_snapshot", server_default=None)


def downgrade():
    op.drop_column("order_items", "modifiers_snapshot")
