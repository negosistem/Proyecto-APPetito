"""
Script para actualizar el correo del Super Admin (Modo Argumentos)
"""
import sys
import os
import argparse

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
            
        # Actualizar email
        user.email = new_email
        if new_password:
            user.password_hash = get_password_hash(new_password)
            print(f"🔐 Contraseña actualizada")
            
        db.commit()
        db.refresh(user)
        
        print("\n" + "="*70)
        print("✅ SUPER ADMIN ACTUALIZADO")
        print("="*70)
        print(f"📧 Nuevo Email:    {user.email}")
        print(f"👤 Nombre:         {user.nombre}")
        print("="*70)
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al actualizar: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Actualizar Super Admin')
    parser.add_argument('--current', default="admin@appetito.com", help='Email actual')
    parser.add_argument('--new', required=True, help='Nuevo email')
    parser.add_argument('--password', help='Nueva contraseña')

    args = parser.parse_args()
    
    success = update_superadmin_email(args.current, args.new, args.password)
    sys.exit(0 if success else 1)
