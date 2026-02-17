"""
Script para crear Super Administrador Global del SaaS.

El Super Admin NO pertenece a ninguna empresa (id_empresa = NULL)
y puede gestionar todas las empresas del sistema.

Uso:
    python -m scripts.create_superadmin
"""
import sys
import os

# Agregar el directorio Backend al path para imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.utils.security import get_password_hash
from getpass import getpass


def create_superadmin():
    """Crear Super Administrador Global"""
    db = SessionLocal()
    
    try:
        # Verificar que el rol super_admin existe
        role = db.query(Role).filter(Role.name == "super_admin").first()
        if not role:
            print("\n❌ ERROR: El rol 'super_admin' no existe en la base de datos.")
            print("   Ejecuta la migración primero:")
            print("   alembic upgrade head\n")
            return
        
        print("\n" + "="*70)
        print("CREAR SUPER ADMINISTRADOR GLOBAL (SaaS APPetito)")
        print("="*70)
        print("⚠️  IMPORTANTE:")
        print("   - Super Admin NO pertenece a ninguna empresa")
        print("   - Puede gestionar TODAS las empresas del sistema")
        print("   - Tiene acceso total a datos de todas las empresas")
        print("="*70 + "\n")
        
        # Solicitar datos
        email = input("📧 Email: ").strip()
        if not email:
            print("❌ Email no puede estar vacío")
            return
        
        nombre = input("👤 Nombre completo: ").strip()
        if not nombre:
            print("❌ Nombre no puede estar vacío")
            return
        
        password = getpass("🔐 Contraseña: ")
        password_confirm = getpass("🔐 Confirmar contraseña: ")
        
        if not password or len(password) < 6:
            print("❌ Contraseña debe tener al menos 6 caracteres")
            return
        
        if password != password_confirm:
            print("❌ Las contraseñas no coinciden")
            return
        
        # Validar que el email no existe
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"\n❌ ERROR: El email '{email}' ya está registrado")
            return
        
        # Crear Super Admin SIN empresa (id_empresa = NULL)
        superadmin = User(
            email=email,
            nombre=nombre,
            password_hash=get_password_hash(password),
            role_id=role.id,
            id_empresa=None,  # ← CRÍTICO: NULL para super admin
            is_active=True
        )
        
        db.add(superadmin)
        db.commit()
        db.refresh(superadmin)
        
        print("\n" + "="*70)
        print("✅ SUPER ADMIN CREADO EXITOSAMENTE")
        print("="*70)
        print(f"📧 Email:    {superadmin.email}")
        print(f"👤 Nombre:   {superadmin.nombre}")
        print(f"🎭 Rol:      Super Administrador Global")
        print(f"🏢 Empresa:  Ninguna (gestiona todas)")
        print(f"✅ Estado:   Activo")
        print()
        print("Ahora puedes:")
        print("  1. Iniciar sesión con estas credenciales")
        print("  2. Acceder a /api/superadmin/* endpoints")
        print("  3. Gestionar todas las empresas del sistema")
        print("="*70 + "\n")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    create_superadmin()
