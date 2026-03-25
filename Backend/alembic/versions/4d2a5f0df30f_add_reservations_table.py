"""Add reservations table

Revision ID: 4d2a5f0df30f
Revises: e939f0ef476b
Create Date: 2026-03-14 11:11:26.475851

"""
from typing import Sequence, Union
    
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4d2a5f0df30f'
down_revision: Union[str, Sequence[str], None] = 'e939f0ef476b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Create reservations table."""
    # Step 1: Create global_audit_logs if it was supposed to be there or just ignore the drop if we don't have it.
    # Actually the previous migration e939f0ef476b doesn't mention it.
    # Looking at the original upgrade, it tried to drop global_audit_logs. 
    # If it's there in the TABLES list from debug_db_state.py, we should drop it if we don't want it.
    # TABLES output: ['alembic_version', 'customers', 'companies', 'users', 'global_audit_logs', 'audit_logs']
    op.drop_table('global_audit_logs')

    # Step 2: Handle Enum creation safely
    # (Check if it exists first)
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservationstatus') THEN CREATE TYPE reservationstatus AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'); END IF; END $$;")

    # Step 3: Create reservations table with correct schema matching the model app/models/reservation.py
    op.create_table(
        'reservations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_empresa', sa.Integer(), nullable=False),
        sa.Column('id_table', sa.Integer(), nullable=True),
        sa.Column('id_customer', sa.Integer(), nullable=True),
        sa.Column('customer_name', sa.String(length=100), nullable=False),
        sa.Column('customer_phone', sa.String(length=20), nullable=False),
        sa.Column('party_size', sa.Integer(), nullable=False),
        sa.Column('reservation_date', sa.DateTime(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', name='reservationstatus', create_type=False), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('arrival_time', sa.Time(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['id_customer'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['id_empresa'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_table'], ['tables.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reservations_id'), 'reservations', ['id'], unique=False)
    op.create_index(op.f('ix_reservations_id_empresa'), 'reservations', ['id_empresa'], unique=False)
    op.create_index('ix_reservation_company_date', 'reservations', ['id_empresa', 'reservation_date',], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_reservation_company_date', table_name='reservations')
    op.drop_index(op.f('ix_reservations_id_empresa'), table_name='reservations')
    op.drop_index(op.f('ix_reservations_id'), table_name='reservations')
    op.drop_table('reservations')
    # Re-create global_audit_logs if needed, but it's likely fine to leave it out for now.

    # ### end Alembic commands ###
