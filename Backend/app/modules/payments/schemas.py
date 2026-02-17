from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from app.models.payment import PaymentMethod

class PaymentCreate(BaseModel):
    order_id: int
    tip_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    payment_method: PaymentMethod
    amount_received: Optional[Decimal] = Field(None, ge=0)  # Requerido si es cash
    
    @field_validator('amount_received')
    def validate_cash_payment(cls, v, info):
        if info.data.get('payment_method') == PaymentMethod.CASH and v is None:
            raise ValueError("amount_received es requerido para pagos en efectivo")
        return v

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    invoice_number: str
    subtotal: Decimal
    tax: Decimal
    tip_amount: Decimal
    total_amount: Decimal
    payment_method: str
    change_given: Optional[Decimal]
    processed_by: int
    created_at: datetime
    table_number: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReceiptItem(BaseModel):
    product_name: str
    quantity: int
    price: Decimal
    total: Decimal

class ReceiptRead(BaseModel):
    order_id: int
    payment_id: int
    invoice_number: str
    customer_name: Optional[str] = None
    table_number: Optional[str] = None
    items: List[ReceiptItem]
    subtotal: Decimal
    tax: Decimal
    tip: Decimal
    total: Decimal
    payment_method: PaymentMethod
    amount_received: Optional[Decimal] = None
    change: Optional[Decimal] = None
    processed_by_name: str
    date: datetime
