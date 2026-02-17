from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.modules.roles import schemas
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[schemas.RoleRead])
def get_all_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all active roles. Available to all authenticated users."""
    roles = db.query(Role).filter(Role.is_active == True).all()
    return roles

@router.post("/", response_model=schemas.RoleRead, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new role. Admin only."""
    # Check if role name already exists
    existing = db.query(Role).filter(Role.name == role_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol ya existe"
        )
    
    db_role = Role(**role_in.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

@router.get("/{role_id}", response_model=schemas.RoleRead)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get role by ID."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role
