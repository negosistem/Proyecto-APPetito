"""
Script to add the turno column to the users table.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, engine
from sqlalchemy import text

def add_turno_column():
    db = SessionLocal()
    
    try:
        # Check if column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='turno'
        """))
        
        if result.fetchone():
            print("✅ La columna 'turno' ya existe")
            return
        
        # Add the column
        print("🔧 Agregando columna 'turno' a la tabla users...")
        db.execute(text("ALTER TABLE users ADD COLUMN turno VARCHAR"))
        db.commit()
        print("✅ Columna 'turno' agregada exitosamente!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Actualizando esquema de base de datos...\n")
    add_turno_column()
