from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class ProductExtra(Base):
    """Optional add-ons for a product (e.g. extra cheese, bacon)."""
    __tablename__ = "product_extras"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    id_empresa = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, default=True)

    # Relationships
    product = relationship("Product", back_populates="extras")
    empresa = relationship("Company")


class ProductIngredient(Base):
    """Base ingredients of a product that can optionally be removed."""
    __tablename__ = "product_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    id_empresa = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    removable = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    product = relationship("Product", back_populates="ingredients")
    empresa = relationship("Company")
