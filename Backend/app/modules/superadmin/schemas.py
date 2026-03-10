"""
Schemas para el módulo de Super Admin
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


# ==================== COMPANY SCHEMAS ====================

class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)


class CompanyCreate(CompanyBase):
    """Schema para crear empresa (básico — usado por edición)"""
    max_users: Optional[int] = Field(10, ge=1, le=1000)
    max_tables: Optional[int] = Field(20, ge=1, le=500)
    max_products: Optional[int] = Field(100, ge=1, le=5000)
    tax_rate: Optional[Decimal] = Field(Decimal("18.00"), ge=0, le=100)
    currency: Optional[str] = Field("DOP", max_length=10)


# ==================== RESTAURANT SETUP SCHEMA ====================

class AdminUserCreate(BaseModel):
    """Datos del usuario administrador del restaurante"""
    nombre: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)


class RestaurantCreate(BaseModel):
    """Schema completo para crear un restaurante desde cero (empresa + admin + datos iniciales)"""
    # Datos del restaurante
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    tax_rate: Optional[Decimal] = Field(Decimal("18.00"), ge=0, le=100)
    currency: Optional[str] = Field("DOP", max_length=10)
    # Plan
    subscription: str = Field("trial", pattern="^(trial|monthly|annual)$")
    max_users: Optional[int] = Field(10, ge=1, le=1000)
    max_tables: Optional[int] = Field(20, ge=1, le=500)
    max_products: Optional[int] = Field(100, ge=1, le=5000)
    # Admin
    admin: AdminUserCreate


class RestaurantCreateResponse(BaseModel):
    """Respuesta del endpoint de creación de restaurante"""
    success: bool = True
    message: str
    company_id: int
    company_name: str
    admin_email: str
    admin_nombre: str
    tables_created: int
    subscription: str
    trial_ends_at: Optional[datetime] = None


class CompanyUpdate(BaseModel):
    """Schema para actualizar empresa"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    subscription_status: Optional[str] = Field(None, pattern="^(trial|active|suspended|cancelled)$")
    max_users: Optional[int] = Field(None, ge=1, le=1000)
    max_tables: Optional[int] = Field(None, ge=1, le=500)
    max_products: Optional[int] = Field(None, ge=1, le=5000)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    currency: Optional[str] = Field(None, max_length=10)


class CompanyResponse(CompanyBase):
    """Schema de respuesta para empresa"""
    id: int
    is_active: bool
    subscription_status: str
    trial_ends_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    suspended_reason: Optional[str] = None
    max_users: int
    max_tables: int
    max_products: int
    tax_rate: Decimal
    currency: str
    invoice_prefix: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Campos computados (agregados en el endpoint)
    users_count: Optional[int] = None
    active_users_count: Optional[int] = None

    class Config:
        from_attributes = True


class CompanySuspend(BaseModel):
    """Schema para suspender empresa"""
    reason: str = Field(..., min_length=10, max_length=500)


# ==================== USER SCHEMAS (CROSS-COMPANY) ====================

class UserCreateForCompany(BaseModel):
    """Schema para crear usuario en una empresa específica"""
    email: EmailStr
    nombre: str = Field(..., alias="full_name", min_length=1, max_length=255)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(admin|gerente|cajero|mesero|cocina)$")
    turno: Optional[str] = Field(None, pattern="^(Mañana|Tarde|Noche)$")

    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    """Schema de respuesta para usuario"""
    id: int
    email: str
    nombre: str
    id_empresa: Optional[int] = None
    role: Dict[str, Any]  # {id, name, description}
    turno: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== STATISTICS SCHEMAS ====================

class GlobalStatsResponse(BaseModel):
    """Estadísticas globales del SaaS"""
    companies: Dict[str, int]  # {total, active, suspended, trial}
    users: Dict[str, int]  # {total, active, inactive}
    revenue: Dict[str, Any]  # {total, currency}
    subscription_distribution: List[Dict[str, Any]]  # [{status, count}]


class CompanyStatsResponse(BaseModel):
    """Estadísticas detalladas de una empresa"""
    company: CompanyResponse
    users: Dict[str, Any]  # {total, active, limit, usage_percentage}
    products: Dict[str, int]  # {total, limit}
    tables: Dict[str, int]  # {total, limit}
    orders: Dict[str, int]  # {total}
    revenue: Dict[str, Any]  # {total, currency}


# ==================== AUDIT LOG SCHEMAS ====================

class AuditLogResponse(BaseModel):
    """Schema de respuesta para log de auditoría global"""
    id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    super_admin_id: int
    affected_company_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== GENERIC RESPONSES ====================

class SuccessResponse(BaseModel):
    """Respuesta genérica de éxito"""
    success: bool = True
    message: str
    data: Optional[Any] = None
