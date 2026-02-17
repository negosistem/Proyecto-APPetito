from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # 'payment_processed', 'order_cancelled', 'table_closed'
    entity_type = Column(String)  # 'order', 'payment', 'table'
    entity_id = Column(Integer)
    details = Column(JSON, nullable=True)  # additional metadata
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
