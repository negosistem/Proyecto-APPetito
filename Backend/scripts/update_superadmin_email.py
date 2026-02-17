"""
Script para actualizar el correo del Super Admin
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

def update_superadmin_email(current_email, new_email, new_password=None):
    """Actualizar email del Super Admin"""
    db = SessionLocal()
    try:
        # Buscar usuario actual
        user = db.query(User).filter(User.email == current_email).first()
        if not user:
            print(f"❌ No se encontró usuario con email '{current_email}'")
            return False

        # Verificar si el nuevo email ya existe
        existing = db.query(User).filter(User.email == new_email).first()
        if existing and existing.id != user.id:
            print(f"❌ El email '{new_email}' ya está en uso por otro usuario")
            return False
            
        # Verificar que sea super admin (opcional, pero recomendado)
        if user.role.name != 'super_admin':
            print(f"⚠️  Advertencia: El usuario '{current_email}' no tiene rol super_admin (Rol actual: {user.role.name})")
            confirm = input("¿Deseas continuar de todos modos? (s/n): ")
            if confirm.lower() != 's':
                return False

        # Actualizar email
        user.email = new_email
        if new_password:
            user.password_hash = get_password_hash(new_password)
            print(f"🔐 Contraseña actualizada")
            
        db.commit()
        db.refresh(user)
        
        print("\n" + "="*70)
        print("✅ USUARIO ACTUALIZADO EXITOSAMENTE")
        print("="*70)
        print(f"📧 Nuevo Email:    {user.email}")
        print(f"👤 Nombre:         {user.nombre}")
        print(f"ID:               {user.id}")
        print("="*70)
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al actualizar: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("--- ACTUALIZAR CORREO SUPER ADMIN ---")
    current = input("Ingrese el correo ACTUAL del Super Admin (default: admin@appetito.com): ") or "admin@appetito.com"
    new = input("Ingrese el NUEVO correo para el Super Admin: ")
    password = input("Ingrese nueva contraseña (dejar en blanco para mantener la actual): ")
    
    if not new:
        print("❌ El nuevo correo es obligatorio")
        sys.exit(1)
        
    success = update_superadmin_email(current, new, password if password else None)
    if success:
        print("\n🎉 Proceso completado.")
    else:
        print("\n❌ Proceso fallido.")
