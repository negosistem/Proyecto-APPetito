"""
Script to update existing staff members with turno (shift) information.
"""
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User

def update_staff_turnos():
    db = SessionLocal()
    
    try:
        # Define turno assignments based on email
        turno_assignments = {
            "carlos@appetito.com": "Mañana",
            "laura@appetito.com": "Tarde",
            "miguel@appetito.com": "Noche",
            "sofia@appetito.com": "Mañana",
            "roberto@appetito.com": "Tarde"
        }
        
        updated_count = 0
        
        for email, turno in turno_assignments.items():
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.turno = turno
                print(f"✅ Actualizado: {user.nombre} -> {turno}")
                updated_count += 1
            else:
                print(f"⚠️  Usuario {email} no encontrado")
        
        db.commit()
        
        print("\n" + "="*50)
        print(f"✨ Actualización completada!")
        print(f"   Usuarios actualizados: {updated_count}")
        print("="*50)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Actualizando turnos de empleados...\n")
    update_staff_turnos()
