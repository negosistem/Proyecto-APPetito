from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, List, Literal
from app.modules.roles.schemas import RoleRead

# Base Schema: Shared properties
class StaffBase(BaseModel):
    nombre: str
    email: EmailStr
    role_id: int = Field(..., description="ID of the role")
    turno: Optional[str] = Field(None, pattern="^(Mañana|Tarde|Noche)$", description="Shift: Mañana, Tarde, or Noche")
    telefono: Optional[str] = None
    cedula: Optional[str] = None
    direccion: Optional[str] = None
    foto: Optional[str] = None
    is_active: bool = True

class StaffCreate(StaffBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    modules: List[str] = Field(default_factory=list, description="List of enabled modules")
    permissions: Optional[dict[str, bool]] = None
    tipo_empleado: str
    id_rol: int
    role_id: Optional[int] = Field(None, description="Overridden by id_rol")

# Update Schema: All fields optional for partial updates
class StaffUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    turno: Optional[str] = Field(None, pattern="^(Mañana|Tarde|Noche)$")
    telefono: Optional[str] = None
    cedula: Optional[str] = None
    direccion: Optional[str] = None
    foto: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)
    modules: Optional[List[str]] = None

# Reading Schema: Properties to return to the client
class Staff(StaffBase):
    id: int
    created_at: datetime
    role: RoleRead
    modules: List[str] = Field(default_factory=list)

    @field_validator('modules', mode='before')
    @classmethod
    def parse_modules(cls, v):
        if isinstance(v, str):
            return [m.strip() for m in v.split(',') if m.strip()]
        return v or []

    class Config:
        # Pydantic V2 configuration to allow creation from ORM objects
        from_attributes = True

class StaffStats(BaseModel):
    total: int
    by_role: dict[str, int]
