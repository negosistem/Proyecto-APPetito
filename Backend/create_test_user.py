from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

def update_admin_user():
    db = SessionLocal()
    try:
        email = "teste@gmail.com"
        password = "12345678"
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User {email} not found. Creating...")
            hashed_password = get_password_hash(password)
            new_user = User(
                email=email,
                password_hash=hashed_password,
                nombre="Admin User",
                role_id=1,        # 1 is 'admin'
                id_empresa=1,     # 1 is 'Empresa 1'
                is_active=True
            )
            db.add(new_user)
        else:
            print(f"Updating password for {email}...")
            user.password_hash = get_password_hash(password)
        
        db.commit()
        print("User updated successfully!")
        
    except Exception as e:
        print(f"Error updating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_admin_user()
