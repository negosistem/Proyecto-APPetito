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

# --- Extras ---
class ProductExtraBase(BaseModel):
    name: str
    price: float = 0

class ProductExtraCreate(ProductExtraBase):
    pass

class ProductExtraResponse(ProductExtraBase):
    id: int
    product_id: int
    is_active: bool = True

    class Config:
        from_attributes = True

# --- Ingredients ---
class ProductIngredientBase(BaseModel):
    name: str
    removable: bool = True

class ProductIngredientCreate(ProductIngredientBase):
    pass

class ProductIngredientResponse(ProductIngredientBase):
    id: int
    product_id: int
    is_active: bool = True

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    default_notes: Optional[str] = None
    is_active: Optional[bool] = True

class ProductCreate(ProductBase):
    images: Optional[List[ProductImageCreate]] = []
    tiempo_preparacion: Optional[int] = None
    extras: Optional[List[ProductExtraCreate]] = []
    ingredients: Optional[List[ProductIngredientCreate]] = []

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
    default_notes: Optional[str] = None
    is_active: Optional[bool] = None
    images: Optional[List[ProductImageCreate]] = []
    tiempo_preparacion: Optional[int] = None
    extras: Optional[List[ProductExtraCreate]] = None
    ingredients: Optional[List[ProductIngredientCreate]] = None

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
    extras: List[ProductExtraResponse] = []
    ingredients: List[ProductIngredientResponse] = []

    class Config:
        from_attributes = True
