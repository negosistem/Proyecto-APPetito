from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.session import get_db
from app.models.user import User
from app.utils.security import verify_password, get_password_hash
from app.core.security import create_access_token
from app.core.dependencies import get_current_user  # ← Importado
from app.modules.auth.schemas import Token
from app.modules.users.schemas import UserCreate, User as UserSchema

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()

    # Note: Corrected 'hashed_password' to 'password_hash' to match User model
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    access_token = create_access_token(
        data={"sub": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Obtener datos del usuario actual autenticado.
    """
    return current_user

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user (public endpoint).
    """
    # Check if email exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user.password)
    
    # Get role object
    db_role = db.query(Role).filter(Role.name == user.role).first()
    if not db_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El rol '{user.role}' no es válido"
        )
    
    # Create new user instance
    new_user = User(
        nombre=user.nombre,
        email=user.email,
        password_hash=hashed_password,
        role=db_role,
        is_active=user.is_active
    )
    
    # Add to DB
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user
