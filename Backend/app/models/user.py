from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    """
    User model for storing user details.
    Inherits from the DeclarativeBase defined in app.core.database.
    """
    __tablename__ = "users"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Auth & Permissions
    password_hash = Column(String, nullable=False)
    
    # Role relationship (FK)
    # Note: We are migrating from string 'role' to 'role_id'
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    role = relationship("Role", back_populates="users")
    
    # Multi-tenancy: Company relationship
    # 🆕 nullable=True para permitir Super Admin (id_empresa=NULL)
    # Solo super_admin puede tener id_empresa=NULL
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=True, index=True)
    empresa = relationship("Company", foreign_keys=[id_empresa], back_populates="users")
    
    # Work Info
    turno = Column(String, nullable=True) # Expected values: Mañana, Tarde, Noche
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role.name if self.role else 'None'})>"
