import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == 'admin@appetito.com').first()
    if user:
        print(f"User Email: {user.email}")
        print(f"Role ID: {user.role_id}")
        role = db.query(Role).filter(Role.id == user.role_id).first()
        print(f"Role Name: {role.name if role else 'None'}")
        print(f"Company ID: {user.id_empresa}")
    else:
        print("User admin@appetito.com not found.")
finally:
    db.close()
