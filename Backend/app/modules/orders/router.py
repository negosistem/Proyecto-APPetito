from datetime import datetime
from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderStatus, OrderItemState
from app.models.table import Table, TableStatus
from app.models.product import Product
from app.models.product_extra import ProductExtra, ProductIngredient
from app.models.user import User
from app.modules.orders import schemas
from app.core.dependencies import get_current_user
from app.modules.kitchen.ws_manager import manager as ws_manager  # pyre-ignore[21]

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

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
    from decimal import Decimal
    from app.core.config import get_settings
    
    settings = get_settings()
    
    # 1. Handle table assignment
    actual_table_id = order_data.table_id
    table = None
    
    # If table_id is 0, it means "automatic" - find a free table within company
    if actual_table_id == 0:
        table = db.query(Table).filter(
            Table.status == TableStatus.LIBRE,
            Table.id_empresa == current_user.id_empresa
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
            Table.id_empresa == current_user.id_empresa
        ).first()
        if not table:
            raise HTTPException(status_code=404, detail="Mesa no encontrada")
        
        # Check for active order
        check_existing_active_order(actual_table_id, current_user.id_empresa, db)
    
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
        id_empresa=current_user.id_empresa,
        aplica_impuesto=getattr(order_data, 'aplica_impuesto', True)
    )
    db.add(new_order)
    db.flush()  # Get the order ID
    
    # 5. Create order items and calculate subtotal
    subtotal = Decimal("0")
    
    for item_data in order_data.items:
        # Get product
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404, 
                detail=f"Producto con ID {item_data.product_id} no encontrado"
            )
        
        # Handle extras and ingredients
        extras = []
        extras_total = Decimal("0")
        if getattr(item_data, 'extras_ids', None):
            extras = db.query(ProductExtra).filter(ProductExtra.id.in_(item_data.extras_ids)).all()
            for extra in extras:
                extras_total += Decimal(str(extra.price))
        
        removed_ingredients = []
        if getattr(item_data, 'removed_ingredient_ids', None):
            removed_ingredients = db.query(ProductIngredient).filter(ProductIngredient.id.in_(item_data.removed_ingredient_ids)).all()

        # Build combined notes
        notes_parts = []
        if getattr(item_data, 'notes', None) and item_data.notes.strip():
            notes_parts.append(f"Notas: {item_data.notes}")
        for extra in extras:
            notes_parts.append(f"+ {extra.name}")
        for ingredient in removed_ingredients:
            notes_parts.append(f"- Sin {ingredient.name}")
        
        final_notes = "\n".join(notes_parts) if notes_parts else None
        
        # Calculate item subtotal
        item_price = Decimal(str(product.price)) + extras_total
        item_subtotal = item_price * item_data.quantity
        
        # Create order item with snapshot and company
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=product.id,
            product_name=product.name,  # Snapshot
            quantity=item_data.quantity,
            price=item_price,  # Snapshot
            subtotal=item_subtotal,
            notes=final_notes,
            # 🆕 Transfer prep_time
            prep_time_minutes=product.tiempo_preparacion if product.tiempo_preparacion else product.prep_time_minutes, 
            id_empresa=current_user.id_empresa
        )
        db.add(order_item)
        db.flush() # Need ID for state
        
        # 🆕 Create OrderItemState
        item_state = OrderItemState(
            order_item_id=order_item.id,
            state='pending'
        )
        db.add(item_state)
        
        subtotal += item_subtotal
    
    # 6. Get company tax rate and calculate tax, tip, and total
    from app.models.company import Company
    company = db.query(Company).filter(Company.id == current_user.id_empresa).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Calculate tax using company's tax rate
    tax = Decimal("0")
    if getattr(order_data, 'aplica_impuesto', True):
        tax_rate = Decimal(str(company.tax_rate)) / Decimal("100")  # Convert percentage to decimal
        tax = subtotal * tax_rate
    
    # Calculate tip if requested (default 10%)
    tip = Decimal("0")
    if order_data.apply_tip:
        tip = subtotal * Decimal("0.10")  # 10% tip
    
    # Calculate total: subtotal + tax + tip - discount
    total = subtotal + tax + tip - new_order.discount
    
    # 7. Update order totals
    new_order.subtotal = subtotal
    new_order.tax = tax
    new_order.tip = tip
    new_order.total = total
    
    # 8. Update Table Status
    if actual_table_id and table:
        table.status = TableStatus.OCUPADA
        db.add(table)

    db.commit()
    db.refresh(new_order)
    
    # Notificar a cocina si hay items
    if initial_status == OrderStatus.NEW:
        await ws_manager.broadcast_to_empresa(current_user.id_empresa, {"type": "kanban_update"})
        
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
        items=order.items,
        status=order.status,
        created_at=order.created_at
    )

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
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if order.status in [OrderStatus.PAID, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="No se pueden agregar items a un pedido cerrado o cancelado")

    items_to_add = []
    total_added = 0.0

    for item_data in items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            continue # Or raise error
        
        # Handle extras and ingredients
        extras = []
        extras_total = Decimal("0")
        if getattr(item_data, 'extras_ids', None):
            extras = db.query(ProductExtra).filter(ProductExtra.id.in_(item_data.extras_ids)).all()
            for extra in extras:
                extras_total += Decimal(str(extra.price))
        
        removed_ingredients = []
        if getattr(item_data, 'removed_ingredient_ids', None):
            removed_ingredients = db.query(ProductIngredient).filter(ProductIngredient.id.in_(item_data.removed_ingredient_ids)).all()

        # Build combined notes
        notes_parts = []
        if getattr(item_data, 'notes', None) and item_data.notes.strip():
            notes_parts.append(f"Notas: {item_data.notes}")
        for extra in extras:
            notes_parts.append(f"+ {extra.name}")
        for ingredient in removed_ingredients:
            notes_parts.append(f"- Sin {ingredient.name}")
        
        final_notes = "\n".join(notes_parts) if notes_parts else None
        
        # Create OrderItem with company
        item_price = Decimal(str(product.price)) + extras_total
        item_subtotal = item_price * item_data.quantity
        
        new_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item_data.quantity,
            price=item_price, # Snapshot price
            subtotal=item_subtotal,
            notes=final_notes,
            # Snapshot prep time from product
            prep_time_minutes=product.tiempo_preparacion if product.tiempo_preparacion else product.prep_time_minutes,
            id_empresa=current_user.id_empresa
        )
        items_to_add.append(new_item)
        total_added += float(item_subtotal)

    if items_to_add:
        db.add_all(items_to_add)
        order.total += total_added
        db.commit()
        db.refresh(order)
        # Notificar a cocina
        await ws_manager.broadcast_to_empresa(current_user.id_empresa, {"type": "kanban_update"})
    
    return order

@router.patch("/{order_id}/status", response_model=schemas.Order)
def update_order_status(
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

    if status_update.status:
        if status_update.status in [OrderStatus.PAID, OrderStatus.CANCELLED]:
            order.closed_at = datetime.now()
            # Liberar la mesa cuando el pedido se paga o cancela
            if order.table and order.table.status == TableStatus.OCUPADA:
                order.table.status = TableStatus.LIBRE

        order.status = status_update.status

    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/reopen", response_model=schemas.Order)
def reopen_order(
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

    # Change order status back to pending
    order.status = OrderStatus.PENDING
    order.closed_at = None

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
    return order


def close_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Close the order and optionally free the table.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.id_empresa == current_user.id_empresa
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if order.status == OrderStatus.PAID:
        return order

    order.status = OrderStatus.PAID
    order.closed_at = datetime.now()
    
    # Create Payment record if it doesn't exist
    from app.models.payment import Payment, PaymentMethod
    from decimal import Decimal
    
    existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not existing_payment:
        # Generate a unique invoice number: INV-{order_id}-{yyyymmddHHMMSS}
        invoice_number = f"INV-{order.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        new_payment = Payment(
            order_id=order.id,
            invoice_number=invoice_number,
            subtotal=Decimal(str(order.total)),
            tip_amount=Decimal("0.00"),
            total_amount=Decimal(str(order.total)),
            payment_method=PaymentMethod.CASH,  # Default
            processed_by=current_user.id,
            id_empresa=current_user.id_empresa
        )
        db.add(new_payment)
    
    # Auto-free table if it was occupied
    if order.table and order.table.status == TableStatus.OCUPADA:
        order.table.status = TableStatus.LIBRE

    db.commit()
    db.refresh(order)
    return order
