"""
Script para crear un usuario admin
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.company import Company
from app.utils.security import get_password_hash

def create_admin_user():
    db: Session = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "admin01@gmail.com").first()
        if existing_user:
            print("❌ El usuario admin01@gmail.com ya existe")
            return
        
        # Get or create admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("❌ El rol 'admin' no existe en la base de datos")
            return
        
        # Get first company (assuming at least one exists)
        company = db.query(Company).first()
        if not company:
            print("❌ No hay empresas en la base de datos. Crea una empresa primero.")
            return
        
        # Create new admin user
        new_user = User(
            nombre="admin01",
            email="admin01@gmail.com",
            password_hash=get_password_hash("admin01"),  # Default password: admin01
            role_id=admin_role.id,
            id_empresa=company.id,
            turno="Mañana",
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("✅ Usuario creado exitosamente:")
        print(f"   Nombre: {new_user.nombre}")
        print(f"   Email: {new_user.email}")
        print(f"   Contraseña: admin01")
        print(f"   Rol: {admin_role.name}")
        print(f"   Empresa: {company.name}")
        
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
