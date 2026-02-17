import sys
import os

# Add parent directory to path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.table import Table, TableStatus
from app.models.order import Order
from app.models.company import Company

def reset_tables():
    db: Session = SessionLocal()
    try:
        # Get company ID (assuming first company or ID 1 for simplicity in this context)
        company = db.query(Company).first()
        if not company:
            print("No company found. Creating default company...")
            company = Company(name="Default Company", address="Default Address") # Adjust fields as needed
            db.add(company)
            db.commit()
            db.refresh(company)
        
        company_id = company.id
        print(f"Resetting tables for Company ID: {company_id}")

        # 1. Update existing orders to remove table references (avoid FK errors)
        # GLOBAL UPDATE for all orders
        orders_with_tables = db.query(Order).filter(Order.table_id.isnot(None)).all()
        for order in orders_with_tables:
            order.table_id = None
        db.flush() # Flush changes to orders
        print(f"Removed table references from {len(orders_with_tables)} orders (Global).")

        # 2. Delete all existing tables GLOBALLY
        deleted_count = db.query(Table).delete()
        db.commit() # Commit deletion first to free up unique constraints
        print(f"Deleted {deleted_count} existing tables (Global).")

        # 3. Create tables 1-30
        new_tables = []
        for i in range(1, 31):
            table = Table(
                number=str(i),
                capacity=4, # Default capacity
                status=TableStatus.LIBRE,
                id_empresa=company_id,
                is_active=True
            )
            new_tables.append(table)
        
        db.add_all(new_tables)
        db.commit()
        print(f"Successfully created 30 new tables (1-30).")

    except Exception as e:
        print(f"Error resetting tables: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_tables()
