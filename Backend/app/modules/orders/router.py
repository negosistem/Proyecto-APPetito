from datetime import datetime
from typing import Any, List, Sequence
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderStatus, OrderItemState
from app.models.table import Table, TableStatus
from app.models.product import Product
from app.models.company import Company
from app.models.product_extra import ProductExtra, ProductIngredient
from app.models.user import User
from app.modules.payments import schemas as payment_schemas
from app.modules.payments.service import build_payment_response, create_order_payment, get_locked_order
from app.modules.orders import schemas
from app.core.dependencies import get_current_user
from app.modules.kitchen.socket_events import (
    broadcast_order_update,
    build_order_socket_message,
)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

MONEY_QUANTUM = Decimal("0.01")


def _require_company_id(current_user: User) -> int:
    company_id = getattr(current_user, "id_empresa", None)
    if company_id is None:
        raise HTTPException(
            status_code=400,
            detail="El usuario autenticado no tiene una empresa asociada",
        )
    return company_id


def _to_money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value))


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def _normalize_id_list(raw_ids: Sequence[int] | None, *, field_name: str) -> list[int]:
    if not raw_ids:
        return []

    normalized: list[int] = []
    seen: set[int] = set()
    for raw_id in raw_ids:
        item_id = int(raw_id)
        if item_id <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Todos los IDs de {field_name} deben ser enteros positivos",
            )
        if item_id not in seen:
            seen.add(item_id)
            normalized.append(item_id)
    return normalized


def _get_company_or_raise(db: Session, company_id: int) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


def _get_product_or_raise(db: Session, product_id: int, company_id: int) -> Product:
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.id_empresa == company_id,
            Product.is_active.is_(True),
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Producto con ID {product_id} no encontrado para esta empresa",
        )
    return product


def _resolve_extras(
    db: Session,
    extra_ids: Sequence[int] | None,
    *,
    product: Product,
    company_id: int,
) -> list[ProductExtra]:
    normalized_extra_ids = _normalize_id_list(extra_ids, field_name="extras")
    if not normalized_extra_ids:
        return []

    extras = (
        db.query(ProductExtra)
        .filter(
            ProductExtra.id.in_(normalized_extra_ids),
            ProductExtra.product_id == product.id,
            ProductExtra.id_empresa == company_id,
            ProductExtra.is_active.is_(True),
        )
        .all()
    )
    extras_by_id = {extra.id: extra for extra in extras}
    if len(extras_by_id) != len(normalized_extra_ids):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Uno o más extras no pertenecen al producto {product.name} "
                "o no están disponibles para esta empresa"
            ),
        )
    return [extras_by_id[extra_id] for extra_id in normalized_extra_ids]


def _resolve_removed_ingredients(
    db: Session,
    ingredient_ids: Sequence[int] | None,
    *,
    product: Product,
    company_id: int,
) -> list[ProductIngredient]:
    normalized_ingredient_ids = _normalize_id_list(
        ingredient_ids,
        field_name="ingredientes removidos",
    )
    if not normalized_ingredient_ids:
        return []

    ingredients = (
        db.query(ProductIngredient)
        .filter(
            ProductIngredient.id.in_(normalized_ingredient_ids),
            ProductIngredient.product_id == product.id,
            ProductIngredient.id_empresa == company_id,
            ProductIngredient.is_active.is_(True),
            ProductIngredient.removable.is_(True),
        )
        .all()
    )
    ingredients_by_id = {ingredient.id: ingredient for ingredient in ingredients}
    if len(ingredients_by_id) != len(normalized_ingredient_ids):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Uno o más ingredientes removidos no pertenecen al producto {product.name} "
                "o no están disponibles para esta empresa"
            ),
        )
    return [ingredients_by_id[ingredient_id] for ingredient_id in normalized_ingredient_ids]


def _build_modifier_snapshot(
    *,
    notes: str | None,
    extras: Sequence[ProductExtra],
    removed_ingredients: Sequence[ProductIngredient],
) -> list[dict[str, Any]]:
    snapshot: list[dict[str, Any]] = []

    if notes:
        snapshot.append(
            {
                "source_id": None,
                "source_type": "note",
                "group_key": "notes",
                "group_label": "Notas",
                "choice": "note",
                "name": notes,
                "price": 0.0,
            }
        )

    for extra in extras:
        snapshot.append(
            {
                "source_id": extra.id,
                "source_type": "extra",
                "group_key": "extras",
                "group_label": "Añadir",
                "choice": "add",
                "name": extra.name,
                "price": float(_round_money(_to_money(extra.price))),
            }
        )

    for ingredient in removed_ingredients:
        snapshot.append(
            {
                "source_id": ingredient.id,
                "source_type": "ingredient",
                "group_key": "ingredients",
                "group_label": "Quitar",
                "choice": "remove",
                "name": ingredient.name,
                "price": 0.0,
            }
        )

    return snapshot


def _build_order_item_notes(modifiers_snapshot: Sequence[dict[str, Any]]) -> str | None:
    notes_lines: list[str] = []
    for modifier in modifiers_snapshot:
        choice = modifier.get("choice")
        name = str(modifier.get("name", "")).strip()
        if not name:
            continue

        if choice == "note":
            notes_lines.append(f"Notas: {name}")
        elif choice == "add":
            notes_lines.append(f"+ {name}")
        elif choice == "remove":
            notes_lines.append(f"- Sin {name}")

    return "\n".join(notes_lines) if notes_lines else None


def _create_order_item(
    *,
    order_id: int,
    item_data: schemas.OrderItemCreate,
    product: Product,
    extras: Sequence[ProductExtra],
    removed_ingredients: Sequence[ProductIngredient],
    company_id: int,
) -> OrderItem:
    modifiers_snapshot = _build_modifier_snapshot(
        notes=item_data.notes,
        extras=extras,
        removed_ingredients=removed_ingredients,
    )
    extras_total = sum((_to_money(extra.price) for extra in extras), Decimal("0.00"))
    item_price = _round_money(_to_money(product.price) + extras_total)
    item_subtotal = _round_money(item_price * item_data.quantity)

    return OrderItem(
        order_id=order_id,
        product_id=product.id,
        product_name=product.name,
        quantity=item_data.quantity,
        price=item_price,
        subtotal=item_subtotal,
        notes=_build_order_item_notes(modifiers_snapshot),
        modifiers_snapshot=modifiers_snapshot,
        prep_time_minutes=(
            product.tiempo_preparacion
            if product.tiempo_preparacion
            else product.prep_time_minutes
        ),
        id_empresa=company_id,
    )


def _recalculate_order_financials(
    order: Order,
    *,
    company: Company,
    apply_tip: bool,
) -> None:
    subtotal = _round_money(
        sum((_to_money(item.subtotal) for item in order.items), Decimal("0.00"))
    )
    tax_rate = _to_money(company.tax_rate) / Decimal("100")
    tax = (
        _round_money(subtotal * tax_rate)
        if getattr(order, "aplica_impuesto", True)
        else Decimal("0.00")
    )
    tip = _round_money(subtotal * Decimal("0.10")) if apply_tip else Decimal("0.00")
    discount = _to_money(order.discount)

    order.subtotal = subtotal
    order.tax = tax
    order.tip = tip
    order.total = _round_money(subtotal + tax + tip - discount)

# Helper to check active order within company
def check_existing_active_order(table_id: int, id_empresa: int, db: Session):
    existing = db.query(Order).filter(
        Order.table_id == table_id,
        Order.id_empresa == id_empresa,
        Order.status != OrderStatus.PAID,
        Order.status != OrderStatus.CANCELLED
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"La mesa ya tiene un pedido activo (ID: {existing.id})"
        )

@router.get("/", response_model=schemas.OrderPaginatedResponse)
def get_orders(
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all orders for current user's company (paginated).
    """
    if page < 1:
        page = 1
    if limit < 1:
        limit = 15
        
    skip = (page - 1) * limit
    
    # Base query for the current company
    base_query = db.query(Order).filter(Order.id_empresa == current_user.id_empresa)
    
    # Get total count
    total = base_query.count()
    
    # Get paginated items
    orders = base_query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Calculate total pages
    pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return schemas.OrderPaginatedResponse(
        items=orders,
        total=total,
        page=page,
        pages=pages,
        limit=limit
    )

@router.post("/", response_model=schemas.Order, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: schemas.OrderCreate = Body(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new order with items.
    Calculates subtotal, tax, and total automatically.
    Sets Table status to OCUPADA.
    AUTOMATICALLY SENDS TO KITCHEN.
    """
    company_id = _require_company_id(current_user)

    # 1. Handle table assignment
    actual_table_id = order_data.table_id
    table = None
    
    # If table_id is 0, it means "automatic" - find a free table within company
    if actual_table_id == 0:
        table = db.query(Table).filter(
            Table.status == TableStatus.LIBRE,
            Table.id_empresa == company_id
        ).first()
        if table:
            actual_table_id = table.id
        else:
            # No free tables, make it takeaway
            actual_table_id = None
    elif actual_table_id:
        # Specific table requested - validate it belongs to company
        table = db.query(Table).filter(
            Table.id == actual_table_id,
            Table.id_empresa == company_id
        ).first()
        if not table:
            raise HTTPException(status_code=404, detail="Mesa no encontrada")
        
        # Check for active order
        check_existing_active_order(actual_table_id, company_id, db)
    
    # 3. Validate that order has items
    # ALLOW EMPTY ORDER (To just open table)
    # if not order_data.items or len(order_data.items) == 0:
    #     raise HTTPException(status_code=400, detail="La orden debe tener al menos un producto")

    # Determine initial status
    # If items exist -> NEW (Send to kitchen)
    # If no items -> PENDING (Just open table, don't bother kitchen)
    initial_status = OrderStatus.NEW if order_data.items and len(order_data.items) > 0 else OrderStatus.PENDING
    
    # 4. Create Order (without totals yet) - assign company
    # 🆕 KITCHEN UPDATE: Set status to NEW and kitchen_received_at only if items exist
    new_order = Order(
        table_id=actual_table_id,
        customer_id=order_data.customer_id,
        user_id=current_user.id,
        customer_name=order_data.customer_name,
        status=initial_status, 
        kitchen_received_at=func.now() if initial_status == OrderStatus.NEW else None, # ← TIMESTAMP only if going to kitchen
        subtotal=Decimal("0"),
        tax=Decimal("0"),
        tip=Decimal("0"),
        discount=Decimal("0"),
        total=Decimal("0"),
        id_empresa=company_id,
        aplica_impuesto=getattr(order_data, 'aplica_impuesto', True)
    )
    db.add(new_order)
    db.flush()  # Get the order ID
    
    # 5. Create order items using validated snapshots
    
    for item_data in order_data.items:
        product = _get_product_or_raise(db, item_data.product_id, company_id)
        
        extras = _resolve_extras(
            db,
            item_data.extras_ids,
            product=product,
            company_id=company_id,
        )

        removed_ingredients = _resolve_removed_ingredients(
            db,
            item_data.removed_ingredient_ids,
            product=product,
            company_id=company_id,
        )

        
        order_item = _create_order_item(
            order_id=new_order.id,
            item_data=item_data,
            product=product,
            extras=extras,
            removed_ingredients=removed_ingredients,
            company_id=company_id,
        )
        db.add(order_item)
        db.flush()
        db.add(OrderItemState(order_item_id=order_item.id, state="pending"))
    
    # 6. Recalculate totals from persisted order items
    company = _get_company_or_raise(db, company_id)
    _recalculate_order_financials(
        new_order,
        company=company,
        apply_tip=bool(order_data.apply_tip),
    )
    
    # 8. Update Table Status
    if actual_table_id and table:
        table.status = TableStatus.OCUPADA
        db.add(table)

    db.commit()
    db.refresh(new_order)

    if initial_status == OrderStatus.NEW:
        await broadcast_order_update(
            company_id,
            build_order_socket_message("NEW_ORDER", new_order),
        )
        
    return new_order

@router.get("/table/{table_id}/active", response_model=schemas.Order)
def get_table_active_order(
    table_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current active order for a table within company.
    """
    order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.id_empresa == current_user.id_empresa,
        Order.status != OrderStatus.PAID,
        Order.status != OrderStatus.CANCELLED
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="No hay pedido activo en esta mesa")
    
    return order

@router.get("/{order_id}", response_model=schemas.Order)
def get_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order

@router.get("/{order_id}/details", response_model=schemas.OrderDetailResponse)
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed order information for payment modal.
    Includes items, table info, and financial breakdown.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Build response with table number
    table_number = None
    if order.table:
        table_number = f"Mesa {order.table.number}"
    
    return schemas.OrderDetailResponse(
        id=order.id,
        table_id=order.table_id,
        table_number=table_number,
        customer_name=order.customer_name,
        subtotal=order.subtotal,
        tax=order.tax,
        tip=order.tip,
        discount=order.discount,
        total=order.total,
        total_amount=order.total_amount,
        paid_amount=order.paid_amount,
        remaining_balance=order.remaining_balance,
        items=order.items,
        payments=order.payments,
        status=order.status,
        created_at=order.created_at
    )


@router.post("/{order_id}/payments", response_model=payment_schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_partial_payment(
    order_id: int,
    payment_data: payment_schemas.OrderPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = get_locked_order(db, order_id, current_user.id_empresa)
    previous_status = order.status

    payment = create_order_payment(
        db=db,
        order=order,
        payment_data=payment_data,
        processed_by=current_user.id,
        company_id=current_user.id_empresa,
    )

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return build_payment_response(payment, order)

@router.post("/{order_id}/items", response_model=schemas.Order)
async def add_order_items(
    order_id: int,
    items: List[schemas.OrderItemCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add items to an order.
    Updates the total amount automatically.
    """
    company_id = _require_company_id(current_user)
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == company_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if order.status in [OrderStatus.PAID, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="No se pueden agregar items a un pedido cerrado o cancelado")

    items_to_add: list[OrderItem] = []
    previous_status = order.status

    for item_data in items:
        product = _get_product_or_raise(db, item_data.product_id, company_id)
        extras = _resolve_extras(
            db,
            item_data.extras_ids,
            product=product,
            company_id=company_id,
        )

        removed_ingredients = _resolve_removed_ingredients(
            db,
            item_data.removed_ingredient_ids,
            product=product,
            company_id=company_id,
        )

        
        new_item = _create_order_item(
            order_id=order.id,
            item_data=item_data,
            product=product,
            extras=extras,
            removed_ingredients=removed_ingredients,
            company_id=company_id,
        )
        items_to_add.append(new_item)

    if items_to_add:
        db.add_all(items_to_add)
        db.flush()

        for item in items_to_add:
            db.add(OrderItemState(order_item_id=item.id, state='pending'))

        company = _get_company_or_raise(db, company_id)

        if order.status == OrderStatus.PENDING:
            order.status = OrderStatus.NEW
            order.kitchen_received_at = func.now()

        _recalculate_order_financials(
            order,
            company=company,
            apply_tip=_to_money(order.tip) > Decimal("0.00"),
        )
        db.commit()
        db.refresh(order)

        event_type = "NEW_ORDER" if previous_status == OrderStatus.PENDING and order.status == OrderStatus.NEW else "ORDER_UPDATED"
        await broadcast_order_update(
            company_id,
            build_order_socket_message(event_type, order, previous_status),
        )
    
    return order

@router.patch("/{order_id}/status", response_model=schemas.Order)
async def update_order_status(
    order_id: int,
    status_update: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Block any modification to already paid orders
    if order.status == OrderStatus.PAID:
        raise HTTPException(
            status_code=400,
            detail="Este pedido ya ha sido pagado y no puede modificarse"
        )

    previous_status = order.status
    status_changed = False

    if status_update.status:
        if status_update.status in [OrderStatus.PAID, OrderStatus.CANCELLED]:
            order.closed_at = datetime.now()
            # Liberar la mesa cuando el pedido se paga o cancela
            if order.table and order.table.status == TableStatus.OCUPADA:
                order.table.status = TableStatus.LIBRE

        if order.status != status_update.status:
            order.status = status_update.status
            status_changed = True

    db.commit()
    db.refresh(order)

    if status_changed:
        await broadcast_order_update(
            current_user.id_empresa,
            build_order_socket_message("ORDER_UPDATED", order, previous_status),
        )

    return order

@router.post("/{order_id}/reopen", response_model=schemas.Order)
async def reopen_order(
    order_id: int,
    motivo: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reopen a paid order. Only accessible by admins.
    Records an AuditLog entry with the reason.
    """
    from app.core.dependencies import require_admin
    from app.models.audit_log import AuditLog

    # Admin-only check via role name
    if not current_user.role or current_user.role.name.lower() not in ("admin", "super_admin", "administrador"):
        raise HTTPException(status_code=403, detail="Solo los administradores pueden reabrir pedidos")

    if not motivo or len(motivo.strip()) < 5:
        raise HTTPException(status_code=422, detail="El motivo debe tener al menos 5 caracteres")

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if order.status != OrderStatus.PAID:
        raise HTTPException(status_code=400, detail="Solo se pueden reabrir pedidos en estado 'pagado'")

    previous_status = order.status
    order.status = OrderStatus.PENDING
    order.closed_at = None
    if order.table and order.table.status == TableStatus.LIBRE:
        order.table.status = TableStatus.OCUPADA

    # Register audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="order_reopened",
        entity_type="order",
        entity_id=order.id,
        details={"motivo": motivo, "reopened_by": current_user.nombre},
        id_empresa=current_user.id_empresa
    )
    db.add(audit)
    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return order

@router.post("/{order_id}/close", response_model=schemas.Order)
async def close_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Close the order only when there is no pending balance.
    This is used for tables opened without items or already fully settled orders.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="No se puede cerrar un pedido cancelado")

    if order.status == OrderStatus.PAID:
        return order

    if order.remaining_balance > Decimal("0"):
        raise HTTPException(
            status_code=400,
            detail=f"El pedido aun tiene saldo pendiente. Monto maximo pendiente: {order.remaining_balance}",
        )

    previous_status = order.status
    order.status = OrderStatus.PAID
    order.closed_at = datetime.now()

    # Auto-free table if it was occupied
    if order.table and order.table.status == TableStatus.OCUPADA:
        order.table.status = TableStatus.LIBRE

    db.commit()
    db.refresh(order)

    await broadcast_order_update(
        current_user.id_empresa,
        build_order_socket_message("ORDER_UPDATED", order, previous_status),
    )

    return order
