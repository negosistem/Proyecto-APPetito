from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class GlobalAuditLog(Base):
    """
    Modelo para logs de auditoría GLOBAL.
    Registra todas las acciones del Super Admin sobre empresas y usuarios.
    """
    __tablename__ = "global_audit_logs"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Qué acción se realizó
    action = Column(String(100), nullable=False, index=True)
    # Ejemplos: 'company_created', 'company_suspended', 'user_created_for_company', 
    #           'company_reactivated', 'company_updated', 'user_suspended'
    
    # Sobre qué entidad
    entity_type = Column(String(50), nullable=False)  # 'company', 'user', 'system'
    entity_id = Column(Integer, nullable=True)  # ID de la entidad afectada
    
    # Quién lo hizo (Super Admin)
    super_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # A qué empresa afectó (puede ser NULL para acciones globales del sistema)
    affected_company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    # Detalles adicionales (JSON con información contextual)
    details = Column(JSON, nullable=True)
    # Ejemplo: {"previous_status": "active", "new_status": "suspended", "reason": "..."}
    
    # Información de la solicitud
    ip_address = Column(String(45), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relaciones
    super_admin = relationship("User", foreign_keys=[super_admin_id])
    affected_company = relationship("Company", foreign_keys=[affected_company_id])

    def __repr__(self):
        return f"<GlobalAuditLog(id={self.id}, action='{self.action}', entity_type='{self.entity_type}')>"
