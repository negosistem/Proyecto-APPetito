from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
# Use get_settings to retrieve config
from app.core.config import get_settings
from app.models.user import User

# Load settings
settings = get_settings()
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from the JWT token.
    Returns the User object with role and empresa relationships loaded.
    
    🆕 MODIFICADO: Soporta Super Admin sin empresa (id_empresa = NULL)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Eager loading: load User with role and empresa relationships
    user = db.query(User).options(
        joinedload(User.role),
        joinedload(User.empresa)
    ).filter(User.email == email).first()

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # 🆕 VALIDACIÓN SUPER ADMIN: No debe tener empresa
    if user.role and user.role.name == "super_admin":
        if user.id_empresa is not None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error de configuración: Super Admin no debe tener empresa asignada"
            )
        # Super Admin está OK sin empresa
        return user
    
    # 🆕 VALIDACIÓN USUARIOS NORMALES: Deben tener empresa
    if user.id_empresa is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene empresa asignada. Contacta al administrador."
        )
    
    # 🆕 VALIDACIÓN: Empresa debe estar activa
    if user.empresa and not user.empresa.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Empresa '{user.empresa.name}' está suspendida. Contacta al administrador del sistema."
        )

    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin role.
    Raises 403 Forbidden if user is not an admin.
    """
    # Check role.name (User.role is now a relationship object)
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción. Se requiere rol de administrador."
        )
    return current_user

def require_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin or manager role.
    Raises 403 Forbidden if user doesn't have required role.
    Future-proof for when manager role is added.
    """
    allowed_roles = ["admin", "gerente"] # Updated to match seeded roles (manager -> gerente)
    
    if not current_user.role or current_user.role.name not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción. Se requiere rol de administrador o gerente."
        )
    return current_user
