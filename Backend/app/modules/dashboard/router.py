from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date
from datetime import datetime, timedelta, time
from typing import List, Dict, Any

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatus
from app.models.table import Table, TableStatus
from app.models.product import Product

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene las estadísticas principales del dashboard en tiempo real
    """
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    
    # 1. Ventas del día (Sum of total from active orders today) - por empresa
    # Consideramos ventas las ordenes no canceladas
    ventas_result = db.query(func.sum(Order.total)).filter(
        Order.created_at >= today_start,
        Order.status != OrderStatus.CANCELLED,
        Order.id_empresa == current_user.id_empresa
    ).scalar() or 0.0
    
    
    # 2. Pedidos activos (Pendiente, Preparando) - por empresa
    pedidos_activos = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.PENDING, OrderStatus.PREPARING]),
        Order.id_empresa == current_user.id_empresa
    ).scalar() or 0
    
    # 3. Clientes hoy (Total ordes today) - por empresa
    clientes_hoy = db.query(func.count(Order.id)).filter(
        Order.created_at >= today_start,
        Order.id_empresa == current_user.id_empresa
    ).scalar() or 0
    
    # 4. Mesas ocupadas - por empresa
    mesas_ocupadas_count = db.query(func.count(Table.id)).filter(
        Table.status == TableStatus.OCUPADA,
        Table.id_empresa == current_user.id_empresa
    ).scalar() or 0
    mesas_total = db.query(func.count(Table.id)).filter(
        Table.id_empresa == current_user.id_empresa
    ).scalar() or 0
    
    # 5. Total Staff (Admin only feature) - por empresa
    total_staff = None
    if current_user.role and current_user.role.name == "admin":
        staff_count = db.query(func.count(User.id)).filter(
            User.id_empresa == current_user.id_empresa
        ).scalar() or 0
        total_staff = {"value": staff_count}

    return {
        "ventas_del_dia": {
            "value": ventas_result,
            "change": 0, # TODO: Calculate change vs yesterday
            "formatted": f"${ventas_result:,.2f}"
        },
        "pedidos_activos": {
            "value": pedidos_activos,
            "change": 0,
            "formatted": str(pedidos_activos)
        },
        "clientes_hoy": {
            "value": clientes_hoy,
            "change": 0,
            "formatted": str(clientes_hoy)
        },
        "mesas_ocupadas": {
            "value": f"{mesas_ocupadas_count}/{mesas_total}",
            "change": 0,
            "formatted": f"{mesas_ocupadas_count}/{mesas_total}",
            "ocupadas": mesas_ocupadas_count,
            "total": mesas_total
        },
        "total_staff": total_staff
    }

@router.get("/sales-week")
def get_weekly_sales(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene las ventas de la semana para el gráfico
    """
    # Logic: Get last 7 days
    today = datetime.now().date()
    start_date = today - timedelta(days=6)
    
    # Initialize dictionary with 0
    sales_data = {}
    for i in range(7):
        day = start_date + timedelta(days=i)
        day_name = day.strftime("%a") # Mon, Tue... (Localize if needed)
        # Map english to spanish if needed or just use
        sales_data[day] = {"name": day_name, "ventas": 0.0}

    # Query - filtrada por empresa
    sales = db.query(
        cast(Order.created_at, Date).label("date"),
        func.sum(Order.total).label("total")
    ).filter(
        Order.created_at >= start_date,
        Order.status != OrderStatus.CANCELLED,
        Order.id_empresa == current_user.id_empresa
    ).group_by(cast(Order.created_at, Date)).all()

    for s in sales:
         if s.date in sales_data:
             sales_data[s.date]["ventas"] = s.total

    # Convert to list
    days_map = {
        "Mon": "Lun", "Tue": "Mar", "Wed": "Mié", "Thu": "Jue", "Fri": "Vie", "Sat": "Sáb", "Sun": "Dom"
    }

    result = []
    for date in sorted(sales_data.keys()):
        item = sales_data[date]
        eng_name = date.strftime("%a")
        item["name"] = days_map.get(eng_name, eng_name)
        result.append(item)
        
    return result

@router.get("/categories")
def get_categories_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene la distribución de ventas por categoría de la empresa
    """
    # Join OrderItem -> Product - filtrado por empresa
    results = db.query(
        Product.category,
        func.sum(OrderItem.price * OrderItem.quantity).label("total")
    ).join(OrderItem.product).filter(
        Product.id_empresa == current_user.id_empresa
    ).group_by(Product.category).all()
    
    colors = {
        "Entradas": "#f97316",
        "Platos principales": "#ef4444",
        "Postres": "#fbbf24",
        "Bebidas": "#10b981"
    }
    
    data = []
    for r in results:
        data.append({
            "name": r.category,
            "value": r.total,
            "color": colors.get(r.category, "#cbd5e1")
        })
        
    if not data:
         # Return empty structure if no data
         return [
            {"name": "Sin Datos", "value": 0, "color": "#cbd5e1"}
         ]

    return data

@router.get("/recent-orders")
def get_recent_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene los últimos pedidos de la empresa
    """
    orders = db.query(Order).filter(
        Order.id_empresa == current_user.id_empresa
    ).order_by(desc(Order.created_at)).limit(10).all()
    
    result = []
    for o in orders:
        # Get table number
        mesa = o.table.number if o.table else "N/A"
        
        result.append({
             "id": f"#{o.id:04d}",
             "cliente": o.customer_name or "Cliente",
             "mesa": str(mesa),
             "total": f"${o.total:,.0f}", # Format integer-like
             "estado": o.status
        })
    
    return result

@router.get("/")
def dashboard_home(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint principal del dashboard
    """
    return {
        "message": "Bienvenido al Dashboard de APPetito",
        "user": {
            "id": current_user.id,
            "nombre": current_user.nombre,
            "email": current_user.email,
            "role": current_user.role.name if current_user.role else "user"
        },
        "stats": get_dashboard_stats(current_user, db),
        "sales_week": get_weekly_sales(current_user, db),
        "categories": get_categories_distribution(current_user, db),
        "recent_orders": get_recent_orders(current_user, db)
    }
