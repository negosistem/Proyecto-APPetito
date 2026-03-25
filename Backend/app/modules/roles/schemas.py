from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class RoleBase(BaseModel):
    name: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    permissions: Optional[Dict[str, Any]] = Field(None, description="Permisos en formato JSON")
    is_active: bool = True

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None

class RoleRead(RoleBase):
    id: int
    id_empresa: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
