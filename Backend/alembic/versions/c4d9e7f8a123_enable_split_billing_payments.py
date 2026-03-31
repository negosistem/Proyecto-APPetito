"""enable split billing payments

Revision ID: c4d9e7f8a123
Revises: 8a0e3dd37ef7
Create Date: 2026-03-30 22:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d9e7f8a123"
down_revision: Union[str, Sequence[str], None] = "8a0e3dd37ef7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("amount", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "payments",
        sa.Column(
            "discount_amount",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0",
        ),
    )

    op.execute(
        """
        UPDATE payments
        SET amount = COALESCE(total_amount, 0),
            discount_amount = COALESCE(discount_amount, 0)
        """
    )
    op.alter_column("payments", "amount", nullable=False)

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
    op.drop_column("payments", "discount_amount")
    op.drop_column("payments", "amount")
