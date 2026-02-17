import sys
import os
from sqlalchemy import create_engine, inspect, text
from app.core.config import get_settings

def check_db():
    settings = get_settings()
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    inspector = inspect(engine)

    print("Checking database state...")
    
    # Check tables
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")

    if 'roles' in tables:
        print("\nTable 'roles' exists.")
        columns = inspector.get_columns('roles')
        print("Columns in 'roles':")
        for col in columns:
            print(f"  - {col['name']} ({col['type']})")
            
        # Check content
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM roles"))
            rows = result.fetchall()
            print(f"Rows in 'roles': {len(rows)}")
            for row in rows:
                print(f"  {row}")
    else:
        print("\nTable 'roles' does NOT exist.")

    if 'users' in tables:
        print("\nTable 'users' exists.")
        columns = inspector.get_columns('users')
        print("Columns in 'users':")
        for col in columns:
            print(f"  - {col['name']} ({col['type']})")
    
if __name__ == "__main__":
    check_db()
