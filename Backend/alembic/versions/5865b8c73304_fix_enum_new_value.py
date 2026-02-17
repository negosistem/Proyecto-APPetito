"""fix_enum_new_value

Revision ID: 5865b8c73304
Revises: 4a24f48e6aa6
Create Date: 2026-02-14 10:20:49.948324

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5865b8c73304'
down_revision: Union[str, Sequence[str], None] = '4a24f48e6aa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'new'")



def downgrade() -> None:
    """Downgrade schema."""
    pass
