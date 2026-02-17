from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users:")
        for user in users:
            role_name = user.role.name if user.role else "No Role"
            print(f"ID: {user.id} | Name: {user.nombre} | Email: {user.email} | Role: {role_name} | Active: {user.is_active}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
