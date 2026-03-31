from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.role import Role
from app.models.user import User
from app.modules.users.schemas import User as UserSchema
from app.modules.users.schemas import UserCreate
from app.utils.security import get_password_hash

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    db_user = db.query(User).filter(User.email == user.email.lower()).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_role = db.query(Role).filter(
        Role.name == user.role,
        Role.id_empresa == current_user.id_empresa,
        Role.is_active == True,
    ).first()
    if not db_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El rol '{user.role}' no es válido para tu empresa",
        )

    new_user = User(
        nombre=user.nombre,
        email=user.email.lower(),
        password_hash=get_password_hash(user.password),
        role_id=db_role.id,
        id_empresa=current_user.id_empresa,
        is_active=user.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(User).filter(
        User.id_empresa == current_user.id_empresa
    ).offset(skip).limit(limit).all()
