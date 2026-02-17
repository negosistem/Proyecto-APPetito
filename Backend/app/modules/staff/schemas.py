from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from app.modules.roles.schemas import RoleRead

# Base Schema: Shared properties
class StaffBase(BaseModel):
    nombre: str
    email: EmailStr
    role_id: int = Field(..., description="ID of the role")
    turno: Optional[str] = Field(None, pattern="^(Mañana|Tarde|Noche)$", description="Shift: Mañana, Tarde, or Noche")
    is_active: bool = True

# Create Schema: Properties required to create a staff member
class StaffCreate(StaffBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

# Update Schema: All fields optional for partial updates
class StaffUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    turno: Optional[str] = Field(None, pattern="^(Mañana|Tarde|Noche)$")
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

# Reading Schema: Properties to return to the client
class Staff(StaffBase):
    id: int
    created_at: datetime
    role: RoleRead

    class Config:
        # Pydantic V2 configuration to allow creation from ORM objects
        from_attributes = True

class StaffStats(BaseModel):
    total: int
    by_role: dict[str, int]
