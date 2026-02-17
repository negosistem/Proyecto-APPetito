from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    category = Column(String, index=True, nullable=False) # e.g. Entradas, Platos principales, Postres, Bebidas
    image_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    prep_time_minutes = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")

    def __repr__(self):
        return f"<Product(name={self.name}, price={self.price})>"
