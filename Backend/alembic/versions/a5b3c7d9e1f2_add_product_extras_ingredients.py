"""Add product_extras and product_ingredients tables

Revision ID: a5b3c7d9e1f2
Revises: 4d2a5f0df30f
Create Date: 2026-03-17 15:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5b3c7d9e1f2'
down_revision: Union[str, Sequence[str], None] = '4d2a5f0df30f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create product_extras and product_ingredients tables + seed data."""

    # 1. Create product_extras table
    op.create_table(
        'product_extras',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('id_empresa', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_empresa'], ['companies.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_extras_id'), 'product_extras', ['id'], unique=False)
    op.create_index(op.f('ix_product_extras_product_id'), 'product_extras', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_extras_id_empresa'), 'product_extras', ['id_empresa'], unique=False)

    # 2. Create product_ingredients table
    op.create_table(
        'product_ingredients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('id_empresa', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('removable', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_empresa'], ['companies.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_ingredients_id'), 'product_ingredients', ['id'], unique=False)
    op.create_index(op.f('ix_product_ingredients_product_id'), 'product_ingredients', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_ingredients_id_empresa'), 'product_ingredients', ['id_empresa'], unique=False)


def downgrade() -> None:
    """Drop product_extras and product_ingredients tables."""
    op.drop_index(op.f('ix_product_ingredients_id_empresa'), table_name='product_ingredients')
    op.drop_index(op.f('ix_product_ingredients_product_id'), table_name='product_ingredients')
    op.drop_index(op.f('ix_product_ingredients_id'), table_name='product_ingredients')
    op.drop_table('product_ingredients')

    op.drop_index(op.f('ix_product_extras_id_empresa'), table_name='product_extras')
    op.drop_index(op.f('ix_product_extras_product_id'), table_name='product_extras')
    op.drop_index(op.f('ix_product_extras_id'), table_name='product_extras')
    op.drop_table('product_extras')
