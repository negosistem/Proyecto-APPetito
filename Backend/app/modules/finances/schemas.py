from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.expense import ExpenseCategory

# ===== EXPENSES =====
class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=3, max_length=255)
    amount: Decimal = Field(..., gt=0)
    category: ExpenseCategory
    expense_date: datetime

class ExpenseResponse(BaseModel):
    id: int
    description: str
    amount: Decimal
    category: str
    expense_date: datetime
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ===== REPORTS =====
class SalesSummary(BaseModel):
    total_sales: Decimal  # Total with tax and tips
    total_subtotal: Decimal  # Subtotal before tax
    total_tax: Decimal  # Total tax collected
    total_orders: int
    average_ticket: Decimal
    total_tips: Decimal
    cash_sales: Decimal
    card_sales: Decimal
    transfer_sales: Decimal

class TopProduct(BaseModel):
    product_name: str
    quantity_sold: int
    total_revenue: Decimal

class DailySales(BaseModel):
    date: str
    total: Decimal
    orders_count: int

class FinancialSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    profit_margin: float  # Porcentaje
