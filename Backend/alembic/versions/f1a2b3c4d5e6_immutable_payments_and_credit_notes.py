"""immutable payments and credit notes

Revision ID: f1a2b3c4d5e6
Revises: c8f3a1b2d5e6
Create Date: 2026-03-21 11:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = '3bcb72d19708'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Update payments table: Rename invoice_number -> numero_factura
    op.alter_column('payments', 'invoice_number', new_column_name='numero_factura', existing_type=sa.String(length=50))
    
    # Run the legacy data fix requested
    op.execute("UPDATE payments SET numero_factura = CONCAT('FAC-LEGACY-', id) WHERE numero_factura IS NULL")
    
    # 2. Add status column to payments
    payment_status = postgresql.ENUM('CONFIRMED', 'CANCELLED', name='paymentstatus')
    payment_status.create(op.get_bind())
    op.add_column('payments', sa.Column('status', sa.Enum('CONFIRMED', 'CANCELLED', name='paymentstatus'), nullable=False, server_default='CONFIRMED'))
    
    # 3. Create credit_notes table
    op.create_table('credit_notes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('payment_id', sa.Integer(), nullable=False),
    sa.Column('id_empresa', sa.Integer(), nullable=False),
    sa.Column('numero_nc', sa.String(), nullable=False),
    sa.Column('motivo', sa.String(), nullable=False),
    sa.Column('monto', sa.Float(), nullable=False),
    sa.Column('cancelado_por', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['cancelado_por'], ['users.id'], ),
    sa.ForeignKeyConstraint(['id_empresa'], ['companies.id'], ),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('numero_nc'),
    sa.UniqueConstraint('payment_id')
    )
    op.create_index(op.f('ix_credit_notes_id'), 'credit_notes', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_credit_notes_id'), table_name='credit_notes')
    op.drop_table('credit_notes')
    
    op.drop_column('payments', 'status')
    op.execute("DROP TYPE paymentstatus")
    
    op.alter_column('payments', 'numero_factura', new_column_name='invoice_number', existing_type=sa.String(length=50))
