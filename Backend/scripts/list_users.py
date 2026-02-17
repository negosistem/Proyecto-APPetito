"""
Script to list all users in the database.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User

def list_users():
    db = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("❌ No hay usuarios en la base de datos")
            return
        
        print("\n" + "="*70)
        print("📋 USUARIOS EN LA BASE DE DATOS")
        print("="*70)
        
        for user in users:
            status = "✅ Activo" if user.is_active else "❌ Inactivo"
            print(f"\nID: {user.id}")
            print(f"Nombre: {user.nombre}")
            print(f"Email: {user.email}")
            print(f"Rol: {user.role}")
            print(f"Estado: {status}")
            print("-" * 70)
        
        print(f"\nTotal de usuarios: {len(users)}")
        print("="*70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
