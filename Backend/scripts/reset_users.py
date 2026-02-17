"""
Script to reset the users table: deletes all users and creates a single admin user.
"""
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash
from sqlalchemy import text

def reset_users():
    db = SessionLocal()
    
    try:
        print("🗑️  Limpiando base de datos...")
        
        # 1. Eliminar órdenes primero (para evitar error de FK)
        print("   - Eliminando historial de órdenes...")
        db.execute(text("DELETE FROM order_items"))
        db.execute(text("DELETE FROM orders"))
        
        # 2. Eliminar usuarios
        print("   - Eliminando todos los usuarios...")
        db.query(User).delete()
        db.commit()
        print("✅ Base de datos limpiada.")
        
        # Create new single admin user
        print("👤 Creando usuario Admin único...")
        admin_user = User(
            nombre="Admin",
            email="admin@appetito.com",
            password_hash=get_password_hash("admin123"),
            role="admin",
            turno="Mañana",
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n" + "="*50)
        print(f"✨ Base de datos de usuarios reseteada!")
        print("="*50)
        print("📝 Nuevas credenciales únicas:")
        print(f"   Email:    {admin_user.email}")
        print(f"   Password: admin123")
        print("="*50)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_users()
