from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional, List

# Base Schema: Shared properties
class UserBase(BaseModel):
    nombre: str
    email: EmailStr
    role: str = Field(..., description="Role of the user: super_admin, admin, mesero, or cocina")
    is_active: bool = True
    id_empresa: Optional[int] = None

# Create Schema: Properties required to create a user
class UserCreate(UserBase):
    password: str

# Reading Schema: Properties to return to the client
class User(UserBase):
    id: int
    created_at: datetime
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

    @field_validator('role', mode='before')
    @classmethod
    def extract_role_name(cls, v):
        if hasattr(v, 'name'):
            return v.name
        return v
