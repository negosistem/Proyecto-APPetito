from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    total_spent = Column(Float, default=0.0)
    visits = Column(Integer, default=0)
    last_visit = Column(DateTime(timezone=True), nullable=True)
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")
    reservations = relationship("Reservation", back_populates="customer")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Customer(name={self.name}, email={self.email})>"
