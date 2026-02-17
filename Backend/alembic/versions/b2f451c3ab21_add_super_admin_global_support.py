"""add_super_admin_global_support

Revision ID: b2f451c3ab21
Revises: a1e350f1fe27
Create Date: 2026-02-10 17:48:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b2f451c3ab21'
down_revision = 'a1e350f1fe27'
branch_labels = None
depends_on = None


def upgrade():
    """
    Migración para soporte de Super Admin Global:
    1. Crea rol super_admin
    2. Modifica users.id_empresa para permitir NULL
    3. Crea tabla global_audit_logs
    4. Agrega campos de gestión a companies
    """
    
    # Paso 1: Crear rol super_admin
    op.execute("""
        INSERT INTO roles (name, description)
        VALUES ('super_admin', 'Super Administrador Global - Gestiona todas las empresas del SaaS')
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Paso 2: Modificar users.id_empresa para permitir NULL
    # Primero eliminar la constraint NOT NULL
    op.alter_column('users', 'id_empresa',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # Paso 3: Crear tabla global_audit_logs
    op.create_table('global_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('super_admin_id', sa.Integer(), nullable=False),
        sa.Column('affected_company_id', sa.Integer(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['affected_company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['super_admin_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_global_audit_logs_action'), 'global_audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_global_audit_logs_created_at'), 'global_audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_global_audit_logs_id'), 'global_audit_logs', ['id'], unique=False)
    
    # Paso 4: Agregar campos de gestión a companies
    op.add_column('companies', sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('companies', sa.Column('suspended_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('companies', sa.Column('suspended_by', sa.Integer(), nullable=True))
    op.add_column('companies', sa.Column('suspended_reason', sa.String(length=500), nullable=True))
    op.add_column('companies', sa.Column('max_users', sa.Integer(), nullable=False, server_default='10'))
    op.add_column('companies', sa.Column('max_tables', sa.Integer(), nullable=False, server_default='20'))
    op.add_column('companies', sa.Column('max_products', sa.Integer(), nullable=False, server_default='100'))
    op.add_column('companies', sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), nullable=True, server_default='18.00'))
    op.add_column('companies', sa.Column('currency', sa.String(length=10), nullable=True, server_default='DOP'))
    op.add_column('companies', sa.Column('invoice_prefix', sa.String(length=20), nullable=True, server_default='FAC'))
    
    op.create_foreign_key('fk_companies_suspended_by', 'companies', 'users', ['suspended_by'], ['id'])
    
    # Paso 5: Establecer trial_ends_at para empresas existentes (30 días desde creación)
    op.execute("""
        UPDATE companies
        SET trial_ends_at = created_at + INTERVAL '30 days'
        WHERE trial_ends_at IS NULL AND subscription_status = 'trial';
    """)
    
    print("✅ Super Admin Global: Migración completada exitosamente")


def downgrade():
    """Revertir cambios"""
    
    # Revertir campos de companies
    op.drop_constraint('fk_companies_suspended_by', 'companies', type_='foreignkey')
    op.drop_column('companies', 'invoice_prefix')
    op.drop_column('companies', 'currency')
    op.drop_column('companies', 'tax_rate')
    op.drop_column('companies', 'max_products')
    op.drop_column('companies', 'max_tables')
    op.drop_column('companies', 'max_users')
    op.drop_column('companies', 'suspended_reason')
    op.drop_column('companies', 'suspended_by')
    op.drop_column('companies', 'suspended_at')
    op.drop_column('companies', 'trial_ends_at')
    
    # Eliminar tabla global_audit_logs
    op.drop_index(op.f('ix_global_audit_logs_id'), table_name='global_audit_logs')
    op.drop_index(op.f('ix_global_audit_logs_created_at'), table_name='global_audit_logs')
    op.drop_index(op.f('ix_global_audit_logs_action'), table_name='global_audit_logs')
    op.drop_table('global_audit_logs')
    
    # Restaurar NOT NULL en users.id_empresa
    # NOTA: Esto fallará si hay super_admins creados. Deben eliminarse primero.
    op.alter_column('users', 'id_empresa',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    # Eliminar rol super_admin
    op.execute("DELETE FROM roles WHERE name = 'super_admin';")
