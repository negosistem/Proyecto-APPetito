import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role

db = SessionLocal()
try:
    # Check if super_admin role exists
    super_admin_role = db.query(Role).filter(Role.name == 'super_admin').first()
    if not super_admin_role:
        print("Creating super_admin role...")
        super_admin_role = Role(name='super_admin', description='Super Administrator')
        db.add(super_admin_role)
        db.commit()
        db.refresh(super_admin_role)
    
    # Update user
    user = db.query(User).filter(User.email == 'admin@appetito.com').first()
    if user:
        user.role_id = super_admin_role.id
        user.id_empresa = None
        db.commit()
        print(f"User {user.email} updated successfully!")
        print(f"Role ID: {user.role_id}")
        print(f"Company ID: {user.id_empresa}")
    else:
        print("User admin@appetito.com not found.")
finally:
    db.close()
