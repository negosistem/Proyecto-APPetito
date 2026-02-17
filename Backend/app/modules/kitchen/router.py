from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.order import Order, OrderStatus, OrderItem, OrderItemState
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/kitchen",
    tags=["Kitchen"]
)

def calculate_order_progress(order: Order) -> dict:
    """Calcular progreso de una orden basado en estado de items"""
    total_items = len(order.items)
    if total_items == 0:
        return {"percentage": 0, "completed": 0, "total": 0}
    
    completed_items = sum(
        1 for item in order.items 
        if item.state and item.state.state == 'ready'
    )
    
    percentage = int((completed_items / total_items) * 100)
    
    return {
        "percentage": percentage,
        "completed": completed_items,
        "total": total_items
    }

@router.get("/kanban")
def get_kitchen_kanban(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener órdenes organizadas por estado para el Kanban
    ORDENADAS DE FORMA DESCENDENTE (más recientes primero)
    """
    
    # Estados de cocina
    kitchen_states = ['new', 'accepted', 'preparing', 'ready']
    
    # Query base: solo órdenes de la empresa del usuario
    base_query = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.state),
        joinedload(Order.items).joinedload(OrderItem.product),
        joinedload(Order.table),
        joinedload(Order.customer)
    ).filter(
        Order.id_empresa == current_user.id_empresa,
        Order.status.in_(kitchen_states)
    )
    
    # Organizar por estado
    kanban = {}
    
    for state in kitchen_states:
        orders = base_query.filter(Order.status == state).order_by(
            desc(Order.kitchen_received_at)  # ← DESCENDENTE: más recientes primero
        ).all()
        
        kanban[state] = [
            {
                "id": order.id,
                "order_number": order.id,
                "table": order.table.number if order.table else "Para Llevar",
                "customer_name": order.customer.name if order.customer else None,
                "status": order.status,
                
                # ⏰ TIEMPOS
                "arrived_at": order.kitchen_received_at.isoformat() if order.kitchen_received_at else None,
                "accepted_at": order.kitchen_accepted_at.isoformat() if order.kitchen_accepted_at else None,
                "started_at": order.kitchen_started_at.isoformat() if order.kitchen_started_at else None,
                "completed_at": order.kitchen_completed_at.isoformat() if order.kitchen_completed_at else None,
                
                # Tiempo transcurrido desde llegada (en minutos)
                "elapsed_minutes": (
                    int((datetime.now(timezone.utc) - order.kitchen_received_at).total_seconds() // 60)
                    if order.kitchen_received_at else 0
                ),
                
                # 🍔 ITEMS con estado individual
                "items": [
                    {
                        "id": item.id,
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                        "notes": item.notes,
                        "prep_time_minutes": item.prep_time_minutes or 10,
                        
                        # Estado del plato
                        "state": item.state.state if item.state else "pending",
                        "started_at": item.state.started_at.isoformat() if item.state and item.state.started_at else None,
                        "completed_at": item.state.completed_at.isoformat() if item.state and item.state.completed_at else None,
                        
                        # Tiempo de este plato
                        "item_elapsed_minutes": (
                            int((datetime.now(timezone.utc) - item.state.started_at).total_seconds() // 60)
                            if item.state and item.state.started_at else 0
                        )
                    }
                    for item in order.items
                ],
                
                # 📊 PROGRESO general de la orden
                "progress": calculate_order_progress(order),
                
                "kitchen_notes": order.kitchen_notes
            }
            for order in orders
        ]
    
    return kanban

@router.put("/orders/{order_id}/accept")
def accept_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aceptar orden en cocina: NUEVO → ACEPTADO"""
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    
    if order.status != OrderStatus.NEW:
        raise HTTPException(400, f"Orden debe estar en estado 'new'. Estado actual: {order.status}")
    
    # Cambiar estado
    order.status = OrderStatus.ACCEPTED
    order.kitchen_accepted_at = func.now()
    
    # Crear estados para cada item (todos empiezan en pending)
    for item in order.items:
        if not item.state:
            item_state = OrderItemState(
                order_item_id=item.id,
                state='pending'
            )
            db.add(item_state)
    
    db.commit()
    
    return {"success": True, "message": "Orden aceptada"}

@router.put("/orders/{order_id}/start")
def start_preparing(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Iniciar preparación: ACEPTADO → PREPARANDO"""
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    
    if order.status != OrderStatus.ACCEPTED:
        raise HTTPException(400, "Orden debe estar aceptada primero")
    
    order.status = OrderStatus.PREPARING
    order.kitchen_started_at = func.now()
    
    db.commit()
    
    return {"success": True, "message": "Preparación iniciada"}

@router.put("/orders/{order_id}/complete")
def complete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Completar orden: PREPARANDO → LISTO"""
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    
    if order.status != OrderStatus.PREPARING:
        raise HTTPException(400, "Orden debe estar en preparación")
    
    # Validar que todos los items estén listos
    # We must join with OrderItemState to check state
    incomplete_items = [
        item for item in order.items
        if not item.state or item.state.state != 'ready'
    ]
    
    if incomplete_items:
        raise HTTPException(
            400, 
            f"{len(incomplete_items)} producto(s) aún no están listos"
        )
    
    order.status = OrderStatus.READY
    order.kitchen_completed_at = func.now()
    
    db.commit()
    
    return {"success": True, "message": "Orden completada"}

@router.put("/orders/{order_id}/reject")
def reject_order(
    order_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rechazar orden: NUEVO → CANCELADO"""
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    
    if order.status != OrderStatus.NEW:
        raise HTTPException(400, "Solo se pueden rechazar órdenes nuevas")
    
    order.status = OrderStatus.CANCELLED
    order.kitchen_notes = f"Rechazada: {reason}"
    
    db.commit()
    
    return {"success": True, "message": "Orden rechazada"}

@router.put("/items/{item_id}/state")
def update_item_state(
    item_id: int,
    item_update: Dict[str, str], # Expects {"new_state": "..."}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar estado de un producto individual
    Permite marcar platos como listos independientemente
    """
    new_state = item_update.get("new_state")
    if not new_state:
        raise HTTPException(400, "new_state is required")

    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item no encontrado")
    
    # Validar empresa
    order = item.order
    if order.id_empresa != current_user.id_empresa:
        raise HTTPException(403, "No tienes acceso a este item")
    
    # Obtener o crear estado del item
    if not item.state:
        item.state = OrderItemState(order_item_id=item.id)
        db.add(item.state)
    
    # Actualizar estado
    # Allow going back to pending if needed? The requirement didn't specify, but for safety let's follow the requested flow
    # pending -> preparing -> ready
    
    if new_state == 'preparing':
         # Allow from pending
        item.state.state = 'preparing'
        item.state.started_at = func.now()
        item.state.chef_id = current_user.id
        
    elif new_state == 'ready':
        # Allow from preparing
        item.state.state = 'ready'
        item.state.completed_at = func.now()
        
    elif new_state == 'pending':
        # Allow reset? Maybe useful
        item.state.state = 'pending'
        item.state.started_at = None
        item.state.completed_at = None
    
    else:
        raise HTTPException(400, f"Transición inválida o estado desconocido: {new_state}")
    
    db.commit()
    
    return {"success": True, "item_state": item.state.state}
