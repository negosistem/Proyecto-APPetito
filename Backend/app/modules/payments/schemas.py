from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.order import OrderStatus
from app.models.payment import PaymentMethod, PaymentStatus


class PaymentCreate(BaseModel):
    order_id: int
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    amount_received: Optional[Decimal] = Field(None, ge=0)

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method(cls, value):
        if isinstance(value, str):
            return value.upper()
        return value

    @field_validator("amount_received")
    @classmethod
    def validate_cash_payment(cls, value, info):
        if info.data.get("payment_method") == PaymentMethod.CASH and value is None:
            raise ValueError("amount_received es requerido para pagos en efectivo")
        return value


class OrderPaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    amount_received: Optional[Decimal] = Field(None, ge=0)

    @field_validator("payment_method", mode="before")
    @classmethod
    def normalize_payment_method(cls, value):
        if isinstance(value, str):
            return value.upper()
        return value

    @field_validator("amount_received")
    @classmethod
    def validate_cash_payment(cls, value, info):
        if info.data.get("payment_method") == PaymentMethod.CASH and value is None:
            raise ValueError("amount_received es requerido para pagos en efectivo")
        return value


class CancelPaymentRequest(BaseModel):
    motivo: str = Field(..., min_length=10)


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    numero_factura: str
    amount: Decimal
    subtotal: Decimal
    tax: Decimal
    tip_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    payment_method: PaymentMethod
    amount_received: Optional[Decimal]
    change_given: Optional[Decimal]
    processed_by: int
    created_at: datetime
    table_number: Optional[str] = None
    status: PaymentStatus
    paid_amount: Optional[Decimal] = None
    remaining_balance: Optional[Decimal] = None
    order_total_amount: Optional[Decimal] = None
    order_status: Optional[OrderStatus] = None
    can_close_order: Optional[bool] = None

    class Config:
        from_attributes = True


class OrderPaymentRecord(BaseModel):
    id: int
    numero_factura: str
    amount: Decimal
    subtotal: Decimal
    tax: Decimal
    tip_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    payment_method: PaymentMethod
    amount_received: Optional[Decimal]
    change_given: Optional[Decimal]
    created_at: datetime
    status: PaymentStatus

    class Config:
        from_attributes = True


class OrderPaymentSummaryResponse(BaseModel):
    order_id: int
    order_status: OrderStatus
    total_amount: Decimal
    paid_amount: Decimal
    remaining_balance: Decimal
    can_close_order: bool
    payments: List[OrderPaymentRecord]


class ReceiptItem(BaseModel):
    product_name: str
    quantity: int
    price: Decimal
    total: Decimal


class ReceiptPaymentLine(BaseModel):
    numero_factura: str
    payment_method: PaymentMethod
    amount: Decimal
    amount_received: Optional[Decimal] = None
    change_given: Optional[Decimal] = None
    created_at: datetime


class ReceiptRead(BaseModel):
    order_id: int
    payment_id: int
    numero_factura: str
    customer_name: Optional[str] = None
    table_number: Optional[str] = None
    items: List[ReceiptItem]
    payments: List[ReceiptPaymentLine]
    subtotal: Decimal
    tax: Decimal
    discount: Decimal
    tip: Decimal
    total: Decimal
    paid_amount: Decimal
    remaining_balance: Decimal
    payment_method: PaymentMethod
    amount_received: Optional[Decimal] = None
    change: Optional[Decimal] = None
    processed_by_name: str
    date: datetime
