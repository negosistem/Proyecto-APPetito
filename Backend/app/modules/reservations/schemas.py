from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime, time
from typing import Optional
from app.models.reservation import ReservationStatus

class ReservationCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: str = Field(..., min_length=7, max_length=20)
    reservation_date: datetime
    party_size: int = Field(..., ge=1, le=30)
    id_table: Optional[int] = None
    id_customer: Optional[int] = None
    notes: Optional[str] = None
    status: ReservationStatus = ReservationStatus.PENDING

    @field_validator('reservation_date')
    @classmethod
    def must_be_future(cls, v: datetime) -> datetime:
        # Pydantic v2 validator
        if v.replace(tzinfo=None) <= datetime.utcnow():
            raise ValueError('La fecha debe ser futura')
        return v

class ReservationUpdate(BaseModel):
    customer_name: Optional[str] = Field(None, min_length=2, max_length=100)
    customer_phone: Optional[str] = Field(None, min_length=7, max_length=20)
    reservation_date: Optional[datetime] = None
    party_size: Optional[int] = Field(None, ge=1, le=30)
    id_table: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[ReservationStatus] = None
    arrival_time: Optional[time] = None

class ReservationResponse(BaseModel):
    id: int
    id_empresa: int
    id_table: Optional[int] = None
    id_customer: Optional[int] = None
    customer_name: str
    customer_phone: str
    party_size: int
    reservation_date: datetime
    status: ReservationStatus
    notes: Optional[str] = None
    arrival_time: Optional[time] = None
    created_at: datetime
    table_name: Optional[str] = None  # Enriquecido en el endpoint

    model_config = ConfigDict(from_attributes=True)
