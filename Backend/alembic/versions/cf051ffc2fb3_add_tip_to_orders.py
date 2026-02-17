"""add_tip_to_orders

Revision ID: cf051ffc2fb3
Revises: c8f3a1b2d5e6
Create Date: 2026-02-14 09:08:38.196770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf051ffc2fb3'
down_revision: Union[str, Sequence[str], None] = 'c8f3a1b2d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add tip column to orders table
    op.add_column('orders', sa.Column('tip', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove tip column from orders table
    op.drop_column('orders', 'tip')
