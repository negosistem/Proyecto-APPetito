import sys
import os
import uuid

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.table import Table, TableStatus

def seed_tables():
    db = SessionLocal()
    try:
        # Check if tables exist
        count = db.query(Table).count()
        if count > 0:
            print(f"Tables already exist ({count}). Skipping seed.")
            return

        print("Seeding tables...")
        
        # Mesa 1: 4 personas, Salón, Libre
        table1 = Table(
            number="1",
            capacity=4,
            status=TableStatus.LIBRE,
            location="Salón",
            qr_code=str(uuid.uuid4()),
            is_active=True
        )
        
        # Mesa 2: 6 personas, Terraza, Ocupada
        table2 = Table(
            number="2",
            capacity=6,
            status=TableStatus.OCUPADA,
            location="Terraza",
            qr_code=str(uuid.uuid4()),
            is_active=True
        )

        db.add(table1)
        db.add(table2)
        db.commit()
        
        print(f"Successfully created 2 tables.")
        print(f"Table 1 QR: {table1.qr_code}")
        print(f"Table 2 QR: {table2.qr_code}")

    except Exception as e:
        print(f"Error seeding tables: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_tables()
