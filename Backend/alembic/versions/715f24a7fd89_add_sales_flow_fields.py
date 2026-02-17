"""add_sales_flow_fields

Revision ID: 715f24a7fd89
Revises: e9677e2fb6b9
Create Date: 2026-02-10 07:13:48.895934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '715f24a7fd89'
down_revision: Union[str, Sequence[str], None] = 'e9677e2fb6b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add sales flow fields."""
    
    # 1. Add new columns to orders table
    op.add_column('orders', sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=True))
    op.add_column('orders', sa.Column('subtotal', sa.Numeric(10, 2), server_default='0', nullable=True))
    op.add_column('orders', sa.Column('tax', sa.Numeric(10, 2), server_default='0', nullable=True))
    op.add_column('orders', sa.Column('discount', sa.Numeric(10, 2), server_default='0', nullable=True))
    
    # 2. Backfill existing orders: set subtotal = total, tax = 0, discount = 0
    op.execute("""
        UPDATE orders 
        SET subtotal = total::numeric, 
            tax = 0, 
            discount = 0
        WHERE subtotal IS NULL
    """)
    
    # 3. Change total column type from Float to Numeric
    op.alter_column('orders', 'total',
                    type_=sa.Numeric(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=True,
                    server_default='0')
    
    # 4. Add new columns to order_items table
    op.add_column('order_items', sa.Column('product_name', sa.String(255), nullable=True))
    op.add_column('order_items', sa.Column('subtotal', sa.Numeric(10, 2), nullable=True))
    op.add_column('order_items', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    
    # 5. Backfill existing order_items: get product_name from products table, calculate subtotal
    op.execute("""
        UPDATE order_items 
        SET product_name = products.name,
            subtotal = order_items.price::numeric * order_items.quantity
        FROM products
        WHERE order_items.product_id = products.id
        AND order_items.product_name IS NULL
    """)
    
    # 6. Make product_name and subtotal NOT NULL after backfill
    op.alter_column('order_items', 'product_name', nullable=False)
    op.alter_column('order_items', 'subtotal', nullable=False)
    
    # 7. Change price column type from Float to Numeric in order_items
    op.alter_column('order_items', 'price',
                    type_=sa.Numeric(10, 2),
                    existing_type=sa.Float(),
                    existing_nullable=False)
    
    # 8. Update order_items foreign key to add CASCADE delete
    op.drop_constraint('order_items_order_id_fkey', 'order_items', type_='foreignkey')
    op.create_foreign_key('order_items_order_id_fkey', 'order_items', 'orders', ['order_id'], ['id'], ondelete='CASCADE')
    
    # 9. Add new columns to payments table
    op.add_column('payments', sa.Column('invoice_number', sa.String(50), nullable=True))
    op.add_column('payments', sa.Column('tax', sa.Numeric(10, 2), server_default='0', nullable=True))
    
    # 10. Generate invoice numbers for existing payments
    op.execute("""
        UPDATE payments
        SET invoice_number = 'FAC-LEGACY-' || LPAD(id::text, 6, '0'),
            tax = 0
        WHERE invoice_number IS NULL
    """)
    
    # 11. Make invoice_number NOT NULL and add unique constraint
    op.alter_column('payments', 'invoice_number', nullable=False)
    op.create_index('ix_payments_invoice_number', 'payments', ['invoice_number'], unique=True)


def downgrade() -> None:
    """Downgrade schema - Remove sales flow fields."""
    
    # Remove indexes and constraints
    op.drop_index('ix_payments_invoice_number', 'payments')
    
    # Remove columns from payments
    op.drop_column('payments', 'tax')
    op.drop_column('payments', 'invoice_number')
    
    # Restore order_items foreign key
    op.drop_constraint('order_items_order_id_fkey', 'order_items', type_='foreignkey')
    op.create_foreign_key('order_items_order_id_fkey', 'order_items', 'orders', ['order_id'], ['id'])
    
    # Change price back to Float
    op.alter_column('order_items', 'price',
                    type_=sa.Float(),
                    existing_type=sa.Numeric(10, 2))
    
    # Remove columns from order_items
    op.drop_column('order_items', 'created_at')
    op.drop_column('order_items', 'subtotal')
    op.drop_column('order_items', 'product_name')
    
    # Change total back to Float
    op.alter_column('orders', 'total',
                    type_=sa.Float(),
                    existing_type=sa.Numeric(10, 2))
    
    # Remove columns from orders
    op.drop_column('orders', 'discount')
    op.drop_column('orders', 'tax')
    op.drop_column('orders', 'subtotal')
    op.drop_column('orders', 'customer_id')
