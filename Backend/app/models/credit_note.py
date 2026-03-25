from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class CreditNote(Base):
    __tablename__ = "credit_notes"

    id             = Column(Integer, primary_key=True, index=True)
    payment_id     = Column(Integer, ForeignKey("payments.id"), nullable=False, unique=True)
    id_empresa     = Column(Integer, ForeignKey("companies.id"), nullable=False)
    numero_nc      = Column(String, unique=True, nullable=False)
    motivo         = Column(String, nullable=False)
    monto          = Column(Float, nullable=False)
    cancelado_por  = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow)

    payment        = relationship("Payment", back_populates="credit_note")
    cancelado_por_user = relationship("User", foreign_keys=[cancelado_por])
