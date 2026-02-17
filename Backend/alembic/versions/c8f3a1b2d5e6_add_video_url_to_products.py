"""Add video_url to products table

Revision ID: c8f3a1b2d5e6
Revises: b2f451c3ab21
Create Date: 2026-02-12 20:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f3a1b2d5e6'
down_revision = 'b2f451c3ab21'
branch_labels = None
depends_on = None


def upgrade():
    # Add video_url column to products table
    op.add_column('products', sa.Column('video_url', sa.String(), nullable=True))


def downgrade():
    # Remove video_url column from products table
    op.drop_column('products', 'video_url')
