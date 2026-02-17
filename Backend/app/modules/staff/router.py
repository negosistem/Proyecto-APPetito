from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.modules.staff import schemas
from app.core.dependencies import get_current_user, require_admin
from app.utils.security import get_password_hash

router = APIRouter(
    prefix="/staff",
    tags=["Staff"]
)

@router.get("/", response_model=List[schemas.Staff])
def get_all_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get all staff members of current company.
    Requires admin role.
    """
    staff = db.query(User).options(joinedload(User.role)).filter(
        User.id_empresa == current_user.id_empresa
    ).all()
    return staff

@router.get("/stats", response_model=schemas.StaffStats)
def get_staff_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get staff statistics: total count and count by role for current company.
    """
    total = db.query(func.count(User.id)).filter(
        User.id_empresa == current_user.id_empresa
    ).scalar() or 0
    
    # Count by role (only for current company)
    by_role_query = (
        db.query(Role.name, func.count(User.id))
        .join(User, User.role_id == Role.id)
        .filter(User.id_empresa == current_user.id_empresa)
        .group_by(Role.name)
        .all()
    )
    
    by_role = {role_name: count for role_name, count in by_role_query}
    
    return {"total": total, "by_role": by_role}

@router.post("/", response_model=schemas.Staff, status_code=status.HTTP_201_CREATED)
def create_staff_member(
    staff_in: schemas.StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new staff member.
    Requires admin role.
    """
    # Validate role_id exists
    role = db.query(Role).filter(Role.id == staff_in.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol especificado no existe"
        )

    # Check if email already exists within company
    existing = db.query(User).filter(
        User.email == staff_in.email,
        User.id_empresa == current_user.id_empresa
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Hash the password
    hashed_password = get_password_hash(staff_in.password)
    
    # Create new user instance for current company
    db_staff = User(
        nombre=staff_in.nombre,
        email=staff_in.email,
        password_hash=hashed_password,
        role_id=staff_in.role_id,
        turno=staff_in.turno,
        is_active=staff_in.is_active,
        id_empresa=current_user.id_empresa
    )
    
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    db.refresh(db_staff, ['role'])
    return db_staff

@router.get("/me", response_model=schemas.Staff)
def get_current_staff(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    Available to all authenticated users.
    """
    return current_user

@router.get("/{staff_id}", response_model=schemas.Staff)
def get_staff_member(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get staff member by ID (same company).
    Requires admin role.
    """
    staff = db.query(User).options(joinedload(User.role)).filter(
        User.id == staff_id,
        User.id_empresa == current_user.id_empresa
    ).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return staff

@router.patch("/{staff_id}", response_model=schemas.Staff)
def update_staff_member(
    staff_id: int,
    staff_update: schemas.StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update staff member information (same company).
    Requires admin role.
    """
    db_staff = db.query(User).filter(
        User.id == staff_id,
        User.id_empresa == current_user.id_empresa
    ).first()
    if not db_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    
    # Get update data, excluding unset fields
    update_data = staff_update.model_dump(exclude_unset=True)
    
    # Validate role if provided
    if "role_id" in update_data:
        role = db.query(Role).filter(Role.id == update_data["role_id"]).first()
        if not role:
            raise HTTPException(400, "Rol no existe")
            
    # Handle password separately - hash it if provided
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    
    # Apply updates
    for key, value in update_data.items():
        setattr(db_staff, key, value)
    
    db.commit()
    db.refresh(db_staff)
    db.refresh(db_staff, ['role'])
    return db_staff

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_staff_member(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Deactivate a staff member (soft delete) from same company.
    Requires admin role.
    Prevents self-deactivation.
    """
    staff = db.query(User).filter(
        User.id == staff_id,
        User.id_empresa == current_user.id_empresa
    ).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    
    # Prevent admin from deactivating themselves
    if staff.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo"
        )
    
    # Soft delete - just mark as inactive
    staff.is_active = False
    db.commit()
    return None
