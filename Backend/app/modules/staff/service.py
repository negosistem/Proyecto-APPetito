from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.role import Role
from app.utils.security import get_password_hash
from app.modules.staff import schemas

def crear_empleado(db: Session, data: schemas.StaffCreate, id_empresa: int) -> User:
    """
    Creates a new staff member with smart default validation 
    for the selected role and company.
    """
    # 1. Provide a default role_id if passed as id_rol
    assigned_role_id = data.id_rol if data.id_rol else data.role_id

    # 2. Validate that the role exists and belongs to the company
    role = db.query(Role).filter(Role.id == assigned_role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol especificado no existe o no se ha proporcionado"
        )
    
    if role.id_empresa != id_empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El rol no pertenece a esta empresa."
        )

    # 3. Check if email already exists within company
    existing = db.query(User).filter(
        User.email == data.email,
        User.id_empresa == id_empresa
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado"
        )
    
    # 4. Create new user transactionally
    hashed_password = get_password_hash(data.password)
    
    # 5. Resolve modules based on role permissions (or keep it empty if relying purely on permissions JSON)
    final_modules = ""
    if role.permissions:
        enabled_modules = [k for k, v in role.permissions.items() if v is True]
        final_modules = ",".join(enabled_modules)
    elif data.modules:
        final_modules = ",".join(data.modules)
        
    db_staff = User(
        nombre=data.nombre,
        email=data.email,
        password_hash=hashed_password,
        role_id=assigned_role_id,
        turno=data.turno,
        telefono=data.telefono,
        cedula=data.cedula,
        direccion=data.direccion,
        foto=data.foto,
        modules=final_modules,
        custom_permissions=data.permissions,
        is_active=data.is_active,
        id_empresa=id_empresa
    )
    
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    db.refresh(db_staff, ['role'])
    
    return db_staff
