import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal

def clean_tables():
    db = SessionLocal()
    try:
        # Delete all records from tables
        # Using text() for direct SQL DELETE or we can use db.query(TableModel).delete()
        # Direct SQL is often cleaner for "cleaning" scripts to avoid Cascade issues if not configured, 
        # though ORM is safer. Given the relationship, let's try ORM first but generic.
        
        print("Cleaning 'tables' table...")
        # Note: We need to be careful with foreign keys (orders). 
        # If there are orders linked to tables, this might fail unless we cascade or clean orders too.
        # Assuming for now we just want to clean tables and existing orders linked might set null or cascade.
        # Let's use TRUNCATE CASCADE if it's postgres to be sure, or DELETE.
        
        db.execute(text("TRUNCATE TABLE tables CASCADE;"))
        db.commit()
        print("Tables table cleaned successfully.")
        
    except Exception as e:
        print(f"Error cleaning tables: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_tables()
