from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import extract, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.credit_note import CreditNote
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.table import Table, TableStatus
from app.modules.payments import schemas

MONEY_PLACES = Decimal("0.01")
ZERO = Decimal("0.00")


def quantize_money(value: Decimal | int | float | None) -> Decimal:
    decimal_value = value if isinstance(value, Decimal) else Decimal(str(value or 0))
    return decimal_value.quantize(MONEY_PLACES, rounding=ROUND_HALF_UP)


def get_locked_order(db: Session, order_id: int, company_id: int) -> Order:
    order = (
        db.query(Order)
        .filter(
            Order.id == order_id,
            Order.id_empresa == company_id,
        )
        .with_for_update()
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order


def build_order_payment_summary(order: Order) -> dict:
    paid_amount = quantize_money(order.paid_amount)
    remaining_balance = quantize_money(order.remaining_balance)
    return {
        "order_id": order.id,
        "order_status": order.status,
        "total_amount": quantize_money(order.total_amount),
        "paid_amount": paid_amount,
        "remaining_balance": remaining_balance,
        "can_close_order": remaining_balance == ZERO,
        "payments": [
            payment
            for payment in order.payments
            if payment.status == PaymentStatus.CONFIRMED
        ],
    }


def build_payment_response(payment: Payment, order: Order) -> schemas.PaymentResponse:
    summary = build_order_payment_summary(order)
    response = schemas.PaymentResponse.model_validate(payment)
    response.paid_amount = summary["paid_amount"]
    response.remaining_balance = summary["remaining_balance"]
    response.order_total_amount = summary["total_amount"]
    response.order_status = summary["order_status"]
    response.can_close_order = summary["can_close_order"]
    if order.table:
        response.table_number = str(order.table.number)
    return response


def _confirmed_component_sum(order: Order, field_name: str) -> Decimal:
    return quantize_money(
        sum(
            (
                getattr(payment, field_name) or ZERO
                for payment in order.payments
                if payment.status == PaymentStatus.CONFIRMED
            ),
            ZERO,
        )
    )


def _allocate_component(
    remaining_component: Decimal,
    amount: Decimal,
    remaining_balance: Decimal,
) -> Decimal:
    if remaining_balance <= ZERO or remaining_component <= ZERO:
        return ZERO
    return quantize_money((remaining_component * amount) / remaining_balance)


def _allocate_payment_breakdown(order: Order, amount: Decimal) -> dict[str, Decimal]:
    remaining_balance = quantize_money(order.remaining_balance)
    remaining_subtotal = quantize_money((order.subtotal or ZERO) - _confirmed_component_sum(order, "subtotal"))
    remaining_tax = quantize_money((order.tax or ZERO) - _confirmed_component_sum(order, "tax"))
    remaining_tip = quantize_money((order.tip or ZERO) - _confirmed_component_sum(order, "tip_amount"))
    remaining_discount = quantize_money((order.discount or ZERO) - _confirmed_component_sum(order, "discount_amount"))

    if amount == remaining_balance:
        return {
            "subtotal": remaining_subtotal,
            "tax": remaining_tax,
            "tip_amount": remaining_tip,
            "discount_amount": remaining_discount,
        }

    subtotal = _allocate_component(remaining_subtotal, amount, remaining_balance)
    tax = _allocate_component(remaining_tax, amount, remaining_balance)
    tip_amount = _allocate_component(remaining_tip, amount, remaining_balance)
    discount_amount = _allocate_component(remaining_discount, amount, remaining_balance)

    allocated_total = quantize_money(subtotal + tax + tip_amount - discount_amount)
    rounding_difference = quantize_money(amount - allocated_total)
    subtotal = quantize_money(subtotal + rounding_difference)

    return {
        "subtotal": subtotal,
        "tax": tax,
        "tip_amount": tip_amount,
        "discount_amount": discount_amount,
    }


def create_order_payment(
    db: Session,
    order: Order,
    payment_data: schemas.OrderPaymentCreate,
    processed_by: int,
    company_id: int,
) -> Payment:
    if payment_data.amount <= ZERO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto del pago debe ser mayor que 0.",
        )

    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden registrar pagos para una orden cancelada.",
        )

    remaining_balance = quantize_money(order.remaining_balance)
    if remaining_balance <= ZERO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden ya no tiene saldo pendiente.",
        )

    amount = quantize_money(payment_data.amount)
    if amount > remaining_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El monto excede el saldo pendiente. Monto maximo permitido: {remaining_balance}",
        )

    amount_received = (
        quantize_money(payment_data.amount_received)
        if payment_data.amount_received is not None
        else None
    )
    if payment_data.payment_method == PaymentMethod.CASH:
        if amount_received is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="amount_received es requerido para pagos en efectivo.",
            )
        if amount_received < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Monto insuficiente. Debe cubrir al menos {amount}.",
            )

    breakdown = _allocate_payment_breakdown(order, amount)
    payment = Payment(
        order_id=order.id,
        amount=amount,
        numero_factura=generar_numero_factura(db, company_id),
        status=PaymentStatus.CONFIRMED,
        subtotal=breakdown["subtotal"],
        tax=breakdown["tax"],
        tip_amount=breakdown["tip_amount"],
        discount_amount=breakdown["discount_amount"],
        total_amount=amount,
        payment_method=payment_data.payment_method,
        amount_received=amount_received,
        change_given=quantize_money(amount_received - amount) if amount_received is not None else None,
        processed_by=processed_by,
        id_empresa=company_id,
    )
    db.add(payment)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc))
        if "ix_payments_order_id" in message or "order_id" in message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La orden no pudo registrar multiples pagos porque la base de datos aun conserva una restriccion antigua sobre order_id.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo registrar el pago por un conflicto de integridad.",
        ) from exc

    if quantize_money(remaining_balance - amount) == ZERO:
        order.status = OrderStatus.PAID
        order.closed_at = datetime.now()
        if order.table and order.table.status == TableStatus.OCUPADA:
            order.table.status = TableStatus.LIBRE

    audit = AuditLog(
        user_id=processed_by,
        action="payment_processed",
        entity_type="payment",
        entity_id=payment.id,
        details={
            "order_id": order.id,
            "amount": str(amount),
            "method": payment_data.payment_method.value,
        },
        id_empresa=company_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(payment)
    db.refresh(order)
    return payment


def close_table_after_payment(db: Session, table_id: int):
    table = db.query(Table).filter(Table.id == table_id).with_for_update().first()
    if not table:
        raise HTTPException(404, "Mesa no encontrada")

    active_non_paid_order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.status != OrderStatus.PAID,
        Order.status != OrderStatus.CANCELLED,
    ).first()

    if active_non_paid_order:
        raise HTTPException(
            status_code=400,
            detail="No se puede cerrar la mesa porque tiene saldo pendiente.",
        )

    table.status = TableStatus.LIBRE

    db_audit = AuditLog(
        action="table_closed",
        entity_type="table",
        entity_id=table_id,
        details={"table_number": table.number},
        id_empresa=table.id_empresa,
    )
    db.add(db_audit)

    db.commit()
    return {"success": True}


def generar_numero_factura(db: Session, id_empresa: int) -> str:
    ano = datetime.utcnow().year
    count = db.execute(
        select(func.count(Payment.id))
        .where(Payment.id_empresa == id_empresa)
        .where(extract("year", Payment.created_at) == ano)
    ).scalar() or 0
    secuencial = str(count + 1).zfill(4)
    return f"FAC-{id_empresa}-{ano}-{secuencial}"


def generar_numero_nota_credito(db: Session, id_empresa: int) -> str:
    ano = datetime.utcnow().year
    count = db.execute(
        select(func.count(CreditNote.id))
        .where(CreditNote.id_empresa == id_empresa)
        .where(extract("year", CreditNote.created_at) == ano)
    ).scalar() or 0
    secuencial = str(count + 1).zfill(4)
    return f"NC-{id_empresa}-{ano}-{secuencial}"
