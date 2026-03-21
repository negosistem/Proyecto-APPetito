from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Time, Index
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.db.session import Base

class ReservationStatus(str, enum.Enum):
    PENDING = "pendiente"
    CONFIRMED = "confirmada"
    CANCELLED = "cancelada"
    COMPLETED = "completada"
    NO_SHOW = "no_show"

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    id_table = Column(Integer, ForeignKey("tables.id"), nullable=True)
    id_customer = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    party_size = Column(Integer, nullable=False)
    reservation_date = Column(DateTime, nullable=False)  # Fecha + hora combinadas
    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING, nullable=False)
    notes = Column(Text, nullable=True)
    arrival_time = Column(Time, nullable=True)  # Hora real de llegada
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    company = relationship("Company", back_populates="reservations")
    table = relationship("Table", back_populates="reservations")
    customer = relationship("Customer", back_populates="reservations")
    
    __table_args__ = (
        # Una mesa no puede tener 2 reservas activas que se solapen ±2 horas
        # (la validación real se hace en el endpoint, esto es el índice base)
        Index('ix_reservation_company_date', 'id_empresa', 'reservation_date'),
    )
