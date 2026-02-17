from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from app.models.order import OrderStatus

# --- Items ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = 1
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

from pydantic import model_validator

class OrderItem(OrderItemBase):
    id: int
    product_name: str
    price: Decimal
    subtotal: Decimal
    
    class Config:
        from_attributes = True

# --- Orders ---
class OrderBase(BaseModel):
    table_id: Optional[int] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = []  # Create order with items in one request (optional)
    apply_tip: Optional[bool] = False  # Whether to apply tip (default 10%)

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    customer_name: Optional[str] = None

class Order(OrderBase):
    id: int
    user_id: int
    status: OrderStatus
    subtotal: Decimal
    tax: Decimal
    tip: Decimal
    discount: Decimal
    total: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    items: List[OrderItem] = []

    class Config:
        from_attributes = True

# --- Order Details (for payment modal) ---
class OrderDetailResponse(BaseModel):
    """Detailed order info for payment modal"""
    id: int
    table_id: Optional[int]
    table_number: Optional[str]
    customer_name: Optional[str]
    subtotal: Decimal
    tax: Decimal
    tip: Decimal
    discount: Decimal
    total: Decimal
    items: List[OrderItem]
    status: OrderStatus
    created_at: datetime
    
    class Config:
        from_attributes = True
