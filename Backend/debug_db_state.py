import os
import sys
# Add current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.db.session import engine
from sqlalchemy import text

def check_db():
    try:
        with engine.connect() as conn:
            # Check tables
            res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [r[0] for r in res]
            print(f"TABLES: {tables}")
            
            # Check alembic version
            try:
                res = conn.execute(text("SELECT version_num FROM alembic_version"))
                versions = [r[0] for r in res]
                print(f"ALEMBIC_VERSION: {versions}")
            except Exception as e:
                print(f"ALEMBIC_VERSION error (maybe table missing): {e}")
                
            # If reservations exists, check columns
            if 'reservations' in tables:
                res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'reservations'"))
                columns = [r[0] for r in res]
                print(f"RESERVATIONS_COLUMNS: {columns}")
                
    except Exception as e:
        print(f"Global error: {e}")

if __name__ == "__main__":
    check_db()
