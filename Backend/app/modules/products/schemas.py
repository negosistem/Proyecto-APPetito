from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

class ProductImageBase(BaseModel):
    url: str
    order: int = 0

class ProductImageCreate(ProductImageBase):
    pass

class ProductImage(ProductImageBase):
    id: int
    product_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    is_active: Optional[bool] = True

class ProductCreate(ProductBase):
    images: Optional[List[ProductImageCreate]] = []
    tiempo_preparacion: Optional[int] = None

    @field_validator('tiempo_preparacion')
    @classmethod
    def validar_tiempo(cls, v):
        if v is not None and (v < 1 or v > 300):
            raise ValueError("El tiempo de preparación debe estar entre 1 y 300 minutos")
        return v

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    is_active: Optional[bool] = None
    images: Optional[List[ProductImageCreate]] = []
    tiempo_preparacion: Optional[int] = None

    @field_validator('tiempo_preparacion')
    @classmethod
    def validar_tiempo(cls, v):
        if v is not None and (v < 1 or v > 300):
            raise ValueError("El tiempo de preparación debe estar entre 1 y 300 minutos")
        return v

class Product(ProductBase):
    id: int
    tiempo_preparacion: Optional[int] = None
    images: List[ProductImage] = []

    class Config:
        from_attributes = True
