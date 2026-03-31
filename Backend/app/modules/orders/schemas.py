from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal
from app.models.order import OrderStatus
from app.models.payment import PaymentMethod, PaymentStatus

class OrderCloseRequest(BaseModel):
    payment_method: PaymentMethod
    amount_received: Decimal
    tip_amount: Decimal = Decimal('0.00')

class OrderPaginatedResponse(BaseModel):
    items: List['Order'] # Forward reference for Order
    total: int
    page: int
    pages: int
    limit: int

# --- Items ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=100)
    notes: Optional[str] = None
    extras_ids: List[int] = Field(default_factory=list)
    removed_ingredient_ids: List[int] = Field(default_factory=list)

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("extras_ids", "removed_ingredient_ids", mode="before")
    @classmethod
    def normalize_id_lists(cls, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise ValueError("Debe ser una lista de IDs")

        normalized: list[int] = []
        seen: set[int] = set()
        for raw_id in value:
            item_id = int(raw_id)
            if item_id <= 0:
                raise ValueError("Todos los IDs deben ser enteros positivos")
            if item_id not in seen:
                seen.add(item_id)
                normalized.append(item_id)
        return normalized

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemModifierSnapshot(BaseModel):
    source_id: Optional[int] = None
    source_type: Literal["extra", "ingredient", "note"]
    group_key: Literal["extras", "ingredients", "notes"]
    group_label: str
    choice: Literal["add", "remove", "note"]
    name: str
    price: Decimal = Decimal("0.00")

class OrderItem(OrderItemBase):
    id: int
    product_name: str
    price: Decimal
    subtotal: Decimal
    modifiers_snapshot: List[OrderItemModifierSnapshot] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class OrderPaymentSummary(BaseModel):
    id: int
    numero_factura: str
    amount: Decimal
    subtotal: Decimal
    tax: Decimal
    tip_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    payment_method: PaymentMethod
    change_given: Optional[Decimal] = None
    created_at: datetime
    status: PaymentStatus

    class Config:
        from_attributes = True

# --- Orders ---
class OrderBase(BaseModel):
    table_id: Optional[int] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    aplica_impuesto: Optional[bool] = True

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = Field(default_factory=list)  # Create order with items in one request (optional)
    apply_tip: Optional[bool] = False  # Whether to apply tip (default 10%)
    aplica_impuesto: Optional[bool] = True  # Whether to apply tax

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    customer_name: Optional[str] = None
    aplica_impuesto: Optional[bool] = None

class Order(OrderBase):
    id: int
    user_id: int
    status: OrderStatus
    subtotal: Decimal
    tax: Decimal
    tip: Decimal
    discount: Decimal
    total: Decimal
    total_amount: Decimal
    paid_amount: Decimal = Decimal("0")
    remaining_balance: Decimal = Decimal("0")
    created_at: datetime
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    items: List[OrderItem] = Field(default_factory=list)
    payments: List[OrderPaymentSummary] = Field(default_factory=list)

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
    total_amount: Decimal
    paid_amount: Decimal
    remaining_balance: Decimal
    items: List[OrderItem]
    payments: List[OrderPaymentSummary] = Field(default_factory=list)
    status: OrderStatus
    created_at: datetime
    
    class Config:
        from_attributes = True
