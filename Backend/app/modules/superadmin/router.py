"""
Router para Super Admin - Gestión Global del SaaS
Permite al Super Admin gestionar todas las empresas, usuarios y ver estadísticas globales.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.company import Company
from app.models.role import Role
from app.models.global_audit_log import GlobalAuditLog
from app.models.product import Product
from app.models.table import Table
from app.models.order import Order
from app.models.payment import Payment
from app.utils.security import get_password_hash
from . import schemas

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])


# ==================== DEPENDENCY: REQUIRE SUPER ADMIN ====================

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency que valida que el usuario es Super Admin.
    Lanza 403 si no lo es.
    """
    if not current_user.role or current_user.role.name != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Solo Super Administradores."
        )
    return current_user


# ==================== HELPER: AUDIT LOG ====================

def log_global_audit(
    db: Session,
    super_admin: User,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    affected_company_id: Optional[int] = None,
    details: Optional[dict] = None
):
    """Registrar acción global en auditoría"""
    log = GlobalAuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        super_admin_id=super_admin.id,
        affected_company_id=affected_company_id,
        details=details
    )
    db.add(log)
    db.commit()


# ==================== GESTIÓN DE EMPRESAS ====================

@router.get("/companies", response_model=List[schemas.CompanyResponse])
def list_companies(
    include_inactive: bool = False,
    subscription_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Listar TODAS las empresas del sistema.
    Solo accesible por Super Admin.
    """
    query = db.query(Company)
    
    if not include_inactive:
        query = query.filter(Company.is_active == True)
    
    if subscription_status:
        query = query.filter(Company.subscription_status == subscription_status)
    
    companies = query.order_by(desc(Company.created_at)).all()
    
    # Agregar conteos de usuarios a cada empresa
    result = []
    for company in companies:
        users_count = db.query(User).filter(User.id_empresa == company.id).count()
        active_users = db.query(User).filter(
            User.id_empresa == company.id,
            User.is_active == True
        ).count()
        
        company_dict = {
            **company.__dict__,
            "users_count": users_count,
            "active_users_count": active_users
        }
        result.append(schemas.CompanyResponse(**company_dict))
    
    return result


@router.post("/companies/setup", status_code=status.HTTP_201_CREATED)
def setup_restaurant(
    data: schemas.RestaurantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Crear un restaurante COMPLETO desde cero en una sola operación atómica.
    Crea: empresa + usuario admin + roles base + 5 mesas + categoría inicial.
    Solo Super Admin puede hacer esto.
    """
    # ── 0. Validaciones previas ────────────────────────────────────────────
    if data.email:
        existing = db.query(Company).filter(Company.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe una empresa con el email '{data.email}'"
            )

    existing_admin = db.query(User).filter(User.email == data.admin.email).first()
    if existing_admin:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un usuario con el email '{data.admin.email}'"
        )

    try:
        # ── 1. Crear empresa ───────────────────────────────────────────────
        trial_ends = datetime.now() + timedelta(days=30) if data.subscription == "trial" else None
        subscription_status = data.subscription if data.subscription != "trial" else "trial"

        new_company = Company(
            name=data.name,
            email=data.email,
            phone=data.phone,
            address=data.address,
            is_active=True,
            subscription_status=subscription_status,
            trial_ends_at=trial_ends,
            max_users=data.max_users,
            max_tables=data.max_tables,
            max_products=data.max_products,
            tax_rate=data.tax_rate or 18.00,
            currency=data.currency or "DOP",
        )
        db.add(new_company)
        db.flush()  # Obtener new_company.id sin commit

        # ── 2. Garantizar que existen los roles base ───────────────────────
        base_roles = [
            ("admin", "Administrador del restaurante"),
            ("gerente", "Gerente de operaciones"),
            ("cajero", "Cajero encargado de cobros"),
            ("mesero", "Mesero atención a clientes"),
            ("cocina", "Personal de cocina"),
        ]
        role_map = {}
        for role_name, role_desc in base_roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=role_desc, is_active=True)
                db.add(role)
                db.flush()
            role_map[role_name] = role

        # ── 3. Crear usuario administrador ────────────────────────────────
        admin_role = role_map["admin"]
        all_modules = "mesas,pedidos,cocina,finanzas,menu,clientes,staff,reportes,configuracion"
        new_admin = User(
            nombre=data.admin.nombre,
            email=data.admin.email,
            password_hash=get_password_hash(data.admin.password),
            id_empresa=new_company.id,
            role_id=admin_role.id,
            is_active=True,
            modules=all_modules,
        )
        db.add(new_admin)

        # ── 4. Crear 5 mesas iniciales ─────────────────────────────────────
        tables_created = 0
        for i in range(1, 6):
            table = Table(
                number=str(i),
                capacity=4,
                status="libre",
                id_empresa=new_company.id,
                is_active=True,
            )
            db.add(table)
            tables_created += 1

        # ── 5. Crear producto placeholder en categoría "Bebidas" ───────────
        placeholder = Product(
            name="Agua Mineral",
            description="Producto de ejemplo — categoría Bebidas",
            price=50.00,
            category="Bebidas",
            id_empresa=new_company.id,
            is_active=True,
            prep_time_minutes=1,
        )
        db.add(placeholder)

        # ── 6. Commit atómico ──────────────────────────────────────────────
        db.commit()
        db.refresh(new_company)
        db.refresh(new_admin)

        # ── 7. Auditoría ───────────────────────────────────────────────────
        log_global_audit(
            db, current_user,
            action="restaurant_setup_complete",
            entity_type="company",
            entity_id=new_company.id,
            affected_company_id=new_company.id,
            details={
                "company_name": new_company.name,
                "admin_email": new_admin.email,
                "subscription": data.subscription,
                "tables_created": tables_created,
            },
        )

        return schemas.RestaurantCreateResponse(
            success=True,
            message=f"Restaurante '{new_company.name}' creado exitosamente",
            company_id=new_company.id,
            company_name=new_company.name,
            admin_email=new_admin.email,
            admin_nombre=new_admin.nombre,
            tables_created=tables_created,
            subscription=data.subscription,
            trial_ends_at=trial_ends,
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear el restaurante: {str(e)}")


@router.post("/companies", status_code=status.HTTP_201_CREATED)
def create_company(
    company_data: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Crear empresa básica (sin setup automático).
    Usado internamente por CompanyFormModal para edición.
    """
    if company_data.email:
        existing = db.query(Company).filter(Company.email == company_data.email).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Email {company_data.email} ya está registrado"
            )

    new_company = Company(
        name=company_data.name,
        email=company_data.email,
        phone=company_data.phone,
        address=company_data.address,
        is_active=True,
        subscription_status="trial",
        trial_ends_at=datetime.now() + timedelta(days=30),
        max_users=company_data.max_users or 10,
        max_tables=company_data.max_tables or 20,
        max_products=company_data.max_products or 100,
        tax_rate=company_data.tax_rate or 18.00,
        currency=company_data.currency or "DOP",
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    log_global_audit(
        db, current_user,
        action="company_created",
        entity_type="company",
        entity_id=new_company.id,
        affected_company_id=new_company.id,
        details={"name": new_company.name, "email": new_company.email},
    )

    return {"success": True, "company": new_company, "message": f"Empresa '{new_company.name}' creada exitosamente"}


@router.get("/companies/{company_id}", response_model=schemas.CompanyResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Obtener detalles de una empresa específica"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Agregar conteos
    users_count = db.query(User).filter(User.id_empresa == company.id).count()
    active_users = db.query(User).filter(
        User.id_empresa == company.id,
        User.is_active == True
    ).count()
    
    company_dict = {
        **company.__dict__,
        "users_count": users_count,
        "active_users_count": active_users
    }
    
    return schemas.CompanyResponse(**company_dict)


@router.put("/companies/{company_id}")
def update_company(
    company_id: int,
    company_data: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Actualizar datos de una empresa"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Actualizar campos proporcionados
    update_data = company_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    
    # Log
    log_global_audit(
        db, current_user,
        action="company_updated",
        entity_type="company",
        entity_id=company.id,
        affected_company_id=company.id,
        details=update_data
    )
    
    return {"success": True, "company": company}


@router.post("/companies/{company_id}/suspend")
def suspend_company(
    company_id: int,
    suspend_data: schemas.CompanySuspend,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Suspender empresa (bloquea acceso a TODOS sus usuarios).
    CRÍTICO: Esto afecta a todos los empleados de esa empresa.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if not company.is_active:
        raise HTTPException(status_code=400, detail="Empresa ya está suspendida")
    
    # Contar usuarios afectados
    users_count = db.query(User).filter(User.id_empresa == company.id).count()
    
    # Suspender empresa
    company.is_active = False
    company.subscription_status = "suspended"
    company.suspended_at = datetime.now()
    company.suspended_by = current_user.id
    company.suspended_reason = suspend_data.reason
    
    db.commit()
    
    # Log
    log_global_audit(
        db, current_user,
        action="company_suspended",
        entity_type="company",
        entity_id=company.id,
        affected_company_id=company.id,
        details={"reason": suspend_data.reason, "users_affected": users_count}
    )
    
    return {
        "success": True,
        "message": f"Empresa '{company.name}' suspendida. {users_count} usuarios afectados.",
        "users_affected": users_count
    }


@router.post("/companies/{company_id}/reactivate")
def reactivate_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Reactivar empresa suspendida"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if company.is_active:
        raise HTTPException(status_code=400, detail="Empresa ya está activa")
    
    # Reactivar
    company.is_active = True
    company.subscription_status = "active"
    company.suspended_at = None
    company.suspended_by = None
    company.suspended_reason = None
    
    db.commit()
    
    # Log
    log_global_audit(
        db, current_user,
        action="company_reactivated",
        entity_type="company",
        entity_id=company.id,
        affected_company_id=company.id
    )
    
    return {"success": True, "message": f"Empresa '{company.name}' reactivada"}


# ==================== GESTIÓN DE USUARIOS CROSS-COMPANY ====================

@router.post("/companies/{company_id}/users", status_code=status.HTTP_201_CREATED)
def create_user_for_company(
    company_id: int,
    user_data: schemas.UserCreateForCompany,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """
    Crear usuario para una empresa específica.
    Solo Super Admin puede hacer esto.
    """
    # Validar que la empresa existe y está activa
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if not company.is_active:
        raise HTTPException(
            status_code=400,
            detail="No se pueden crear usuarios para una empresa suspendida"
        )
    
    # Validar límites de usuarios
    users_count = db.query(User).filter(User.id_empresa == company_id).count()
    if users_count >= company.max_users:
        raise HTTPException(
            status_code=400,
            detail=f"Empresa ha alcanzado el límite de {company.max_users} usuarios"
        )
    
    # Validar email único en la empresa
    existing = db.query(User).filter(
        User.email == user_data.email,
        User.id_empresa == company_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya existe en esta empresa")
    
    # Validar rol
    role = db.query(Role).filter(Role.name == user_data.role).first()
    if not role:
        raise HTTPException(status_code=404, detail=f"Rol '{user_data.role}' no encontrado")
    
    if user_data.role == "super_admin":
        raise HTTPException(status_code=400, detail="No se puede crear Super Admin para una empresa")
    
    # Crear usuario
    new_user = User(
        email=user_data.email,
        nombre=user_data.nombre,
        password_hash=get_password_hash(user_data.password),
        id_empresa=company_id,  # ← Asignación explícita por Super Admin
        role_id=role.id,
        turno=user_data.turno,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log
    log_global_audit(
        db, current_user,
        action="user_created_for_company",
        entity_type="user",
        entity_id=new_user.id,
        affected_company_id=company_id,
        details={
            "user_email": new_user.email,
            "role": user_data.role,
            "company_name": company.name
        }
    )
    
    return {
        "success": True,
        "user": new_user,
        "message": f"Usuario creado para empresa '{company.name}'"
    }


@router.get("/companies/{company_id}/users", response_model=List[schemas.UserResponse])
def get_company_users(
    company_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Ver todos los usuarios de una empresa específica"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    query = db.query(User).options(joinedload(User.role)).filter(User.id_empresa == company_id)
    
    if not include_inactive:
        query = query.filter(User.is_active == True)
    
    users = query.all()
    
    # Convertir a respuesta con role como dict
    result = []
    for user in users:
        user_dict = {
            **user.__dict__,
            "role": {
                "id": user.role.id,
                "name": user.role.name,
                "description": user.role.description
            } if user.role else None
        }
        result.append(schemas.UserResponse(**user_dict))
    
    return result


# ==================== ESTADÍSTICAS GLOBALES ====================

@router.get("/stats/global", response_model=schemas.GlobalStatsResponse)
def get_global_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Estadísticas GLOBALES del SaaS"""
    
    # Empresas
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.is_active == True).count()
    trial_companies = db.query(Company).filter(
        Company.subscription_status == "trial"
    ).count()
    
    # Usuarios totales (excluir super admins)
    total_users = db.query(User).filter(User.id_empresa != None).count()
    active_users = db.query(User).filter(
        User.is_active == True,
        User.id_empresa != None
    ).count()
    
    # Ingresos totales (todas las empresas)
    total_revenue = db.query(func.sum(Payment.total_amount)).scalar() or 0
    
    # Empresas por estado de suscripción
    companies_by_status = db.query(
        Company.subscription_status,
        func.count(Company.id)
    ).group_by(Company.subscription_status).all()
    
    return schemas.GlobalStatsResponse(
        companies={
            "total": total_companies,
            "active": active_companies,
            "suspended": total_companies - active_companies,
            "trial": trial_companies
        },
        users={
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users
        },
        revenue={
            "total": float(total_revenue),
            "currency": "DOP"
        },
        subscription_distribution=[
            {"status": status, "count": count}
            for status, count in companies_by_status
        ]
    )


@router.get("/stats/company/{company_id}", response_model=schemas.CompanyStatsResponse)
def get_company_stats(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Estadísticas detalladas de una empresa específica"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Usuarios
    total_users = db.query(User).filter(User.id_empresa == company_id).count()
    active_users = db.query(User).filter(
        User.id_empresa == company_id,
        User.is_active == True
    ).count()
    
    # Órdenes
    total_orders = db.query(Order).filter(Order.id_empresa == company_id).count()
    
    # Ingresos
    revenue = db.query(func.sum(Payment.total_amount)).join(Order).filter(
        Order.id_empresa == company_id
    ).scalar() or 0
    
    # Productos
    total_products = db.query(Product).filter(
        Product.id_empresa == company_id
    ).count()
    
    # Mesas
    total_tables = db.query(Table).filter(Table.id_empresa == company_id).count()
    
    # Preparar respuesta
    company_dict = {
        **company.__dict__,
        "users_count": total_users,
        "active_users_count": active_users
    }
    
    return schemas.CompanyStatsResponse(
        company=schemas.CompanyResponse(**company_dict),
        users={
            "total": total_users,
            "active": active_users,
            "limit": company.max_users,
            "usage_percentage": round((total_users / company.max_users * 100) if company.max_users > 0 else 0, 2)
        },
        products={
            "total": total_products,
            "limit": company.max_products
        },
        tables={
            "total": total_tables,
            "limit": company.max_tables
        },
        orders={
            "total": total_orders
        },
        revenue={
            "total": float(revenue),
            "currency": company.currency
        }
    )


# ==================== LOGS GLOBALES ====================

@router.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_global_audit_logs(
    company_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Ver logs de auditoría GLOBAL"""
    query = db.query(GlobalAuditLog)
    
    if company_id:
        query = query.filter(GlobalAuditLog.affected_company_id == company_id)
    if action:
        query = query.filter(GlobalAuditLog.action == action)
    
    logs = query.order_by(desc(GlobalAuditLog.created_at)).limit(limit).all()
    
    return [schemas.AuditLogResponse(**log.__dict__) for log in logs]
