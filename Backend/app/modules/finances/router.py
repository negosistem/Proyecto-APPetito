from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime
from decimal import Decimal
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models import User, Payment, Order, OrderStatus, Expense, ExpenseCategory, Product, OrderItem, PaymentMethod
from .schemas import (
    ExpenseCreate, ExpenseResponse,
    SalesSummary, TopProduct, DailySales, FinancialSummary
)

router = APIRouter(prefix="/finances", tags=["finances"])

# ==================== EXPENSES ====================

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registrar un nuevo gasto"""
    new_expense = Expense(
        **expense_data.model_dump(),
        created_by=current_user.id,
        id_empresa=current_user.id_empresa
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.get("/expenses", response_model=List[ExpenseResponse])
def get_expenses(
    start_date: datetime = Query(None),
    end_date: datetime = Query(None),
    category: ExpenseCategory = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener lista de gastos con filtros opcionales"""
    query = db.query(Expense).filter(Expense.id_empresa == current_user.id_empresa)
    
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    if category:
        query = query.filter(Expense.category == category)
    
    expenses = query.order_by(Expense.expense_date.desc()).all()
    return expenses

@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Eliminar un gasto"""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.id_empresa == current_user.id_empresa
    ).first()
    if not expense:
        raise HTTPException(404, "Gasto no encontrado")
    
    db.delete(expense)
    db.commit()
    return None

# ==================== SALES REPORTS ====================

@router.get("/sales/summary", response_model=SalesSummary)
def get_sales_summary(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener resumen de ventas en un período con desglose de impuestos"""
    
    # Query combinada para eficiencia - filtrada por empresa
    totals = db.query(
        func.sum(Payment.subtotal).label('total_subtotal'),
        func.sum(Payment.tax).label('total_tax'),
        func.sum(Payment.total_amount).label('total_sales'),
        func.sum(Payment.tip_amount).label('total_tips'),
        func.count(Payment.id).label('total_orders')
    ).join(Order).filter(
        and_(
            Order.status == OrderStatus.PAID,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            Payment.id_empresa == current_user.id_empresa
        )
    ).first()
    
    total_subtotal = totals.total_subtotal or Decimal(0)
    total_tax = totals.total_tax or Decimal(0)
    total_sales = totals.total_sales or Decimal(0)
    total_tips = totals.total_tips or Decimal(0)
    total_orders = totals.total_orders or 0
    
    # Promedio de ticket (sin propinas)
    avg_ticket = (total_subtotal + total_tax) / total_orders if total_orders > 0 else Decimal(0)
    
    # Ventas por método de pago (por empresa)
    def get_sales_by_method(method):
        return db.query(func.sum(Payment.total_amount)).filter(
            and_(
                Payment.payment_method == method,
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
                Payment.id_empresa == current_user.id_empresa
            )
        ).scalar() or Decimal(0)

    return SalesSummary(
        total_sales=total_sales,
        total_subtotal=total_subtotal,
        total_tax=total_tax,
        total_orders=total_orders,
        average_ticket=avg_ticket,
        total_tips=total_tips,
        cash_sales=get_sales_by_method(PaymentMethod.CASH),
        card_sales=get_sales_by_method(PaymentMethod.CARD),
        transfer_sales=get_sales_by_method(PaymentMethod.TRANSFER)
    )

@router.get("/sales/top-products", response_model=List[TopProduct])
def get_top_products(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener productos más vendidos usando snapshots de order_items"""
    
    top_products = db.query(
        OrderItem.product_name.label('product_name'),
        func.sum(OrderItem.quantity).label('quantity_sold'),
        func.sum(OrderItem.subtotal).label('total_revenue')
    ).join(Order, OrderItem.order_id == Order.id)\
     .join(Payment, Order.id == Payment.order_id)\
     .filter(
        and_(
            Order.status == OrderStatus.PAID,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            OrderItem.id_empresa == current_user.id_empresa
        )
    ).group_by(OrderItem.product_name)\
     .order_by(func.sum(OrderItem.subtotal).desc())\
     .limit(limit).all()
    
    return [
        TopProduct(
            product_name=row.product_name,
            quantity_sold=int(row.quantity_sold),
            total_revenue=row.total_revenue
        ) for row in top_products
    ]

@router.get("/sales/daily", response_model=List[DailySales])
def get_daily_sales(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener ventas agrupadas por día"""
    
    daily_sales = db.query(
        func.date(Payment.created_at).label('date'),
        func.sum(Payment.total_amount).label('total'),
        func.count(Payment.id).label('orders_count')
    ).join(Order).filter(
        and_(
            Order.status == OrderStatus.PAID,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            Payment.id_empresa == current_user.id_empresa
        )
    ).group_by(func.date(Payment.created_at))\
     .order_by(func.date(Payment.created_at)).all()
    
    return [
        DailySales(
            date=str(row.date),
            total=row.total,
            orders_count=row.orders_count
        )
        for row in daily_sales
    ]

# ==================== FINANCIAL SUMMARY ====================

@router.get("/summary", response_model=FinancialSummary)
def get_financial_summary(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener resumen financiero: ingresos vs gastos"""
    
    # Total ingresos (ventas pagadas) de la empresa
    total_income = db.query(func.sum(Payment.total_amount)).join(Order).filter(
        and_(
            Order.status == OrderStatus.PAID,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            Payment.id_empresa == current_user.id_empresa
        )
    ).scalar() or Decimal(0)
    
    # Total gastos de la empresa
    total_expenses = db.query(func.sum(Expense.amount)).filter(
        and_(
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
            Expense.id_empresa == current_user.id_empresa
        )
    ).scalar() or Decimal(0)
    
    # Utilidad neta
    net_profit = total_income - total_expenses
    
    # Margen de utilidad (porcentaje)
    profit_margin = float((net_profit / total_income * 100)) if total_income > 0 else 0.0
    
    return FinancialSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net_profit=net_profit,
        profit_margin=round(profit_margin, 2)
    )
