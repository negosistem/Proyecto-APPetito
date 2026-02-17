
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users:")
        for user in users:
            role_name = user.role.name if user.role else "None"
            print(f"ID: {user.id}, Email: {user.email}, Name: {user.nombre}, Role: {role_name}, Active: {user.is_active}")
            # Print start of hash to verify it's populated
            print(f"   Hash: {user.password_hash[:10]}...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
