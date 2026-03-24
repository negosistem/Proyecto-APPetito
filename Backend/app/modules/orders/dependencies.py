from fastapi import Path, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.order import Order, OrderStatus

# NUEVO: Dependencia para bloquear modificación de pedidos pagados o cancelados
def get_editable_order(
    order_id: int = Path(..., title="The ID of the order to get"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Order:
    order = db.query(Order).filter(
        Order.id == order_id, 
        Order.id_empresa == current_user.id_empresa
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Orden no encontrada"
        )
        
    if order.status == OrderStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Este pedido ya fue pagado y no puede modificarse."
        )
        
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Este pedido fue cancelado y no puede modificarse."
        )
        
    return order
