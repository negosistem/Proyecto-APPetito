"""
Script to add sample staff members to the database.
Run this script once to populate the database with example employees.
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

def create_sample_staff():
    db = SessionLocal()
    
    try:
        # Sample staff members
        sample_staff = [
            {
                "nombre": "Carlos Gómez",
                "email": "carlos@appetito.com",
                "password": "admin123",
                "role": "admin",
                "turno": "Mañana",
                "is_active": True
            },
            {
                "nombre": "Laura Díaz",
                "email": "laura@appetito.com",
                "password": "cocina123",
                "role": "cocina",
                "turno": "Tarde",
                "is_active": True
            },
            {
                "nombre": "Miguel Ángel",
                "email": "miguel@appetito.com",
                "password": "mesero123",
                "role": "mesero",
                "turno": "Noche",
                "is_active": True
            },
            {
                "nombre": "Sofía Torres",
                "email": "sofia@appetito.com",
                "password": "mesero123",
                "role": "mesero",
                "turno": "Mañana",
                "is_active": False
            },
            {
                "nombre": "Roberto Sánchez",
                "email": "roberto@appetito.com",
                "password": "cocina123",
                "role": "cocina",
                "turno": "Tarde",
                "is_active": True
            }
        ]
        
        created_count = 0
        skipped_count = 0
        
        for staff_data in sample_staff:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == staff_data["email"]).first()
            
            if existing_user:
                print(f"⚠️  Usuario {staff_data['email']} ya existe, saltando...")
                skipped_count += 1
                continue
            
            # Create new user
            new_user = User(
                nombre=staff_data["nombre"],
                email=staff_data["email"],
                password_hash=get_password_hash(staff_data["password"]),
                role=staff_data["role"],
                turno=staff_data.get("turno"),
                is_active=staff_data["is_active"]
            )
            
            db.add(new_user)
            print(f"✅ Creado: {staff_data['nombre']} ({staff_data['role']}) - {staff_data['email']}")
            created_count += 1
        
        db.commit()
        
        print("\n" + "="*50)
        print(f"✨ Proceso completado!")
        print(f"   Creados: {created_count}")
        print(f"   Saltados: {skipped_count}")
        print("="*50)
        
        if created_count > 0:
            print("\n📝 Credenciales de acceso:")
            print("-" * 50)
            for staff_data in sample_staff:
                print(f"   {staff_data['email']} / {staff_data['password']}")
            print("-" * 50)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Agregando empleados de ejemplo...\n")
    create_sample_staff()
