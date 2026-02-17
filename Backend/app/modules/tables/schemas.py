from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TableStatus(str, Enum):
    LIBRE = "libre"
    OCUPADA = "ocupada"
    RESERVADA = "reservada"
    FUERA_DE_SERVICIO = "fuera_de_servicio"

class TableBase(BaseModel):
    number: str
    capacity: int = 4
    status: TableStatus = TableStatus.LIBRE
    location: Optional[str] = None
    is_active: bool = True

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[TableStatus] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

class TableStats(BaseModel):
    total: int
    libres: int
    ocupadas: int
    reservadas: int
    fuera_de_servicio: int

class Table(TableBase):
    id: int
    qr_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
