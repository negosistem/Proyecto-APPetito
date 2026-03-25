from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    category = Column(String, index=True, nullable=False) # e.g. Entradas, Platos principales, Postres, Bebidas
    image_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    default_notes = Column(String, nullable=True, comment="Sugerencias o instrucciones por defecto (ej. Servir caliente)")
    prep_time_minutes = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    tiempo_preparacion = Column(Integer, nullable=True, default=None, comment="Tiempo estimado de preparación en cocina (minutos)")
    
    # Multi-tenancy: Company relationship
    id_empresa = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    empresa = relationship("Company")

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    extras = relationship("ProductExtra", back_populates="product", cascade="all, delete-orphan")
    ingredients = relationship("ProductIngredient", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product(name={self.name}, price={self.price})>"

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    product = relationship("Product", back_populates="images")
