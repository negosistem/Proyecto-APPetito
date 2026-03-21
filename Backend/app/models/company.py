from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Company(Base):
    """
    Modelo Company (Empresa) para soporte multi-tenant.
    Cada empresa representa un restaurante independiente en el sistema SaaS.
    """
    __tablename__ = "companies"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Información básica de la empresa
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    
    # Estado y suscripción
    is_active = Column(Boolean, default=True, nullable=False)
    subscription_status = Column(String(50), default="trial")  # trial, active, suspended, cancelled
    
    # 🆕 Gestión de trial y suspensión (Super Admin)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspended_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Super admin que suspendió
    suspended_reason = Column(String(500), nullable=True)
    
    # 🆕 Límites según plan (para control de recursos)
    max_users = Column(Integer, default=10, nullable=False)
    max_tables = Column(Integer, default=20, nullable=False)
    max_products = Column(Integer, default=100, nullable=False)
    
    # 🆕 Configuración de la empresa
    tax_rate = Column(Numeric(5, 2), default=18.00)  # Tasa de impuesto (%)
    currency = Column(String(10), default="DOP")  # Moneda
    invoice_prefix = Column(String(20), default="FAC")  # Prefijo de factura
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 🆕 Relaciones
    users = relationship("User", foreign_keys="User.id_empresa", back_populates="empresa")
    suspended_by_user = relationship("User", foreign_keys=[suspended_by])
    reservations = relationship("Reservation", back_populates="company", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}', status='{self.subscription_status}')>"
