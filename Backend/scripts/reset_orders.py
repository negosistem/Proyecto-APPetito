import sys
import os

# Add parent directory to path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.order import Order, OrderItem, OrderItemState
from app.models.payment import Payment

def reset_orders():
    db: Session = SessionLocal()
    try:
        print("Starting Order Reset...")

        # 1. Delete Payments
        deleted_payments = db.query(Payment).delete()
        print(f"Deleted {deleted_payments} payments.")

        # 2. Delete OrderItemStates (if not cascaded by OrderItem)
        # Check model: OrderItem has cascade="all, delete-orphan", so deleting items should delete states.
        # But to be safe and explicit:
        deleted_states = db.query(OrderItemState).delete()
        print(f"Deleted {deleted_states} order item states.")

        # 3. Delete OrderItems
        deleted_items = db.query(OrderItem).delete()
        print(f"Deleted {deleted_items} order items.")

        # 4. Delete Orders
        deleted_orders = db.query(Order).delete()
        print(f"Deleted {deleted_orders} orders.")

        db.commit()
        print("Successfully reset all orders and related data.")

    except Exception as e:
        print(f"Error resetting orders: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_orders()
