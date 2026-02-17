from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class ExpenseCategory(str, enum.Enum):
    """Categorías de gastos - IMPORTANTE: valores en minúsculas"""
    SUPPLIER = "supplier"          # Proveedores (ingredientes, productos)
    PAYROLL = "payroll"            # Nómina
    SERVICES = "services"          # Servicios (luz, agua, internet)
    MAINTENANCE = "maintenance"    # Mantenimiento
    RENT = "rent"                  # Renta del local
    MARKETING = "marketing"        # Publicidad
    OTHER = "other"                # Otros

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(Enum(ExpenseCategory), nullable=False)
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")
    
    # Auditoría
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    expense_date = Column(DateTime, nullable=False)  # Fecha del gasto real
    
    # Relaciones
    created_by_user = relationship("User")
    
    # Opcional: comprobante
    receipt_url = Column(String(500), nullable=True)  # URL del comprobante escaneado
