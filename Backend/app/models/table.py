from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class TableStatus(str, enum.Enum):
    LIBRE = "libre"
    OCUPADA = "ocupada"
    RESERVADA = "reservada"
    FUERA_DE_SERVICIO = "fuera_de_servicio"

class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, index=True, nullable=False) 
    capacity = Column(Integer, default=4)
    status = Column(String, default=TableStatus.LIBRE, index=True) # Storing as string for simplicity in DB, validated by Schema/Enum in code
    location = Column(String, nullable=True) # e.g. "Salon", "Terraza"
    qr_code = Column(String, unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    
    __table_args__ = (
        UniqueConstraint('number', 'id_empresa', name='uq_table_number_empresa'),
    )
    empresa = relationship("Company")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Table(number={self.number}, status={self.status}, capacity={self.capacity})>"
