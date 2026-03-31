from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderItemState, OrderStatus
from app.models.table import TableStatus
from app.models.user import User
from app.modules.kitchen.socket_auth import authenticate_websocket
from app.modules.kitchen.socket_events import (
    broadcast_order_update,
    build_order_socket_message,
)
from app.modules.kitchen.ws_manager import manager as ws_manager

router = APIRouter(
    prefix="/kitchen",
    tags=["Kitchen"],
)


@router.websocket("/ws/{company_id}")
async def kitchen_websocket(websocket: WebSocket, company_id: int):
    """WebSocket endpoint para el tablero Kanban en tiempo real."""
    identity = await authenticate_websocket(websocket, company_id)
    if identity is None:
        return

    await ws_manager.connect(websocket, identity.company_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, identity.company_id)
    except Exception:
        ws_manager.disconnect(websocket, identity.company_id)


def calculate_order_progress(order: Order) -> dict:
    """Calcular progreso de una orden basado en estado de items."""
    total_items = len(order.items)
    if total_items == 0:
        return {"percentage": 0, "completed": 0, "total": 0}

    completed_items = sum(
        1 for item in order.items if item.state and item.state.state == "ready"
    )
    percentage = int((completed_items / total_items) * 100)

    return {
        "percentage": percentage,
        "completed": completed_items,
        "total": total_items,
    }


@router.get("/kanban")
def get_kitchen_kanban(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Obtener órdenes organizadas por estado para el Kanban.
    Ordenadas de forma descendente, más recientes primero.
    """
    kitchen_states = ["new", "accepted", "preparing", "ready"]

    base_query = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.state),
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.table),
            joinedload(Order.customer),
        )
        .filter(
            Order.id_empresa == current_user.id_empresa,
            Order.status.in_(kitchen_states),
        )
    )

    kanban: dict[str, list[dict[str, Any]]] = {}

    for state in kitchen_states:
        orders = (
            base_query.filter(Order.status == state)
            .order_by(desc(Order.kitchen_received_at))
            .all()
        )

        kanban[state] = [
            {
                "id": order.id,
                "order_number": order.id,
                "table": order.table.number if order.table else "Para Llevar",
                "customer_name": (
                    order.customer.name
                    if order.customer
                    else order.customer_name
                ),
                "status": order.status,
                "arrived_at": order.kitchen_received_at.isoformat()
                if order.kitchen_received_at
                else None,
                "accepted_at": order.kitchen_accepted_at.isoformat()
                if order.kitchen_accepted_at
                else None,
                "started_at": order.kitchen_started_at.isoformat()
                if order.kitchen_started_at
                else None,
                "completed_at": order.kitchen_completed_at.isoformat()
                if order.kitchen_completed_at
                else None,
                "elapsed_minutes": (
                    int(
                        (
                            (
                                min(
                                    datetime.now(timezone.utc),
                                    order.kitchen_completed_at.replace(
                                        tzinfo=timezone.utc
                                    ),
                                )
                                if order.kitchen_completed_at
                                else datetime.now(timezone.utc)
                            )
                            - order.kitchen_accepted_at.replace(tzinfo=timezone.utc)
                        ).total_seconds()
                        // 60
                    )
                    if order.kitchen_accepted_at
                    else 0
                ),
                "items": [
                    {
                        "id": item.id,
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                        "notes": item.notes,
                        "modifiers_snapshot": item.modifiers_snapshot or [],
                        "prep_time_minutes": (
                            item.product.tiempo_preparacion
                            if item.product
                            and item.product.tiempo_preparacion
                            and (
                                not item.prep_time_minutes
                                or item.prep_time_minutes == 10
                            )
                            else (item.prep_time_minutes or 10)
                        ),
                        "state": item.state.state if item.state else "pending",
                        "started_at": item.state.started_at.isoformat()
                        if item.state and item.state.started_at
                        else None,
                        "completed_at": item.state.completed_at.isoformat()
                        if item.state and item.state.completed_at
                        else None,
                        "item_elapsed_minutes": (
                            int(
                                (
                                    (
                                        min(
                                            datetime.now(timezone.utc),
                                            item.state.completed_at.replace(
                                                tzinfo=timezone.utc
                                            ),
                                        )
                                        if item.state.completed_at
                                        else datetime.now(timezone.utc)
                                    )
                                    - item.state.started_at.replace(
                                        tzinfo=timezone.utc
                                    )
                                ).total_seconds()
                                // 60
                            )
                            if item.state and item.state.started_at
                            else 0
                        ),
                    }
                    for item in order.items
                ],
                "progress": calculate_order_progress(order),
                "kitchen_notes": order.kitchen_notes,
            }
            for order in orders
        ]

    return kanban


@router.put("/orders/{order_id}/accept")
async def accept_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aceptar orden en cocina: nuevo a aceptado."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )

    if not order:
        raise HTTPException(404, "Orden no encontrada")

    if order.status != OrderStatus.NEW:
        raise HTTPException(
            400,
            f"Orden debe estar en estado 'new'. Estado actual: {order.status}",
        )

    previous_status = order.status
    order.status = OrderStatus.ACCEPTED
    order.kitchen_accepted_at = func.now()

    for item in order.items:
        if not item.state:
            db.add(OrderItemState(order_item_id=item.id, state="pending"))

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return {"success": True, "message": "Orden aceptada"}


@router.put("/orders/{order_id}/start")
async def start_preparing(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Iniciar preparación: aceptado a preparando."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )

    if not order:
        raise HTTPException(404, "Orden no encontrada")

    if order.status != OrderStatus.ACCEPTED:
        raise HTTPException(400, "Orden debe estar aceptada primero")

    previous_status = order.status
    order.status = OrderStatus.PREPARING
    order.kitchen_started_at = func.now()

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return {"success": True, "message": "Preparacion iniciada"}


@router.put("/orders/{order_id}/complete")
async def complete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Completar orden: preparando a listo."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )

    if not order:
        raise HTTPException(404, "Orden no encontrada")

    if order.status != OrderStatus.PREPARING:
        raise HTTPException(400, "Orden debe estar en preparacion")

    incomplete_items = [
        item for item in order.items if not item.state or item.state.state != "ready"
    ]
    if incomplete_items:
        raise HTTPException(
            400,
            f"{len(incomplete_items)} producto(s) aun no estan listos",
        )

    previous_status = order.status
    order.status = OrderStatus.READY
    order.kitchen_completed_at = func.now()

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return {"success": True, "message": "Orden completada"}


@router.put("/orders/{order_id}/reject")
async def reject_order(
    order_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rechazar orden: nuevo a cancelado."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )

    if not order:
        raise HTTPException(404, "Orden no encontrada")

    if order.status != OrderStatus.NEW:
        raise HTTPException(400, "Solo se pueden rechazar ordenes nuevas")

    previous_status = order.status
    order.status = OrderStatus.CANCELLED
    order.kitchen_notes = f"Rechazada: {reason}"

    if order.table and order.table.status == TableStatus.OCUPADA:
        order.table.status = TableStatus.LIBRE

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return {"success": True, "message": "Orden rechazada"}


@router.put("/orders/{order_id}/revert-to-new")
async def revert_to_new(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revertir orden: aceptado a nuevo."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    if order.status != OrderStatus.ACCEPTED:
        raise HTTPException(400, "Solo se puede revertir desde aceptado")

    previous_status = order.status
    order.status = OrderStatus.NEW
    order.kitchen_accepted_at = None

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )
    return {"success": True}


@router.put("/orders/{order_id}/revert-to-accepted")
async def revert_to_accepted(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revertir preparación: preparando a aceptado."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    if order.status != OrderStatus.PREPARING:
        raise HTTPException(400, "Solo se puede revertir desde preparacion")

    previous_status = order.status
    order.status = OrderStatus.ACCEPTED
    order.kitchen_started_at = None

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )
    return {"success": True}


@router.put("/orders/{order_id}/revert-to-preparing")
async def revert_to_preparing(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revertir completado: listo a preparando."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.id_empresa == current_user.id_empresa)
        .first()
    )
    if not order:
        raise HTTPException(404, "Orden no encontrada")
    if order.status != OrderStatus.READY:
        raise HTTPException(400, "Solo se puede revertir desde listo")

    previous_status = order.status
    order.status = OrderStatus.PREPARING
    order.kitchen_completed_at = None

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )
    return {"success": True}


@router.put("/items/{item_id}/state")
async def update_item_state(
    item_id: int,
    item_update: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualizar estado de un producto individual."""
    new_state = item_update.get("new_state")
    if not new_state:
        raise HTTPException(400, "new_state is required")

    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item no encontrado")

    order = item.order
    if order.id_empresa != current_user.id_empresa:
        raise HTTPException(403, "No tienes acceso a este item")

    if not item.state:
        item.state = OrderItemState(order_item_id=item.id)
        db.add(item.state)

    if new_state == "preparing":
        item.state.state = "preparing"
        item.state.started_at = func.now()
        item.state.chef_id = current_user.id
    elif new_state == "ready":
        item.state.state = "ready"
        item.state.completed_at = func.now()
    elif new_state == "pending":
        item.state.state = "pending"
        item.state.started_at = None
        item.state.completed_at = None
    else:
        raise HTTPException(400, f"Transicion invalida o estado desconocido: {new_state}")

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message(
            "ORDER_UPDATED",
            order,
            changed_item_id=item.id,
            changed_item_state=item.state.state,
        ),
    )

    return {"success": True, "item_state": item.state.state}
