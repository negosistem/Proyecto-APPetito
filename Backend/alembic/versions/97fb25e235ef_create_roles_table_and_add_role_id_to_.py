"""create_roles_table_and_add_role_id_to_users

Revision ID: 97fb25e235ef
Revises: 817be6447b53
Create Date: 2026-02-03 12:06:39.657981

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '97fb25e235ef'
down_revision: Union[str, Sequence[str], None] = '817be6447b53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Clean slate if table exists (safe since we validated it's empty/stale)
    op.execute("DROP TABLE IF EXISTS roles CASCADE")

    # 1. Create roles table
    roles_table = op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # 2. Seed initial roles
    op.bulk_insert(roles_table, [
        {'name': 'admin', 'description': 'Administrador del sistema', 'is_active': True},
        {'name': 'gerente', 'description': 'Gerente del restaurante', 'is_active': True},
        {'name': 'cajero', 'description': 'Cajero', 'is_active': True},
        {'name': 'cocina', 'description': 'Personal de cocina', 'is_active': True},
        {'name': 'mesero', 'description': 'Mesero/Camarero', 'is_active': True},
    ])

    # 3. Add role_id to users (nullable first)
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))

    # 4. Migrate existing roles strings to role_ids
    # Map: admin->admin, mesero->mesero, cocina->cocina. Default to 'mesero' if unknown? 
    # Or strict? Let's use PostgreSQL UPDATE with FROM
    op.execute("""
        UPDATE users 
        SET role_id = roles.id 
        FROM roles 
        WHERE users.role = roles.name
    """)
    
    # Fallback for any user that didn't match (should not happen with standard roles)
    # Assign 'mesero' role to any nulls
    op.execute("""
        UPDATE users 
        SET role_id = (SELECT id FROM roles WHERE name = 'mesero') 
        WHERE role_id IS NULL
    """)

    # 5. Make role_id NOT NULL
    op.alter_column('users', 'role_id', nullable=False)

    # 6. Add Foreign Key
    op.create_foreign_key('fk_users_roles', 'users', 'roles', ['role_id'], ['id'])

    # 7. Drop old role column
    op.drop_column('users', 'role')


def downgrade() -> None:
    # 1. Add back role column
    op.add_column('users', sa.Column('role', sa.VARCHAR(), autoincrement=False, nullable=True))

    # 2. Restore role strings from roles table
    op.execute("""
        UPDATE users 
        SET role = roles.name 
        FROM roles 
        WHERE users.role_id = roles.id
    """)

    # 3. Handle any potential nulls if role_id was somehow lost (unlikely)
    op.execute("UPDATE users SET role = 'mesero' WHERE role IS NULL")

    # 4. Make role NOT NULL
    op.alter_column('users', 'role', nullable=False)

    # 5. Drop role_id column and FK
    op.drop_constraint('fk_users_roles', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')

    # 6. Drop roles table
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
