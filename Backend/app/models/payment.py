from sqlalchemy import Column, Integer, ForeignKey, Numeric, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship, synonym
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    TRANSFER = "TRANSFER"

class PaymentStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Factura number - unique identifier for the transaction (Alembic handles migration from legacy)
    numero_factura = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.CONFIRMED, nullable=False)
    
    # Montos
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    tax = Column(Numeric(10, 2), default=0, nullable=False)
    tip_amount = Column(Numeric(10, 2), default=0, nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)  # Mirrors amount for compatibility
    
    # Información de pago
    payment_method = Column(SAEnum(PaymentMethod), nullable=False)
    amount_received = Column(Numeric(10, 2), nullable=True)  # Solo para efectivo
    change_given = Column(Numeric(10, 2), nullable=True)    # Calculado automáticamente
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")
    
    # Auditoría
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    timestamp = synonym("created_at")

    # Relaciones
    order = relationship("Order", back_populates="payments")
    processed_by_user = relationship("User")
    credit_note = relationship("CreditNote", back_populates="payment", uselist=False)
