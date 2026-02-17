from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from decimal import Decimal
from typing import Optional

from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod
from app.models.audit_log import AuditLog
from app.models.table import Table, TableStatus
from app.modules.payments import schemas

def process_order_payment(db: Session, payment_data: schemas.PaymentCreate, user_id: int) -> Payment:
    # 1. Start transaction context (FastAPI session handles this, but we use .with_for_update for safety)
    order = db.query(Order).filter(Order.id == payment_data.order_id).with_for_update().first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada")
    
    # Validation: Only served orders can be paid
    if order.status != OrderStatus.SERVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Solo se pueden cobrar órdenes en estado 'served'. Estado actual: {order.status}"
        )
    
    # Check if already paid
    existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if existing_payment:
        raise HTTPException(status_code=400, detail="Esta orden ya ha sido pagada")

    # Validation for cash payments
    if payment_data.payment_method == PaymentMethod.CASH:
        if not payment_data.amount_received or payment_data.amount_received < payment_data.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El monto recibido debe ser igual o mayor al total para pagos en efectivo"
            )
        # Change calculation is handled by the caller or we can double check here
        change = payment_data.amount_received - payment_data.total_amount
    else:
        change = Decimal("0.00")

    # 2. Create Payment record
    db_payment = Payment(
        order_id=order.id,
        total_amount=payment_data.total_amount,
        tip_amount=payment_data.tip_amount,
        payment_method=payment_data.payment_method,
        amount_received=payment_data.amount_received,
        change_given=change,
        processed_by=user_id
    )
    db.add(db_payment)
    
    # 3. Update Order status
    order.status = OrderStatus.PAID
    
    # 4. Audit Log
    db_audit = AuditLog(
        user_id=user_id,
        action="payment_processed",
        entity_type="payment",
        entity_id=None, # Will be set after flush or manual id fetch if needed
        details={
            "order_id": order.id,
            "total": str(payment_data.total_amount),
            "method": payment_data.payment_method
        }
    )
    db.add(db_audit)
    
    try:
        db.commit()
        db.refresh(db_payment)
        # Update audit log with the payment id
        db_audit.entity_id = db_payment.id
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando el pago: {str(e)}")
        
    return db_payment

def close_table_after_payment(db: Session, table_id: int):
    table = db.query(Table).filter(Table.id == table_id).with_for_update().first()
    if not table:
        raise HTTPException(404, "Mesa no encontrada")
        
    # Check if there are any active orders that are NOT paid
    active_non_paid_order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.status != OrderStatus.PAID,
        Order.status != OrderStatus.CANCELLED
    ).first()
    
    if active_non_paid_order:
        raise HTTPException(
            status_code=400, 
            detail="No se puede cerrar la mesa porque tiene órdenes pendientes de pago"
        )
        
    # Mark table as available
    table.status = TableStatus.LIBRE
    
    # Record in audit log
    db_audit = AuditLog(
        action="table_closed",
        entity_type="table",
        entity_id=table_id,
        details={"table_number": table.number}
    )
    db.add(db_audit)
    
    db.commit()
    return {"success": True}
