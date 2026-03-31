import io
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.credit_note import CreditNote
from app.models.order import OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.table import TableStatus
from app.models.user import User
from app.modules.kitchen.socket_events import (
    broadcast_order_update,
    build_order_socket_message,
)
from . import schemas
from .receipt_builder import (
    generate_html_receipt as build_html_receipt,
    generate_pdf_receipt as build_pdf_receipt,
    generate_thermal_receipt as build_thermal_receipt,
)
from .service import (
    build_order_payment_summary,
    build_payment_response,
    create_order_payment,
    generar_numero_nota_credito,
    get_locked_order,
)

router = APIRouter(prefix="/payments", tags=["payments"])


def _build_receipt_data(payment: Payment) -> dict:
    order = payment.order
    confirmed_payments = [
        current_payment
        for current_payment in order.payments
        if current_payment.status == PaymentStatus.CONFIRMED
    ]

    summary = build_order_payment_summary(order)
    return {
        "numero_factura": payment.numero_factura,
        "date": payment.created_at.strftime("%d/%m/%Y %H:%M:%S"),
        "table": f"Mesa {order.table.number}" if order.table else "Para llevar",
        "waiter": order.user.nombre if order.user else "N/A",
        "cashier": payment.processed_by_user.nombre if payment.processed_by_user else "N/A",
        "customer_name": order.customer_name,
        "items": [
            {
                "quantity": item.quantity,
                "name": item.product_name,
                "price": float(item.price),
                "subtotal": float(item.subtotal),
                "notes": item.notes,
            }
            for item in order.items
        ],
        "payments": [
            {
                "numero_factura": current_payment.numero_factura,
                "payment_method": current_payment.payment_method.value.lower(),
                "amount": float(current_payment.amount),
                "amount_received": float(current_payment.amount_received)
                if current_payment.amount_received is not None
                else None,
                "change_given": float(current_payment.change_given)
                if current_payment.change_given is not None
                else None,
                "created_at": current_payment.created_at.strftime("%d/%m/%Y %H:%M:%S"),
            }
            for current_payment in confirmed_payments
        ],
        "subtotal": float(order.subtotal or Decimal("0")),
        "tax": float(order.tax or Decimal("0")),
        "discount": float(order.discount or Decimal("0")),
        "tip": float(order.tip or Decimal("0")),
        "total": float(order.total_amount or Decimal("0")),
        "paid_amount": float(summary["paid_amount"]),
        "remaining_balance": float(summary["remaining_balance"]),
        "payment_method": payment.payment_method.value.lower(),
        "amount_received": float(payment.amount_received) if payment.amount_received is not None else None,
        "change": float(payment.change_given) if payment.change_given is not None else None,
    }


@router.post("/process", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
async def process_payment(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Endpoint legacy compatible para registrar pagos."""
    try:
        order = get_locked_order(db, payment_data.order_id, current_user.id_empresa)
        previous_status = order.status

        created_payment = create_order_payment(
            db=db,
            order=order,
            payment_data=schemas.OrderPaymentCreate(
                amount=payment_data.amount,
                payment_method=payment_data.payment_method,
                amount_received=payment_data.amount_received,
            ),
            processed_by=current_user.id,
            company_id=current_user.id_empresa,
        )

        await broadcast_order_update(
            current_user.id_empresa,
            build_order_socket_message("ORDER_UPDATED", order, previous_status),
        )

        return build_payment_response(created_payment, order)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Error procesando pago: {exc}")


@router.get("/{payment_id}", response_model=schemas.PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(
            Payment.id == payment_id,
            Payment.id_empresa == current_user.id_empresa,
        )
        .first()
    )
    if not payment:
        raise HTTPException(404, "Pago no encontrado")
    return build_payment_response(payment, payment.order)


@router.get("/order/{order_id}", response_model=schemas.PaymentResponse)
def get_payment_by_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(
            Payment.order_id == order_id,
            Payment.id_empresa == current_user.id_empresa,
            Payment.status == PaymentStatus.CONFIRMED,
        )
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        raise HTTPException(404, "No se encontro pago para esta orden")
    return build_payment_response(payment, payment.order)


@router.get("/{payment_id}/receipt")
def get_receipt(
    payment_id: int,
    format: str = "pdf",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = (
        db.query(Payment)
        .filter(
            Payment.id == payment_id,
            Payment.id_empresa == current_user.id_empresa,
        )
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    receipt_data = _build_receipt_data(payment)

    if format == "html":
        return HTMLResponse(content=build_html_receipt(receipt_data))

    if format == "thermal":
        pdf_buffer = build_thermal_receipt(receipt_data)
        filename = f"ticket-{payment.numero_factura}.pdf"
    else:
        pdf_buffer = build_pdf_receipt(receipt_data)
        filename = f"recibo-{payment.numero_factura}.pdf"

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: int,
    body: schemas.CancelPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    payment = (
        db.scalars(
            select(Payment)
            .where(Payment.id == payment_id)
            .where(Payment.id_empresa == current_user.id_empresa)
        )
        .first()
    )
    if not payment:
        raise HTTPException(404, "Pago no encontrado")

    if payment.status == PaymentStatus.CANCELLED:
        raise HTTPException(409, "Este pago ya fue cancelado anteriormente")

    existing_credit_note = db.scalars(
        select(CreditNote).where(CreditNote.payment_id == payment_id)
    ).first()
    if existing_credit_note:
        raise HTTPException(409, f"Ya existe la nota de credito {existing_credit_note.numero_nc}")

    try:
        credit_note_number = generar_numero_nota_credito(db, current_user.id_empresa)
        order = get_locked_order(db, payment.order_id, current_user.id_empresa)
        previous_status = order.status

        credit_note = CreditNote(
            payment_id=payment_id,
            id_empresa=current_user.id_empresa,
            numero_nc=credit_note_number,
            motivo=body.motivo,
            monto=float(payment.amount),
            cancelado_por=current_user.id,
        )
        db.add(credit_note)

        payment.status = PaymentStatus.CANCELLED

        if order.remaining_balance > Decimal("0"):
            order.status = OrderStatus.PENDING
            order.closed_at = None
            if order.table and order.table.status == TableStatus.LIBRE:
                order.table.status = TableStatus.OCUPADA

        db.commit()
        db.refresh(order)

        await broadcast_order_update(
            current_user.id_empresa,
            build_order_socket_message("ORDER_UPDATED", order, previous_status),
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Error al procesar la cancelacion: {exc}")

    return {
        "mensaje": "Pago cancelado exitosamente",
        "numero_factura_original": payment.numero_factura,
        "nota_credito": credit_note_number,
    }


@router.put("/{payment_id}")
async def update_payment(payment_id: int):
    raise HTTPException(
        403,
        "Los pagos confirmados son documentos inmutables. Para anular, use el endpoint de cancelacion.",
    )


@router.delete("/{payment_id}")
async def delete_payment(payment_id: int):
    raise HTTPException(
        403,
        "Los pagos no pueden eliminarse. Para anular, emita una nota de credito.",
    )
