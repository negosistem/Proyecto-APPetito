"""
Script para crear un usuario de prueba aleatorio en la base de datos
"""
import random
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.utils.security import get_password_hash

def create_random_user():
    """Crea un usuario aleatorio para pruebas"""
    db = SessionLocal()
    
    try:
        # Generar datos aleatorios
        random_id = random.randint(1000, 9999)
        nombre = f"Usuario Test {random_id}"
        email = f"test{random_id}@appetito.com"
        password = "password123"  # Contraseña de prueba
        
        # Verificar si el email ya existe
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ El usuario con email {email} ya existe")
            return
        
        # Fetch the role object
        role_name = "admin"
        db_role = db.query(Role).filter(Role.name == role_name).first()
        if not db_role:
            print(f"❌ El rol {role_name} no existe")
            return

        # Crear el usuario
        hashed_password = get_password_hash(password)
        new_user = User(
            nombre=nombre,
            email=email,
            password_hash=hashed_password,
            role=db_role,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("✅ Usuario creado exitosamente!")
        print(f"📧 Email: {email}")
        print(f"🔑 Contraseña: {password}")
        print(f"👤 Nombre: {nombre}")
        print(f"🎭 Rol: {new_user.role.name if new_user.role else 'N/A'}")
        print(f"🆔 ID: {new_user.id}")
        print("\n🌐 Puedes usar estas credenciales para iniciar sesión en:")
        print("   http://localhost:5173")
        
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creando usuario de prueba aleatorio...\n")
    create_random_user()
