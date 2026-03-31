"""drop unique index on payments.order_id

Revision ID: d7a9c5f1b2e3
Revises: c4d9e7f8a123
Create Date: 2026-03-30 23:45:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d7a9c5f1b2e3"
down_revision: Union[str, Sequence[str], None] = "c4d9e7f8a123"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            constraint_name text;
        BEGIN
            SELECT tc.constraint_name
            INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'payments'
              AND tc.constraint_type = 'UNIQUE'
              AND kcu.column_name = 'order_id'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', constraint_name);
            END IF;
        END $$;
        """
    )
    op.execute("DROP INDEX IF EXISTS ix_payments_order_id")
    op.execute("CREATE INDEX IF NOT EXISTS ix_payments_order_id ON payments (order_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_payments_order_id")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_payments_order_id ON payments (order_id)")
