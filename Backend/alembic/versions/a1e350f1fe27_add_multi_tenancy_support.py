"""add_multi_tenancy_support

Revision ID: a1e350f1fe27
Revises: 715f24a7fd89
Create Date: 2026-02-10 15:25:24.737861

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1e350f1fe27'
down_revision: Union[str, Sequence[str], None] = '715f24a7fd89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add multi-tenancy support."""
    
    # Step 1: Create companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('subscription_status', sa.String(length=50), server_default='trial'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_email'), 'companies', ['email'], unique=True)
    op.create_index(op.f('ix_companies_id'), 'companies', ['id'], unique=False)
    op.create_index(op.f('ix_companies_name'), 'companies', ['name'], unique=False)
    
    # Step 2: Insert default company
    op.execute("""
        INSERT INTO companies (name, email, is_active, subscription_status, created_at)
        VALUES ('Empresa 1', NULL, true, 'active', now())
    """)
    
    # Step 3: Add id_empresa column to all tables (nullable initially)
    tables_to_update = [
        'users',
        'products', 
        'tables',
        'customers',
        'orders',
        'order_items',
        'payments',
        'expenses',
        'audit_logs'
    ]
    
    for table_name in tables_to_update:
        op.add_column(table_name, sa.Column('id_empresa', sa.Integer(), nullable=True))
    
    # Step 4: Backfill id_empresa with default company ID (1)
    for table_name in tables_to_update:
        op.execute(f"UPDATE {table_name} SET id_empresa = 1")
    
    # Step 5: Make id_empresa NOT NULL and add foreign key constraints + indexes
    for table_name in tables_to_update:
        op.alter_column(table_name, 'id_empresa', nullable=False)
        op.create_foreign_key(
            f'fk_{table_name}_id_empresa_companies',
            table_name, 'companies',
            ['id_empresa'], ['id']
        )
        op.create_index(op.f(f'ix_{table_name}_id_empresa'), table_name, ['id_empresa'], unique=False)


def downgrade() -> None:
    """Downgrade schema: remove multi-tenancy support."""
    
    tables_to_update = [
        'users',
        'products',
        'tables',
        'customers',
        'orders',
        'order_items',
        'payments',
        'expenses',
        'audit_logs'
    ]
    
    # Remove indexes, foreign keys, and columns
    for table_name in tables_to_update:
        op.drop_index(op.f(f'ix_{table_name}_id_empresa'), table_name=table_name)
        op.drop_constraint(f'fk_{table_name}_id_empresa_companies', table_name, type_='foreignkey')
        op.drop_column(table_name, 'id_empresa')
    
    # Drop companies table indexes and table
    op.drop_index(op.f('ix_companies_name'), table_name='companies')
    op.drop_index(op.f('ix_companies_id'), table_name='companies')
    op.drop_index(op.f('ix_companies_email'), table_name='companies')
    op.drop_table('companies')
